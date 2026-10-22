import { algebraicToIndex, indexToAlgebraic, DEFAULT_RULES } from './constants';
import { applyMove, createInitialState, validateState } from './state';
import { AlgebraicCell, CellIndex, GameRules, GameState, MoveRecord, Player } from './types';

export const MAX_SERIALIZED_PAYLOAD_BYTES = 65536; // 64 KB limit
export const MAX_MOVE_SEQUENCE_LENGTH = 200; // 200 plies limit

export interface ExportedGameData {
  version: '1.0';
  exportedAt: string;
  rules: GameRules;
  startingPlayer: Player;
  userSymbol?: Player;
  moves: Array<{
    player: Player;
    cell: AlgebraicCell;
    expired?: AlgebraicCell | null;
  }>;
  status: string;
  winner: Player | null;
}

/**
 * Sanitizes and validates rules to prevent prototype pollution or invalid configurations.
 */
export function sanitizeRules(rawRules?: unknown): Partial<GameRules> {
  if (!rawRules || typeof rawRules !== 'object') {
    return { ...DEFAULT_RULES };
  }

  const safe: Partial<GameRules> = {};
  const r = rawRules as Record<string, unknown>;

  if (r.winCheckTiming === 'before_removal' || r.winCheckTiming === 'after_removal') {
    safe.winCheckTiming = r.winCheckTiming;
  }

  if (typeof r.canReoccupyExpiringCell === 'boolean') {
    safe.canReoccupyExpiringCell = r.canReoccupyExpiringCell;
  }

  if (r.repetitionPolicy === 'threefold' || r.repetitionPolicy === 'fivefold' || r.repetitionPolicy === 'none') {
    safe.repetitionPolicy = r.repetitionPolicy;
  }

  if (typeof r.maxMovesLimit === 'number' && Number.isFinite(r.maxMovesLimit)) {
    // Clamp to reasonable range [0, 500]
    safe.maxMovesLimit = Math.max(0, Math.min(500, Math.floor(r.maxMovesLimit)));
  }

  return safe;
}

/**
 * Serializes the current game state to a portable JSON object.
 */
export function exportGameToJson(state: GameState, userSymbol: Player = 'X'): string {
  const startingPlayer = state.startingPlayer || (state.moveHistory.length > 0 ? state.moveHistory[0].player : state.turn);

  const data: ExportedGameData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    rules: state.rules,
    startingPlayer,
    userSymbol,
    moves: state.moveHistory.map((m) => ({
      player: m.player,
      cell: m.algebraic,
      expired: m.expiredCell !== null ? indexToAlgebraic(m.expiredCell) : null,
    })),
    status: state.status,
    winner: state.winner,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Reconstructs a game from a recorded sequence of moves.
 * Validates each move in order and reports any errors or ambiguities.
 */
export function reconstructFromMoves(
  rawMoves: Array<{ player: Player; cell: CellIndex | string }>,
  rules?: Partial<GameRules>,
  startingPlayer?: Player
): { state: GameState | null; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(rawMoves)) {
    return { state: null, errors: ['Invalid move sequence: expected an array of moves.'] };
  }

  if (rawMoves.length > MAX_MOVE_SEQUENCE_LENGTH) {
    return {
      state: null,
      errors: [`Move sequence exceeds maximum allowed length (${MAX_MOVE_SEQUENCE_LENGTH} moves).`],
    };
  }

  const safeRules = sanitizeRules(rules);

  const safeStartingPlayer: Player =
    startingPlayer === 'X' || startingPlayer === 'O'
      ? startingPlayer
      : rawMoves.length > 0 && (rawMoves[0].player === 'X' || rawMoves[0].player === 'O')
      ? rawMoves[0].player
      : 'X';

  if (rawMoves.length === 0) {
    const initialState = createInitialState(safeRules, safeStartingPlayer);
    return { state: initialState, errors: [] };
  }

  let currentState = createInitialState(safeRules, safeStartingPlayer);

  for (let i = 0; i < rawMoves.length; i++) {
    const raw = rawMoves[i];
    if (!raw || typeof raw !== 'object') {
      errors.push(`Move #${i + 1}: Malformed move descriptor.`);
      break;
    }

    if (raw.player !== 'X' && raw.player !== 'O') {
      errors.push(`Move #${i + 1}: Invalid player symbol "${String(raw.player)}". Must be 'X' or 'O'.`);
      break;
    }

    let cellIdx: CellIndex | null = null;

    if (typeof raw.cell === 'number') {
      if (Number.isInteger(raw.cell) && raw.cell >= 0 && raw.cell <= 8) {
        cellIdx = raw.cell as CellIndex;
      } else {
        errors.push(`Move #${i + 1}: Invalid cell index ${raw.cell}. Must be 0-8.`);
        break;
      }
    } else if (typeof raw.cell === 'string') {
      cellIdx = algebraicToIndex(raw.cell);
      if (cellIdx === null) {
        errors.push(`Move #${i + 1}: Invalid algebraic cell "${raw.cell}". Must be A1-C3.`);
        break;
      }
    }

    if (cellIdx === null) {
      errors.push(`Move #${i + 1}: Unrecognized cell format.`);
      break;
    }

    if (raw.player !== currentState.turn) {
      errors.push(
        `Move #${i + 1}: Expected player ${currentState.turn} to move, but move has player ${raw.player}.`
      );
      break;
    }

    if (currentState.status !== 'in_progress') {
      errors.push(
        `Move #${i + 1}: Game already concluded with status "${currentState.status}" before move was applied.`
      );
      break;
    }

    try {
      currentState = applyMove(currentState, cellIdx, safeRules);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown move execution error';
      errors.push(`Move #${i + 1} (${raw.player} to ${indexToAlgebraic(cellIdx)}): ${msg}`);
      break;
    }
  }

  const validation = validateState(currentState);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  return {
    state: errors.length === 0 ? currentState : null,
    errors,
  };
}

/**
 * Parses user input text (such as "X: B2, O: A1, X: B1" or multiline moves)
 * into a structured move sequence.
 */
export function parseMoveString(text: string): Array<{ player: Player; cell: string }> {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Guard against massive string inputs
  if (text.length > MAX_SERIALIZED_PAYLOAD_BYTES) {
    text = text.slice(0, MAX_SERIALIZED_PAYLOAD_BYTES);
  }

  const items = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const moves: Array<{ player: Player; cell: string }> = [];

  for (const item of items) {
    if (moves.length >= MAX_MOVE_SEQUENCE_LENGTH) {
      break;
    }

    // Matches formats: "X: B2", "X:B2", "X B2", "XB2", "b2"
    const match = item.match(/^([XO])?[:\s-]*([A-Ca-c][1-3])$/i);
    if (match) {
      const playerStr = match[1]?.toUpperCase();
      const cellStr = match[2].toUpperCase();
      const player: Player =
        playerStr === 'X' || playerStr === 'O'
          ? (playerStr as Player)
          : moves.length % 2 === 0
          ? 'X'
          : 'O';
      moves.push({ player, cell: cellStr });
    }
  }

  return moves;
}

/**
 * Imports a JSON string into a verified GameState.
 */
export function importGameFromJson(jsonString: string): {
  state: GameState | null;
  userSymbol?: Player;
  errors: string[];
} {
  if (!jsonString || typeof jsonString !== 'string') {
    return { state: null, errors: ['Input is empty or not a valid string.'] };
  }

  if (jsonString.length > MAX_SERIALIZED_PAYLOAD_BYTES) {
    return {
      state: null,
      errors: [`Import payload exceeds maximum allowed size (${MAX_SERIALIZED_PAYLOAD_BYTES / 1024} KB).`],
    };
  }

  try {
    const data = JSON.parse(jsonString) as unknown;
    if (!data || typeof data !== 'object') {
      return { state: null, errors: ['Invalid JSON format: root must be an object.'] };
    }

    const payload = data as Partial<ExportedGameData>;

    if (!payload.moves || !Array.isArray(payload.moves)) {
      return { state: null, errors: ['Invalid JSON format: missing or invalid "moves" array.'] };
    }

    if (payload.moves.length > MAX_MOVE_SEQUENCE_LENGTH) {
      return {
        state: null,
        errors: [`Game history exceeds maximum allowed limit (${MAX_MOVE_SEQUENCE_LENGTH} moves).`],
      };
    }

    const safeStartingPlayer: Player | undefined =
      payload.startingPlayer === 'X' || payload.startingPlayer === 'O'
        ? payload.startingPlayer
        : undefined;

    const safeUserSymbol: Player | undefined =
      payload.userSymbol === 'X' || payload.userSymbol === 'O'
        ? payload.userSymbol
        : undefined;

    const rec = reconstructFromMoves(
      payload.moves.map((m) => ({ player: m?.player, cell: m?.cell })),
      sanitizeRules(payload.rules),
      safeStartingPlayer
    );

    return {
      state: rec.state,
      userSymbol: safeUserSymbol,
      errors: rec.errors,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON';
    return { state: null, errors: [`JSON parse error: ${msg}`] };
  }
}
