import {
  ALL_CELLS,
  indexToAlgebraic,
  WINNING_LINES,
} from './constants';
import {
  detectThreats,
  DRAW_SCORE,
  evaluatePosition,
  LOSS_SCORE,
  WIN_SCORE,
} from './evaluation';
import {
  applyMove,
  getExpiringMark,
  getLegalMoves,
  getStateHashFromState,
} from './state';
import {
  AlgebraicCell,
  AnalysisResult,
  CandidateAnalysis,
  CellIndex,
  EngineStatus,
  GameState,
  OutcomeClassification,
  Player,
  PositionEvaluation,
  SearchOptions,
} from './types';
import { solvePositionExact } from './exactSolver';

interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lowerbound' | 'upperbound';
  bestMove: CellIndex | null;
  outcome: OutcomeClassification;
}

export class SearchEngine {
  private transpositionTable = new Map<string, TTEntry>();
  private nodesSearched = 0;
  private transpositionHits = 0;
  private startTime = 0;
  private timeBudgetMs = 1500;
  private abortSearch = false;

  constructor() {}

  public clearTranspositionTable(): void {
    this.transpositionTable.clear();
  }

  /**
   * Sorts moves to maximize alpha-beta cutoffs:
   * 1. TT best move (if any)
   * 2. Immediate winning move
   * 3. Immediate block of opponent threat
   * 4. Center cell (4)
   * 5. Corners (0, 2, 6, 8)
   * 6. Edges (1, 3, 5, 7)
   */
  private orderMoves(
    state: GameState,
    legalMoves: CellIndex[],
    ttBestMove: CellIndex | null
  ): CellIndex[] {
    const player = state.turn;
    const opp: Player = player === 'X' ? 'O' : 'X';

    const pMarks = player === 'X' ? state.xMarks : state.oMarks;
    const oppMarks = opp === 'X' ? state.xMarks : state.oMarks;

    const pExpiring = pMarks.length >= 3 ? pMarks[0] : null;
    const oppExpiring = oppMarks.length >= 3 ? oppMarks[0] : null;

    const pThreats = detectThreats(pMarks, state.board, pExpiring).filter((t) => !t.isPhantom);
    const oppThreats = detectThreats(oppMarks, state.board, oppExpiring).filter((t) => !t.isPhantom);

    const winningCells = new Set(pThreats.map((t) => t.targetCell));
    const blockingCells = new Set(oppThreats.map((t) => t.targetCell));

    return [...legalMoves].sort((a, b) => {
      // TT best move first
      if (ttBestMove !== null) {
        if (a === ttBestMove) return -1;
        if (b === ttBestMove) return 1;
      }

      // Immediate win first
      const aWin = winningCells.has(a);
      const bWin = winningCells.has(b);
      if (aWin && !bWin) return -1;
      if (!aWin && bWin) return 1;

      // Immediate block second
      const aBlock = blockingCells.has(a);
      const bBlock = blockingCells.has(b);
      if (aBlock && !bBlock) return -1;
      if (!aBlock && bBlock) return 1;

      // Center priority (cell 4 / B2)
      if (a === 4 && b !== 4) return -1;
      if (b === 4 && a !== 4) return 1;

      // Corner priority (0, 2, 6, 8)
      const aCorner = [0, 2, 6, 8].includes(a);
      const bCorner = [0, 2, 6, 8].includes(b);
      if (aCorner && !bCorner) return -1;
      if (!aCorner && bCorner) return 1;

      // Deterministic tie-breaker
      return a - b;
    });
  }

  /**
   * Deterministic tie-breaker between two equally scored candidate moves.
   */
  private breakTie(a: CellIndex, b: CellIndex): number {
    if (a === 4) return -1;
    if (b === 4) return 1;
    const aCorner = [0, 2, 6, 8].includes(a);
    const bCorner = [0, 2, 6, 8].includes(b);
    if (aCorner && !bCorner) return -1;
    if (!aCorner && bCorner) return 1;
    return a - b;
  }

  /**
   * Alpha-beta minimax search with transposition table and cycle detection.
   */
  private alphaBeta(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: Player,
    ply: number,
    pathSet: Set<string>
  ): { score: number; bestMove: CellIndex | null; outcome: OutcomeClassification; pv: CellIndex[] } {
    this.nodesSearched++;

    // Check timeout
    if (this.nodesSearched % 256 === 0) {
      if (Date.now() - this.startTime > this.timeBudgetMs) {
        this.abortSearch = true;
      }
    }
    if (this.abortSearch) {
      return {
        score: evaluatePosition(state, maximizingPlayer),
        bestMove: null,
        outcome: 'unresolved',
        pv: [],
      };
    }

    // Terminal state checks
    if (state.status === 'x_won') {
      const isWin = maximizingPlayer === 'X';
      const score = isWin ? WIN_SCORE - ply : LOSS_SCORE + ply;
      return {
        score,
        bestMove: null,
        outcome: isWin ? 'proven_win' : 'proven_loss',
        pv: [],
      };
    }
    if (state.status === 'o_won') {
      const isWin = maximizingPlayer === 'O';
      const score = isWin ? WIN_SCORE - ply : LOSS_SCORE + ply;
      return {
        score,
        bestMove: null,
        outcome: isWin ? 'proven_win' : 'proven_loss',
        pv: [],
      };
    }
    if (state.status === 'draw') {
      return {
        score: DRAW_SCORE,
        bestMove: null,
        outcome: 'proven_draw',
        pv: [],
      };
    }

    const stateHash = getStateHashFromState(state);

    // Cycle detection along current branch
    if (pathSet.has(stateHash)) {
      // Repetition detected in this search path
      return {
        score: DRAW_SCORE,
        bestMove: null,
        outcome: 'proven_draw',
        pv: [],
      };
    }

    // Transposition table probe
    const ttEntry = this.transpositionTable.get(stateHash);
    let ttBestMove: CellIndex | null = null;
    if (ttEntry) {
      ttBestMove = ttEntry.bestMove;
      if (ttEntry.depth >= depth) {
        this.transpositionHits++;
        let ttScore = ttEntry.score;
        // Un-normalize mate scores relative to current ply
        if (ttScore > 90000) ttScore -= ply;
        else if (ttScore < -90000) ttScore += ply;

        if (ttEntry.flag === 'exact') {
          return {
            score: ttScore,
            bestMove: ttEntry.bestMove,
            outcome: ttEntry.outcome,
            pv: ttEntry.bestMove !== null ? [ttEntry.bestMove] : [],
          };
        }
        if (ttEntry.flag === 'lowerbound' && ttScore >= beta) {
          return {
            score: ttScore,
            bestMove: ttEntry.bestMove,
            outcome: ttEntry.outcome,
            pv: ttEntry.bestMove !== null ? [ttEntry.bestMove] : [],
          };
        }
        if (ttEntry.flag === 'upperbound' && ttScore <= alpha) {
          return {
            score: ttScore,
            bestMove: ttEntry.bestMove,
            outcome: ttEntry.outcome,
            pv: ttEntry.bestMove !== null ? [ttEntry.bestMove] : [],
          };
        }
      }
    }

    // Depth limit reached (leaf node)
    if (depth <= 0) {
      const evalScore = evaluatePosition(state, maximizingPlayer);
      return {
        score: evalScore,
        bestMove: null,
        outcome: 'unresolved',
        pv: [],
      };
    }

    const legalMoves = getLegalMoves(state);
    if (legalMoves.length === 0) {
      return {
        score: DRAW_SCORE,
        bestMove: null,
        outcome: 'proven_draw',
        pv: [],
      };
    }

    const orderedMoves = this.orderMoves(state, legalMoves, ttBestMove);
    const isMaximizing = state.turn === maximizingPlayer;

    let bestMove: CellIndex | null = null;
    let bestPV: CellIndex[] = [];
    let bestOutcome: OutcomeClassification = isMaximizing ? 'proven_loss' : 'proven_win';
    const originalAlpha = alpha;

    pathSet.add(stateHash);

    if (isMaximizing) {
      let maxScore = -Infinity;

      for (const move of orderedMoves) {
        const nextState = applyMove(state, move);
        const childResult = this.alphaBeta(
          nextState,
          depth - 1,
          alpha,
          beta,
          maximizingPlayer,
          ply + 1,
          pathSet
        );

        if (this.abortSearch) break;

        const score = childResult.score;

        if (score > maxScore || (score === maxScore && bestMove !== null && this.breakTie(move, bestMove) < 0)) {
          maxScore = score;
          bestMove = move;
          bestOutcome = childResult.outcome;
          bestPV = [move, ...childResult.pv];
        }

        alpha = Math.max(alpha, maxScore);
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }

      pathSet.delete(stateHash);

      // Determine outcome classification
      let outcome: OutcomeClassification = 'unresolved';
      if (maxScore >= 90000) outcome = 'proven_win';
      else if (maxScore <= -90000) outcome = 'proven_loss';
      else if (maxScore === 0 && bestOutcome === 'proven_draw') outcome = 'proven_draw';

      // Store in Transposition Table if search wasn't aborted
      if (!this.abortSearch) {
        let storedScore = maxScore;
        if (storedScore > 90000) storedScore += ply;
        else if (storedScore < -90000) storedScore -= ply;

        let flag: 'exact' | 'lowerbound' | 'upperbound' = 'exact';
        if (maxScore <= originalAlpha) flag = 'upperbound';
        else if (maxScore >= beta) flag = 'lowerbound';

        this.transpositionTable.set(stateHash, {
          depth,
          score: storedScore,
          flag,
          bestMove,
          outcome,
        });
      }

      return { score: maxScore, bestMove, outcome, pv: bestPV };
    } else {
      // Minimizing player turn
      let minScore = Infinity;

      for (const move of orderedMoves) {
        const nextState = applyMove(state, move);
        const childResult = this.alphaBeta(
          nextState,
          depth - 1,
          alpha,
          beta,
          maximizingPlayer,
          ply + 1,
          pathSet
        );

        if (this.abortSearch) break;

        const score = childResult.score;

        if (score < minScore || (score === minScore && bestMove !== null && this.breakTie(move, bestMove) < 0)) {
          minScore = score;
          bestMove = move;
          bestOutcome = childResult.outcome;
          bestPV = [move, ...childResult.pv];
        }

        beta = Math.min(beta, minScore);
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }

      pathSet.delete(stateHash);

      let outcome: OutcomeClassification = 'unresolved';
      if (minScore <= -90000) outcome = 'proven_win'; // Minimizing lost, so maximizing won
      else if (minScore >= 90000) outcome = 'proven_loss';
      else if (minScore === 0 && bestOutcome === 'proven_draw') outcome = 'proven_draw';

      if (!this.abortSearch) {
        let storedScore = minScore;
        if (storedScore > 90000) storedScore += ply;
        else if (storedScore < -90000) storedScore -= ply;

        let flag: 'exact' | 'lowerbound' | 'upperbound' = 'exact';
        if (minScore <= originalAlpha) flag = 'upperbound';
        else if (minScore >= beta) flag = 'lowerbound';

        this.transpositionTable.set(stateHash, {
          depth,
          score: storedScore,
          flag,
          bestMove,
          outcome,
        });
      }

      return { score: minScore, bestMove, outcome, pv: bestPV };
    }
  }

  /**
   * Analyzes all candidate legal moves from the current position.
   * Uses iterative deepening up to maxDepth or until time budget expires.
   */
  public analyzePosition(
    state: GameState,
    options: SearchOptions = {}
  ): AnalysisResult {
    this.startTime = Date.now();
    this.nodesSearched = 0;
    this.transpositionHits = 0;
    this.abortSearch = false;

    const maxDepth = options.maxDepth ?? 8;
    this.timeBudgetMs = options.timeBudgetMs ?? 1500;

    const legalMoves = getLegalMoves(state);
    const activePlayer = state.turn;

    // 1. If standard rules and exact solving enabled (default), use mathematical retrograde tablebase
    const isStandardRules =
      state.rules.winCheckTiming === 'after_removal' &&
      state.rules.canReoccupyExpiringCell === false;

    if (isStandardRules && options.exactSolverIfFeasible !== false) {
      const exact = solvePositionExact(state);
      if (exact !== null) {
        return exact;
      }
    }

    if (legalMoves.length === 0 || state.status !== 'in_progress') {
      const isTerminalWin = state.status === 'x_won' || state.status === 'o_won';
      return {
        bestMove: null,
        candidates: [],
        engineStatus: {
          searchDepth: 0,
          nodesSearched: 0,
          timeTakenMs: 0,
          isExact: isTerminalWin,
          completedDepth: true,
          transpositionHits: 0,
          searchMethod: 'alpha_beta',
        },
        positionEvaluation: {
          overallOutcome: isTerminalWin
            ? state.winner === activePlayer
              ? 'proven_win'
              : 'proven_loss'
            : 'proven_draw',
          score: state.status === 'draw' ? 0 : state.winner === activePlayer ? WIN_SCORE : LOSS_SCORE,
          winningPlayer: state.winner,
          movesToTerminal: 0,
        },
      };
    }

    // Iterative Deepening
    let completedDepth = 1;
    let candidateAnalyses: CandidateAnalysis[] = [];

    const willExpireCell = getExpiringMark(state, activePlayer);

    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      const tempCandidates: CandidateAnalysis[] = [];
      const pathSet = new Set<string>();

      for (const move of legalMoves) {
        const nextState = applyMove(state, move);

        // Immediate win check
        if (nextState.status === 'x_won' || nextState.status === 'o_won') {
          tempCandidates.push({
            cell: move,
            algebraic: indexToAlgebraic(move),
            score: WIN_SCORE - 1,
            outcome: 'proven_win',
            depthReached: currentDepth,
            nodesSearched: this.nodesSearched,
            principalVariation: [move],
            pvAlgebraic: [indexToAlgebraic(move)],
            willExpireCell,
            willExpireAlgebraic: willExpireCell !== null ? indexToAlgebraic(willExpireCell) : null,
            opponentBestResponse: null,
            opponentBestResponseAlgebraic: null,
            tacticalExplanation: `Immediate winning move forming 3-in-a-row on line [${nextState.winningLine?.map(indexToAlgebraic).join('-')}].`,
            threatsCreated: [`Winning line on ${nextState.winningLine?.map(indexToAlgebraic).join('-')}`],
            threatsNeutralized: [],
            markAgeConsequence: willExpireCell !== null
              ? `Your oldest mark at ${indexToAlgebraic(willExpireCell)} vanishes, but new mark at ${indexToAlgebraic(move)} immediately wins the game.`
              : `New mark placed at ${indexToAlgebraic(move)} completes the win.`,
          });
          continue;
        }

        // Search opponent's responses with remaining depth
        const searchRes = this.alphaBeta(
          nextState,
          currentDepth - 1,
          -Infinity,
          Infinity,
          activePlayer,
          1,
          pathSet
        );

        if (this.abortSearch && currentDepth > 1) {
          // If aborted midway through a deeper depth, discard incomplete iteration
          break;
        }

        const score = searchRes.score;
        const outcome = searchRes.outcome;
        const opponentBestMove = searchRes.pv.length > 0 ? searchRes.pv[0] : null;

        // Tactical consequence analysis
        const pMarksAfter = nextState.turn === 'X' ? nextState.oMarks : nextState.xMarks;
        const oppMarksAfter = nextState.turn === 'X' ? nextState.xMarks : nextState.oMarks;
        const threatsCreated = detectThreats(pMarksAfter, nextState.board, null)
          .filter((t) => !t.isPhantom)
          .map((t) => `Threat along line ${t.line.map(indexToAlgebraic).join('-')}`);

        const threatsNeutralized: string[] = [];
        // Check if this move blocked an opponent threat
        const oppThreatsBefore = detectThreats(
          activePlayer === 'X' ? state.oMarks : state.xMarks,
          state.board,
          null
        );
        for (const ot of oppThreatsBefore) {
          if (ot.targetCell === move) {
            threatsNeutralized.push(`Blocked opponent threat along ${ot.line.map(indexToAlgebraic).join('-')}`);
          }
        }

        let markAgeConsequence = '';
        if (willExpireCell !== null) {
          markAgeConsequence = `Oldest mark at ${indexToAlgebraic(willExpireCell)} vanishes.`;
          // Did expiring mark dissolve any lines?
          const wasInLine = WINNING_LINES.some(
            (l) => l.includes(willExpireCell) && l.some((c) => c !== willExpireCell && pMarksAfter.includes(c))
          );
          if (wasInLine) {
            markAgeConsequence += ` (Cell ${indexToAlgebraic(willExpireCell)} is recycled safely).`;
          }
        } else {
          markAgeConsequence = `Player now has ${pMarksAfter.length} active marks (none expired yet).`;
        }

        tempCandidates.push({
          cell: move,
          algebraic: indexToAlgebraic(move),
          score,
          outcome,
          depthReached: currentDepth,
          nodesSearched: this.nodesSearched,
          principalVariation: [move, ...searchRes.pv],
          pvAlgebraic: [move, ...searchRes.pv].map(indexToAlgebraic),
          willExpireCell,
          willExpireAlgebraic: willExpireCell !== null ? indexToAlgebraic(willExpireCell) : null,
          opponentBestResponse: opponentBestMove,
          opponentBestResponseAlgebraic: opponentBestMove !== null ? indexToAlgebraic(opponentBestMove) : null,
          tacticalExplanation: '', // Will be enriched below
          threatsCreated,
          threatsNeutralized,
          markAgeConsequence,
        });
      }

      if (this.abortSearch && currentDepth > 1) {
        break;
      }

      // Sort candidates from best to worst deterministically
      tempCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return this.breakTie(a.cell, b.cell);
      });

      candidateAnalyses = tempCandidates;
      completedDepth = currentDepth;

      // If best move is an immediate or proven forced win, we can terminate iterative deepening early!
      if (candidateAnalyses.length > 0 && candidateAnalyses[0].outcome === 'proven_win') {
        break;
      }

      if (Date.now() - this.startTime >= this.timeBudgetMs) {
        break;
      }
    }

    const timeTakenMs = Math.max(1, Date.now() - this.startTime);
    const bestCandidate = candidateAnalyses[0] || null;

    // Enrich tactical explanations
    for (const cand of candidateAnalyses) {
      cand.tacticalExplanation = this.generateTacticalExplanation(cand, bestCandidate, activePlayer);
    }

    const isExact = bestCandidate !== null && (bestCandidate.outcome === 'proven_win' || bestCandidate.outcome === 'proven_loss' || bestCandidate.outcome === 'proven_draw');

    return {
      bestMove: bestCandidate,
      candidates: candidateAnalyses,
      engineStatus: {
        searchDepth: completedDepth,
        nodesSearched: this.nodesSearched,
        timeTakenMs,
        isExact,
        completedDepth: !this.abortSearch,
        transpositionHits: this.transpositionHits,
        searchMethod: 'alpha_beta',
      },
      positionEvaluation: {
        overallOutcome: bestCandidate ? bestCandidate.outcome : 'unresolved',
        score: bestCandidate ? bestCandidate.score : 0,
        winningPlayer: bestCandidate && bestCandidate.outcome === 'proven_win' ? activePlayer : null,
        movesToTerminal: bestCandidate && bestCandidate.outcome === 'proven_win'
          ? Math.max(1, Math.round((WIN_SCORE - bestCandidate.score)))
          : null,
      },
    };
  }

  /**
   * Generates a natural-language tactical explanation for a candidate move.
   */
  private generateTacticalExplanation(
    candidate: CandidateAnalysis,
    bestCandidate: CandidateAnalysis | null,
    player: Player
  ): string {
    const opp: Player = player === 'X' ? 'O' : 'X';
    const cellName = candidate.algebraic;

    if (candidate.outcome === 'proven_win') {
      const plies = Math.max(1, WIN_SCORE - candidate.score);
      const moves = Math.ceil(plies / 2);
      return `Forced winning sequence in ${moves} turn${moves > 1 ? 's' : ''}! Playing ${cellName} guarantees victory under optimal play. ${candidate.threatsCreated.length > 0 ? candidate.threatsCreated[0] + '.' : ''}`;
    }

    if (candidate.outcome === 'proven_loss') {
      return `Losing line: Opponent ${opp} can force a win against ${cellName} with ${candidate.opponentBestResponseAlgebraic ? candidate.opponentBestResponseAlgebraic : 'proper play'}.`;
    }

    if (candidate.outcome === 'proven_draw') {
      return `Forced draw sequence: Repeating positions or cycle equilibrium reached. Neither side can break through.`;
    }

    // Heuristic / unresolved evaluation
    const reasons: string[] = [];

    if (candidate.threatsNeutralized.length > 0) {
      reasons.push(candidate.threatsNeutralized[0]);
    }

    if (candidate.threatsCreated.length > 0) {
      reasons.push(`Creates ${candidate.threatsCreated[0]}`);
    }

    if (candidate.cell === 4) {
      reasons.push('Secures central pivot controlling 4 strategic lines');
    } else if ([0, 2, 6, 8].includes(candidate.cell)) {
      reasons.push('Controls key corner square supporting diagonal & lateral lines');
    }

    if (candidate.willExpireAlgebraic) {
      reasons.push(`Oldest mark at ${candidate.willExpireAlgebraic} expires smoothly`);
    }

    if (candidate.opponentBestResponseAlgebraic) {
      reasons.push(`Anticipates opponent response at ${candidate.opponentBestResponseAlgebraic}`);
    }

    if (reasons.length === 0) {
      reasons.push(`Solid positional choice maintaining board initiative and piece mobility`);
    }

    const isBest = bestCandidate !== null && bestCandidate.cell === candidate.cell;
    const prefix = isBest ? 'Strongest move: ' : 'Alternative candidate: ';
    return `${prefix}${reasons.join('. ')}.`;
  }
}

export const globalSearchEngine = new SearchEngine();
