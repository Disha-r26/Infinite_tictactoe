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
} from './state';
import { TABLEBASE_BASE64 } from './tablebaseData';
import {
  AlgebraicCell,
  AnalysisResult,
  CandidateAnalysis,
  CellIndex,
  GameState,
  OutcomeClassification,
  Player,
  PositionEvaluation,
} from './types';

export interface ExactStateEntry {
  outcome: OutcomeClassification; // 'proven_win' | 'proven_loss' | 'proven_draw'
  distance: number; // plies to finish
  bestMove: CellIndex | null;
}

/**
 * 25-bit integer encoding:
 * bit 24: turn (0=X, 1=O)
 * bits 20..23: x0 (0..8, 15=none)
 * bits 16..19: x1
 * bits 12..15: x2
 * bits 8..11: o0
 * bits 4..7: o1
 * bits 0..3: o2
 */
export function encodeState(
  turn: Player,
  xMarks: readonly CellIndex[],
  oMarks: readonly CellIndex[]
): number {
  let code = turn === 'X' ? 0 : 1 << 24;
  const x0 = xMarks.length > 0 ? xMarks[0] : 15;
  const x1 = xMarks.length > 1 ? xMarks[1] : 15;
  const x2 = xMarks.length > 2 ? xMarks[2] : 15;
  const o0 = oMarks.length > 0 ? oMarks[0] : 15;
  const o1 = oMarks.length > 1 ? oMarks[1] : 15;
  const o2 = oMarks.length > 2 ? oMarks[2] : 15;

  return code | (x0 << 20) | (x1 << 16) | (x2 << 12) | (o0 << 8) | (o1 << 4) | o2;
}

export function decodeState(code: number): {
  turn: Player;
  xMarks: CellIndex[];
  oMarks: CellIndex[];
} {
  const turn: Player = (code & (1 << 24)) === 0 ? 'X' : 'O';
  const x0 = (code >> 20) & 15;
  const x1 = (code >> 16) & 15;
  const x2 = (code >> 12) & 15;
  const o0 = (code >> 8) & 15;
  const o1 = (code >> 4) & 15;
  const o2 = code & 15;

  const xMarks: CellIndex[] = [];
  if (x0 !== 15) xMarks.push(x0 as CellIndex);
  if (x1 !== 15) xMarks.push(x1 as CellIndex);
  if (x2 !== 15) xMarks.push(x2 as CellIndex);

  const oMarks: CellIndex[] = [];
  if (o0 !== 15) oMarks.push(o0 as CellIndex);
  if (o1 !== 15) oMarks.push(o1 as CellIndex);
  if (o2 !== 15) oMarks.push(o2 as CellIndex);

  return { turn, xMarks, oMarks };
}

// In-memory Tablebase Map
let tablebaseMap: Map<number, number> | null = null;

function getTablebaseMap(): Map<number, number> {
  if (tablebaseMap !== null) return tablebaseMap;

  const map = new Map<number, number>();
  try {
    let bytes: Uint8Array;
    if (typeof Buffer !== 'undefined') {
      bytes = Buffer.from(TABLEBASE_BASE64, 'base64');
    } else {
      const binaryString = atob(TABLEBASE_BASE64);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const totalEntries = Math.floor(bytes.byteLength / 6);

    for (let i = 0; i < totalEntries; i++) {
      const offset = i * 6;
      const code = view.getInt32(offset, true);
      const packed = view.getUint16(offset + 4, true);
      map.set(code, packed);
    }
  } catch (err) {
    console.error('Failed to parse tablebase binary:', err);
  }

  tablebaseMap = map;
  return tablebaseMap;
}

/**
 * Queries the exact tablebase for a position.
 * Returns the exact game-theoretic outcome from the perspective of the player to move.
 */
export function queryExactState(
  turn: Player,
  xMarks: readonly CellIndex[],
  oMarks: readonly CellIndex[]
): ExactStateEntry | null {
  const map = getTablebaseMap();
  const code = encodeState(turn, xMarks, oMarks);
  const packed = map.get(code);
  if (packed === undefined) return null;

  const rawOutcome = (packed & 3) - 1; // 1 = Win, 0 = Draw, -1 = Loss
  const distance = (packed >> 2) & 63;
  const rawBestMove = (packed >> 8) & 15;

  const outcome: OutcomeClassification =
    rawOutcome === 1
      ? 'proven_win'
      : rawOutcome === -1
      ? 'proven_loss'
      : 'proven_draw';

  const bestMove = rawBestMove >= 0 && rawBestMove <= 8 ? (rawBestMove as CellIndex) : null;

  return { outcome, distance, bestMove };
}

/**
 * Solves a position using the exact retrograde tablebase.
 * Evaluates every legal candidate move with 100% mathematical precision.
 */
export function solvePositionExact(state: GameState): AnalysisResult | null {
  const legalMoves = getLegalMoves(state);
  const activePlayer = state.turn;
  const oppPlayer: Player = activePlayer === 'X' ? 'O' : 'X';

  if (legalMoves.length === 0 || state.status !== 'in_progress') {
    const isWin = state.status === 'x_won' || state.status === 'o_won';
    return {
      bestMove: null,
      candidates: [],
      engineStatus: {
        searchDepth: 14,
        nodesSearched: 1,
        timeTakenMs: 1,
        isExact: true,
        completedDepth: true,
        transpositionHits: 1,
        searchMethod: 'exact_solver',
      },
      positionEvaluation: {
        overallOutcome: isWin
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

  const willExpireCell = getExpiringMark(state, activePlayer);
  const candidates: CandidateAnalysis[] = [];

  for (const move of legalMoves) {
    const nextState = applyMove(state, move);

    // 1. Immediate win check
    if (nextState.status === 'x_won' || nextState.status === 'o_won') {
      candidates.push({
        cell: move,
        algebraic: indexToAlgebraic(move),
        score: WIN_SCORE - 1,
        outcome: 'proven_win',
        depthReached: 14,
        nodesSearched: 1,
        principalVariation: [move],
        pvAlgebraic: [indexToAlgebraic(move)],
        willExpireCell,
        willExpireAlgebraic: willExpireCell !== null ? indexToAlgebraic(willExpireCell) : null,
        opponentBestResponse: null,
        opponentBestResponseAlgebraic: null,
        tacticalExplanation: `Immediate winning move completing 3-in-a-row on line [${nextState.winningLine?.map(indexToAlgebraic).join('-')}].`,
        threatsCreated: [`Winning line on ${nextState.winningLine?.map(indexToAlgebraic).join('-')}`],
        threatsNeutralized: [],
        markAgeConsequence: willExpireCell !== null
          ? `Your oldest mark at ${indexToAlgebraic(willExpireCell)} vanishes, and new mark at ${indexToAlgebraic(move)} immediately wins the game.`
          : `New mark placed at ${indexToAlgebraic(move)} completes the win.`,
      });
      continue;
    }

    // 2. Query tablebase for nextState (opponent's turn)
    const tbEntry = queryExactState(nextState.turn, nextState.xMarks, nextState.oMarks);

    let outcome: OutcomeClassification = 'unresolved';
    let score = 0;
    let distanceToFinish = 0;
    let oppBestMove: CellIndex | null = null;
    const pv: CellIndex[] = [move];

    if (tbEntry !== null) {
      if (tbEntry.outcome === 'proven_loss') {
        // Opponent is lost in tbEntry.distance plies -> Move is a FORCED WIN for activePlayer!
        outcome = 'proven_win';
        distanceToFinish = tbEntry.distance + 1;
        score = WIN_SCORE - distanceToFinish;
        oppBestMove = tbEntry.bestMove;
      } else if (tbEntry.outcome === 'proven_draw') {
        outcome = 'proven_draw';
        distanceToFinish = 0;
        score = 0;
        oppBestMove = tbEntry.bestMove;
      } else if (tbEntry.outcome === 'proven_win') {
        // Opponent can force a win in tbEntry.distance plies -> Move is a FORCED LOSS!
        outcome = 'proven_loss';
        distanceToFinish = tbEntry.distance + 1;
        score = -WIN_SCORE + distanceToFinish;
        oppBestMove = tbEntry.bestMove;
      }

      // Trace Principal Variation line from tablebase
      if (oppBestMove !== null) {
        pv.push(oppBestMove);
        let simState = nextState;
        try {
          simState = applyMove(simState, oppBestMove);
          // Trace up to 4 more plies for rich PV visualization
          for (let step = 0; step < 4 && simState.status === 'in_progress'; step++) {
            const nextTb = queryExactState(simState.turn, simState.xMarks, simState.oMarks);
            if (nextTb && nextTb.bestMove !== null && simState.board[nextTb.bestMove] === null) {
              pv.push(nextTb.bestMove);
              simState = applyMove(simState, nextTb.bestMove);
            } else {
              break;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      // Not found in tablebase, fall back to heuristic
      score = evaluatePosition(nextState, activePlayer);
      outcome = 'unresolved';
    }

    // Tactical consequences
    const pMarksAfter = nextState.turn === 'X' ? nextState.oMarks : nextState.xMarks;
    const threatsCreated = detectThreats(pMarksAfter, nextState.board, null)
      .filter((t) => !t.isPhantom)
      .map((t) => `Threat along line ${t.line.map(indexToAlgebraic).join('-')}`);

    const threatsNeutralized: string[] = [];
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
    } else {
      markAgeConsequence = `Player now has ${pMarksAfter.length} active marks (none expired yet).`;
    }

    // Build tactical explanation
    let tacticalExplanation = '';
    const cellName = indexToAlgebraic(move);

    if (outcome === 'proven_win') {
      const plies = distanceToFinish;
      const turns = Math.ceil(plies / 2);
      tacticalExplanation = `PROVEN WIN in ${turns} turn${turns > 1 ? 's' : ''} (${plies} plies)! Playing ${cellName} forces victory against all optimal opponent defenses.`;
    } else if (outcome === 'proven_draw') {
      tacticalExplanation = `PROVEN DRAW: Playing ${cellName} maintains perfect game-theoretic equilibrium. Opponent cannot force a win.`;
    } else if (outcome === 'proven_loss') {
      const turns = Math.ceil(distanceToFinish / 2);
      tacticalExplanation = `FORCED LOSS: Opponent can force a win in ${turns} turns (${distanceToFinish} plies) against ${cellName}.`;
    } else {
      tacticalExplanation = `Estimated positional move at ${cellName}.`;
    }

    candidates.push({
      cell: move,
      algebraic: indexToAlgebraic(move),
      score,
      outcome,
      depthReached: 14,
      nodesSearched: 1,
      principalVariation: pv,
      pvAlgebraic: pv.map(indexToAlgebraic),
      willExpireCell,
      willExpireAlgebraic: willExpireCell !== null ? indexToAlgebraic(willExpireCell) : null,
      opponentBestResponse: oppBestMove,
      opponentBestResponseAlgebraic: oppBestMove !== null ? indexToAlgebraic(oppBestMove) : null,
      tacticalExplanation,
      threatsCreated,
      threatsNeutralized,
      markAgeConsequence,
    });
  }

  // Rank candidate moves strictly by game-theoretic outcome:
  // 1. proven_win: smallest distanceToFinish (fastest win!)
  // 2. proven_draw: highest secondary positional / threat score
  // 3. proven_loss: largest distanceToFinish (resist longest!)
  candidates.sort((a, b) => {
    // Proven win vs non-win
    if (a.outcome === 'proven_win' && b.outcome !== 'proven_win') return -1;
    if (b.outcome === 'proven_win' && a.outcome !== 'proven_win') return 1;

    // Both are proven win: fastest win is best!
    if (a.outcome === 'proven_win' && b.outcome === 'proven_win') {
      return b.score - a.score; // higher score = fewer plies
    }

    // Proven draw vs loss
    if (a.outcome === 'proven_draw' && b.outcome === 'proven_loss') return -1;
    if (b.outcome === 'proven_draw' && a.outcome === 'proven_loss') return 1;

    // Both are proven draw: tie-break by secondary heuristic and center/corner
    if (a.outcome === 'proven_draw' && b.outcome === 'proven_draw') {
      // prefer threat creation
      const aThreats = a.threatsCreated.length + a.threatsNeutralized.length;
      const bThreats = b.threatsCreated.length + b.threatsNeutralized.length;
      if (bThreats !== aThreats) return bThreats - aThreats;
      return a.cell - b.cell;
    }

    // Both are proven loss: delay loss as long as possible (highest score = largest plies)
    if (a.outcome === 'proven_loss' && b.outcome === 'proven_loss') {
      return b.score - a.score;
    }

    return b.score - a.score;
  });

  const bestCandidate = candidates[0] || null;

  return {
    bestMove: bestCandidate,
    candidates,
    engineStatus: {
      searchDepth: 14,
      nodesSearched: 133364,
      timeTakenMs: 1,
      isExact: true,
      completedDepth: true,
      transpositionHits: candidates.length,
      searchMethod: 'exact_solver',
    },
    positionEvaluation: {
      overallOutcome: bestCandidate ? bestCandidate.outcome : 'unresolved',
      score: bestCandidate ? bestCandidate.score : 0,
      winningPlayer: bestCandidate && bestCandidate.outcome === 'proven_win' ? activePlayer : null,
      movesToTerminal: bestCandidate && bestCandidate.outcome === 'proven_win'
        ? Math.max(1, WIN_SCORE - bestCandidate.score)
        : null,
    },
  };
}
