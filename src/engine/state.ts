import {
  ALL_CELLS,
  DEFAULT_RULES,
  indexToAlgebraic,
  WINNING_LINES,
} from './constants';
import {
  CellIndex,
  GameRules,
  GameState,
  GameStatus,
  MoveRecord,
  Player,
} from './types';

/**
 * Generates an exact, deterministic state hash capturing:
 * - Current turn ('X' or 'O')
 * - Chronological sequence of active X marks
 * - Chronological sequence of active O marks
 *
 * CRITICAL: Positions with identical visible boards but different mark ages
 * produce different hashes because their future transitions diverge.
 */
export function getStateHash(
  turn: Player,
  xMarks: readonly CellIndex[],
  oMarks: readonly CellIndex[]
): string {
  return `${turn}|X:${xMarks.join(',')}|O:${oMarks.join(',')}`;
}

export function getStateHashFromState(state: GameState): string {
  return getStateHash(state.turn, state.xMarks, state.oMarks);
}

/**
 * Creates the initial fresh 3x3 game state.
 */
export function createInitialState(
  rulesConfig?: Partial<GameRules>,
  startingPlayer: Player = 'X'
): GameState {
  const rules: GameRules = {
    ...DEFAULT_RULES,
    ...(rulesConfig || {}),
  };

  const initialHash = getStateHash(startingPlayer, [], []);

  return {
    board: [null, null, null, null, null, null, null, null, null],
    turn: startingPlayer,
    startingPlayer,
    xMarks: [],
    oMarks: [],
    moveHistory: [],
    status: 'in_progress',
    winner: null,
    winningLine: null,
    rules,
    repetitionCounts: { [initialHash]: 1 },
  };
}

/**
 * Returns which mark will expire if the current player places a mark now.
 * Returns null if the player currently has fewer than 3 marks.
 */
export function getExpiringMark(state: GameState, player: Player = state.turn): CellIndex | null {
  const marks = player === 'X' ? state.xMarks : state.oMarks;
  return marks.length >= 3 ? marks[0] : null;
}

/**
 * Returns all currently legal moves for the active player.
 */
export function getLegalMoves(state: GameState): CellIndex[] {
  if (state.status !== 'in_progress') {
    return [];
  }

  const legal: CellIndex[] = [];
  const currentMarks = state.turn === 'X' ? state.xMarks : state.oMarks;
  const expiringCell = currentMarks.length >= 3 ? currentMarks[0] : null;

  for (const cell of ALL_CELLS) {
    if (state.board[cell] === null) {
      legal.push(cell);
    } else if (
      state.rules.canReoccupyExpiringCell &&
      expiringCell !== null &&
      cell === expiringCell
    ) {
      // Rule variation: Player can reoccupy the cell their own expiring mark is vacating
      legal.push(cell);
    }
  }

  return legal;
}

/**
 * Checks if a given array of marks contains any 3-in-a-row winning line.
 */
export function checkWinForMarks(
  marks: readonly CellIndex[]
): [CellIndex, CellIndex, CellIndex] | null {
  if (marks.length < 3) return null;

  const markSet = new Set(marks);
  for (const line of WINNING_LINES) {
    if (markSet.has(line[0]) && markSet.has(line[1]) && markSet.has(line[2])) {
      return [line[0], line[1], line[2]];
    }
  }
  return null;
}

/**
 * Checks if the board currently contains a winning line for either player.
 */
export function getWinningLines(
  state: GameState
): { player: Player; line: [CellIndex, CellIndex, CellIndex] } | null {
  const xWin = checkWinForMarks(state.xMarks);
  if (xWin) return { player: 'X', line: xWin };

  const oWin = checkWinForMarks(state.oMarks);
  if (oWin) return { player: 'O', line: oWin };

  return null;
}

/**
 * Pure function: applies a move deterministically and returns a new GameState.
 * Never mutates the input state.
 *
 * Execution order (per Section 5):
 * 1. Validate the selected cell and the current game status.
 * 2. Determine which mark expires under the selected rule.
 * 3. Remove the expiring mark when required.
 * 4. Place the new mark.
 * 5. Update that player's chronological mark queue.
 * 6. Check winning conditions at the rule-defined point in the transition.
 * 7. Update the next player and game status.
 */
export function applyMove(
  state: GameState,
  cell: CellIndex,
  rulesOverride?: Partial<GameRules>
): GameState {
  if (state.status !== 'in_progress') {
    throw new Error(`Cannot apply move ${cell} to game that is already finished (${state.status})`);
  }

  const rules: GameRules = {
    ...state.rules,
    ...(rulesOverride || {}),
  };

  const player = state.turn;
  const currentMarks = player === 'X' ? [...state.xMarks] : [...state.oMarks];
  const opponentMarks = player === 'X' ? [...state.oMarks] : [...state.xMarks];

  // 1. Validation
  const willExpire = currentMarks.length >= 3;
  const expiringCell = willExpire ? currentMarks[0] : null;

  const isCellVacant = state.board[cell] === null;
  const isExpiringCellReoccupied =
    rules.canReoccupyExpiringCell && expiringCell !== null && cell === expiringCell;

  if (!isCellVacant && !isExpiringCellReoccupied) {
    throw new Error(
      `Illegal move: Cell ${indexToAlgebraic(cell)} is already occupied by ${state.board[cell]}`
    );
  }

  // Pre-removal win check variation (if enabled)
  let preRemovalWin: [CellIndex, CellIndex, CellIndex] | null = null;
  if (rules.winCheckTiming === 'before_removal') {
    preRemovalWin = checkWinForMarks([...currentMarks, cell]);
  }

  // 2 & 3. Remove expiring mark
  const newBoard = [...state.board];
  if (willExpire && expiringCell !== null) {
    newBoard[expiringCell] = null;
    currentMarks.shift(); // remove oldest
  }

  // 4. Place new mark
  newBoard[cell] = player;

  // 5. Update chronological queue
  currentMarks.push(cell);

  const newXMarks = player === 'X' ? currentMarks : opponentMarks;
  const newOMarks = player === 'O' ? currentMarks : opponentMarks;

  // 6. Check winning conditions
  let winner: Player | null = null;
  let winningLine: [CellIndex, CellIndex, CellIndex] | null = null;

  if (rules.winCheckTiming === 'before_removal' && preRemovalWin) {
    winner = player;
    winningLine = preRemovalWin;
  } else {
    // Standard default: check winning condition among the surviving 3 active marks
    winningLine = checkWinForMarks(currentMarks);
    if (winningLine) {
      winner = player;
    }
  }

  // Determine game status
  let status: GameStatus = 'in_progress';
  const nextPlayer: Player = player === 'X' ? 'O' : 'X';
  const resultingHash = getStateHash(nextPlayer, newXMarks, newOMarks);
  const newRepetitionCounts = { ...state.repetitionCounts };
  newRepetitionCounts[resultingHash] = (newRepetitionCounts[resultingHash] || 0) + 1;

  if (winner !== null) {
    status = winner === 'X' ? 'x_won' : 'o_won';
  } else {
    // Check repetition rules
    if (rules.repetitionPolicy === 'threefold' && newRepetitionCounts[resultingHash] >= 3) {
      status = 'draw';
    } else if (rules.repetitionPolicy === 'fivefold' && newRepetitionCounts[resultingHash] >= 5) {
      status = 'draw';
    } else if (rules.maxMovesLimit > 0 && state.moveHistory.length + 1 >= rules.maxMovesLimit) {
      status = 'draw';
    }
  }

  // Create move record
  const moveRecord: MoveRecord = {
    moveNumber: state.moveHistory.length + 1,
    player,
    toCell: cell,
    expiredCell: expiringCell,
    algebraic: indexToAlgebraic(cell),
    notation: expiringCell !== null
      ? `${player}:${indexToAlgebraic(cell)} (-${indexToAlgebraic(expiringCell)})`
      : `${player}:${indexToAlgebraic(cell)}`,
    resultingHash,
    timestamp: Date.now(),
  };

  return {
    board: newBoard,
    turn: nextPlayer,
    startingPlayer: state.startingPlayer,
    xMarks: newXMarks,
    oMarks: newOMarks,
    moveHistory: [...state.moveHistory, moveRecord],
    status,
    winner,
    winningLine,
    rules,
    repetitionCounts: newRepetitionCounts,
  };
}

/**
 * Undoes the last recorded move, restoring the exact previous state.
 * Replays history from initial state to ensure zero state drift.
 */
export function undoMove(state: GameState): GameState {
  if (state.moveHistory.length === 0) {
    return state;
  }

  const previousMoves = state.moveHistory.slice(0, -1);
  const startingPlayer = state.startingPlayer;
  let restored = createInitialState(state.rules, startingPlayer);

  for (const move of previousMoves) {
    restored = applyMove(restored, move.toCell);
  }

  return restored;
}

/**
 * Validates the internal consistency and invariants of a GameState.
 */
export function validateState(state: GameState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!state.board || state.board.length !== 9) {
    errors.push(`Board must have exactly 9 cells, found ${state.board?.length}`);
  }

  if (state.xMarks.length > 3) {
    errors.push(`X cannot have more than 3 active marks, found ${state.xMarks.length}`);
  }

  if (state.oMarks.length > 3) {
    errors.push(`O cannot have more than 3 active marks, found ${state.oMarks.length}`);
  }

  // Check unique cells in xMarks
  const uniqueX = new Set(state.xMarks);
  if (uniqueX.size !== state.xMarks.length) {
    errors.push(`Duplicate cells in xMarks: [${state.xMarks.join(', ')}]`);
  }

  // Check unique cells in oMarks
  const uniqueO = new Set(state.oMarks);
  if (uniqueO.size !== state.oMarks.length) {
    errors.push(`Duplicate cells in oMarks: [${state.oMarks.join(', ')}]`);
  }

  // Check overlap between X and O
  for (const cell of state.xMarks) {
    if (uniqueO.has(cell)) {
      errors.push(`Cell ${cell} (${indexToAlgebraic(cell)}) is occupied by both X and O`);
    }
  }

  // Verify board cells match mark queues
  for (let i = 0; i < 9; i++) {
    const isX = state.xMarks.includes(i as CellIndex);
    const isO = state.oMarks.includes(i as CellIndex);
    const boardVal = state.board[i];

    if (isX && boardVal !== 'X') {
      errors.push(`Cell ${i} is in xMarks but board has ${boardVal}`);
    }
    if (isO && boardVal !== 'O') {
      errors.push(`Cell ${i} is in oMarks but board has ${boardVal}`);
    }
    if (!isX && !isO && boardVal !== null) {
      errors.push(`Cell ${i} is not in mark queues but board has ${boardVal}`);
    }
  }

  // Verify winning status
  const win = getWinningLines(state);
  if (state.winner !== null) {
    if (!win || win.player !== state.winner) {
      errors.push(`Winner is marked as ${state.winner} but board has no valid winning line for ${state.winner}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
