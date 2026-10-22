import { AlgebraicCell, CellIndex, GameRules } from './types';

export const DEFAULT_RULES: GameRules = {
  winCheckTiming: 'after_removal',
  canReoccupyExpiringCell: false,
  repetitionPolicy: 'threefold',
  maxMovesLimit: 60,
};

export const ALGEBRAIC_TO_INDEX: Record<AlgebraicCell, CellIndex> = {
  A1: 0, B1: 1, C1: 2,
  A2: 3, B2: 4, C2: 5,
  A3: 6, B3: 7, C3: 8,
};

export const INDEX_TO_ALGEBRAIC: Record<CellIndex, AlgebraicCell> = {
  0: 'A1', 1: 'B1', 2: 'C1',
  3: 'A2', 4: 'B2', 5: 'C2',
  6: 'A3', 7: 'B3', 8: 'C3',
};

export const ALL_CELLS: CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * 8 possible winning lines on a 3x3 board:
 * 3 rows, 3 columns, 2 diagonals
 */
export const WINNING_LINES: readonly [CellIndex, CellIndex, CellIndex][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
] as const;

export const WINNING_LINE_NAMES: Record<number, string> = {
  0: 'Top row (A1-B1-C1)',
  1: 'Middle row (A2-B2-C2)',
  2: 'Bottom row (A3-B3-C3)',
  3: 'Left column (A1-A2-A3)',
  4: 'Center column (B1-B2-B3)',
  5: 'Right column (C1-C2-C3)',
  6: 'Main diagonal (A1-B2-C3)',
  7: 'Anti-diagonal (C1-B2-A3)',
};

export function indexToAlgebraic(index: CellIndex): AlgebraicCell {
  return INDEX_TO_ALGEBRAIC[index];
}

export function algebraicToIndex(alg: string): CellIndex | null {
  const upper = alg.trim().toUpperCase() as AlgebraicCell;
  if (upper in ALGEBRAIC_TO_INDEX) {
    return ALGEBRAIC_TO_INDEX[upper];
  }
  return null;
}

export function indexToCoordinateName(index: CellIndex): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  const colLetter = ['A', 'B', 'C'][index % 3];
  const isCenter = index === 4;
  const isCorner = [0, 2, 6, 8].includes(index);
  const positionTag = isCenter ? 'Center' : isCorner ? 'Corner' : 'Edge';
  return `${colLetter}${row} (Row ${row}, Col ${col} • ${positionTag})`;
}

/**
 * Returns all winning lines that pass through a given cell
 */
export function getLinesForCell(cell: CellIndex): [CellIndex, CellIndex, CellIndex][] {
  return WINNING_LINES.filter((line) => line.includes(cell)) as [CellIndex, CellIndex, CellIndex][];
}
