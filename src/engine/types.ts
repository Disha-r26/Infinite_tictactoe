/**
 * Infinite Tic-Tac-Toe Engine Types & Data Models
 * Strict TypeScript types for deterministic state, rules, search, and analysis.
 */

export type Player = 'X' | 'O';

export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type AlgebraicCell = 'A1' | 'B1' | 'C1' | 'A2' | 'B2' | 'C2' | 'A3' | 'B3' | 'C3';

export type GameStatus = 'in_progress' | 'x_won' | 'o_won' | 'draw';

export type OutcomeClassification = 'proven_win' | 'proven_loss' | 'proven_draw' | 'unresolved';

export interface GameRules {
  /**
   * When winning conditions are evaluated relative to mark expiration.
   * 'after_removal' (Default): The 4th mark causes the oldest mark to disappear,
   * then the remaining 3 marks are checked for a line.
   * 'before_removal': Checks if the 4th mark creates a line with existing marks
   * before the oldest is removed.
   */
  winCheckTiming: 'after_removal' | 'before_removal';

  /**
   * Whether a player can place a new mark directly on the cell their own
   * oldest mark is currently vacating (on their 4th+ move).
   * Default: false (cell must already be empty on the board before the move).
   */
  canReoccupyExpiringCell: boolean;

  /**
   * Repetition draw policy:
   * 'threefold': Game is a draw if the exact state (board + mark ages + turn) occurs 3 times.
   * 'fivefold': Draw on 5 repetitions.
   * 'none': Repetitions do not automatically cause a draw.
   */
  repetitionPolicy: 'threefold' | 'fivefold' | 'none';

  /**
   * Optional maximum total plies/moves before declaring a draw (0 = disabled).
   */
  maxMovesLimit: number;
}

export interface MoveRecord {
  moveNumber: number;
  player: Player;
  toCell: CellIndex;
  expiredCell: CellIndex | null;
  algebraic: AlgebraicCell;
  notation: string;
  resultingHash: string;
  timestamp: number;
}

export interface GameState {
  board: (Player | null)[];
  turn: Player;
  startingPlayer: Player;
  /**
   * Chronological queue of active X marks on board:
   * xMarks[0] is oldest (will expire next when X places their 4th mark)
   * xMarks[xMarks.length - 1] is newest
   * Length is always between 0 and 3.
   */
  xMarks: CellIndex[];
  /**
   * Chronological queue of active O marks on board:
   * oMarks[0] is oldest (will expire next when O places their 4th mark)
   * oMarks[oMarks.length - 1] is newest
   * Length is always between 0 and 3.
   */
  oMarks: CellIndex[];
  moveHistory: MoveRecord[];
  status: GameStatus;
  winner: Player | null;
  winningLine: [CellIndex, CellIndex, CellIndex] | null;
  rules: GameRules;
  repetitionCounts: Record<string, number>;
}

export interface CandidateAnalysis {
  cell: CellIndex;
  algebraic: AlgebraicCell;
  score: number;
  outcome: OutcomeClassification;
  depthReached: number;
  nodesSearched: number;
  principalVariation: CellIndex[];
  pvAlgebraic: AlgebraicCell[];
  willExpireCell: CellIndex | null;
  willExpireAlgebraic: AlgebraicCell | null;
  opponentBestResponse: CellIndex | null;
  opponentBestResponseAlgebraic: AlgebraicCell | null;
  tacticalExplanation: string;
  threatsCreated: string[];
  threatsNeutralized: string[];
  markAgeConsequence: string;
}

export interface EngineStatus {
  searchDepth: number;
  nodesSearched: number;
  timeTakenMs: number;
  isExact: boolean;
  completedDepth: boolean;
  transpositionHits: number;
  searchMethod: 'alpha_beta' | 'exact_solver';
}

export interface PositionEvaluation {
  overallOutcome: OutcomeClassification;
  score: number;
  winningPlayer: Player | null;
  movesToTerminal: number | null;
}

export interface AnalysisResult {
  bestMove: CandidateAnalysis | null;
  candidates: CandidateAnalysis[];
  engineStatus: EngineStatus;
  positionEvaluation: PositionEvaluation;
}

export interface SearchOptions {
  maxDepth?: number;
  timeBudgetMs?: number;
  exactSolverIfFeasible?: boolean;
}
