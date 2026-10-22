import { describe, expect, it } from 'vitest';
import { indexToAlgebraic, WINNING_LINES } from '../constants';
import {
  exportGameToJson,
  importGameFromJson,
  parseMoveString,
  reconstructFromMoves,
} from '../serializer';
import {
  applyMove,
  createInitialState,
  getExpiringMark,
  getLegalMoves,
  getStateHash,
  getStateHashFromState,
  getWinningLines,
  undoMove,
  validateState,
} from '../state';
import { CellIndex, GameRules } from '../types';

describe('1. Initial empty board', () => {
  it('creates an empty 3x3 board with X to move and empty queues', () => {
    const state = createInitialState();
    expect(state.board).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(state.turn).toBe('X');
    expect(state.xMarks).toEqual([]);
    expect(state.oMarks).toEqual([]);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.status).toBe('in_progress');
    expect(state.winner).toBeNull();
    expect(state.winningLine).toBeNull();

    const val = validateState(state);
    expect(val.valid).toBe(true);
    expect(val.errors).toHaveLength(0);
  });
});

describe('2. Legal and illegal moves', () => {
  it('all 9 cells are legal on empty board', () => {
    const state = createInitialState();
    const legal = getLegalMoves(state);
    expect(legal).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('rejects placing a mark in an already occupied cell', () => {
    let state = createInitialState();
    state = applyMove(state, 4); // X moves to B2 (4)
    expect(state.board[4]).toBe('X');

    // O cannot play on 4
    expect(() => applyMove(state, 4)).toThrow(/already occupied/i);
  });

  it('no legal moves when game is over', () => {
    // Construct a quick win for X
    let state = createInitialState();
    state = applyMove(state, 0); // X: A1
    state = applyMove(state, 3); // O: A2
    state = applyMove(state, 1); // X: B1
    state = applyMove(state, 4); // O: B2
    state = applyMove(state, 2); // X: C1 (X wins top row!)

    expect(state.status).toBe('x_won');
    expect(getLegalMoves(state)).toEqual([]);
    expect(() => applyMove(state, 5)).toThrow(/already finished/i);
  });
});

describe('3. X and O chronological queues', () => {
  it('tracks chronological order of active marks separately for X and O', () => {
    let state = createInitialState();
    state = applyMove(state, 0); // X move 1 -> A1
    state = applyMove(state, 4); // O move 1 -> B2
    state = applyMove(state, 1); // X move 2 -> B1
    state = applyMove(state, 7); // O move 2 -> B3
    state = applyMove(state, 6); // X move 3 -> A3

    expect(state.xMarks).toEqual([0, 1, 6]);
    expect(state.oMarks).toEqual([4, 7]);
  });
});

describe('4. Expiration of the oldest mark on a player’s fourth move', () => {
  it('removes oldest mark when player makes their 4th move', () => {
    let state = createInitialState();
    // X marks: 0, 1, 2 (Top row: A1, B1, C1) -> wait, to avoid winning, place 0, 1, 6
    state = applyMove(state, 0); // X1 at 0 (A1)
    state = applyMove(state, 3); // O1 at 3 (A2)
    state = applyMove(state, 1); // X2 at 1 (B1)
    state = applyMove(state, 4); // O2 at 4 (B2)
    state = applyMove(state, 6); // X3 at 6 (A3)
    state = applyMove(state, 7); // O3 at 7 (B3 - not a winning line)

    expect(state.xMarks).toEqual([0, 1, 6]);
    expect(state.board[0]).toBe('X');

    // X plays 4th move at cell 8 (C3)
    // Oldest X mark (cell 0 / A1) must disappear!
    state = applyMove(state, 8);

    expect(state.board[0]).toBeNull(); // A1 is now empty!
    expect(state.board[8]).toBe('X');
    expect(state.xMarks).toEqual([1, 6, 8]); // queue updated: oldest is now 1 (B1)
    expect(state.xMarks.length).toBe(3);
  });
});

describe('5. Correct behavior when the oldest mark is about to expire', () => {
  it('correctly reports which mark expires next via getExpiringMark', () => {
    let state = createInitialState();
    expect(getExpiringMark(state, 'X')).toBeNull();

    state = applyMove(state, 0); // X1
    state = applyMove(state, 3); // O1
    state = applyMove(state, 1); // X2
    state = applyMove(state, 4); // O2
    expect(getExpiringMark(state, 'X')).toBeNull();

    state = applyMove(state, 6); // X3
    // Now X has 3 marks: [0, 1, 6]
    // If X moves now, mark 0 (A1) will expire
    expect(getExpiringMark(state, 'X')).toBe(0);
    // O still has 2 marks: [3, 4]
    expect(getExpiringMark(state, 'O')).toBeNull();
  });
});

describe('6. All three horizontal winning lines', () => {
  it('detects top row win (0, 1, 2)', () => {
    let state = createInitialState();
    state = applyMove(state, 0); // X
    state = applyMove(state, 3); // O
    state = applyMove(state, 1); // X
    state = applyMove(state, 4); // O
    state = applyMove(state, 2); // X -> wins [0, 1, 2]

    expect(state.status).toBe('x_won');
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  it('detects middle row win (3, 4, 5)', () => {
    let state = createInitialState();
    state = applyMove(state, 3); // X
    state = applyMove(state, 0); // O
    state = applyMove(state, 4); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 5); // X -> wins [3, 4, 5]

    expect(state.status).toBe('x_won');
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([3, 4, 5]);
  });

  it('detects bottom row win (6, 7, 8)', () => {
    let state = createInitialState();
    state = applyMove(state, 6); // X
    state = applyMove(state, 0); // O
    state = applyMove(state, 7); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 8); // X -> wins [6, 7, 8]

    expect(state.status).toBe('x_won');
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([6, 7, 8]);
  });
});

describe('7. All three vertical winning lines', () => {
  it('detects left column win (0, 3, 6)', () => {
    let state = createInitialState();
    state = applyMove(state, 0); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 3); // X
    state = applyMove(state, 2); // O
    state = applyMove(state, 6); // X -> wins [0, 3, 6]

    expect(state.status).toBe('x_won');
    expect(state.winningLine).toEqual([0, 3, 6]);
  });

  it('detects center column win (1, 4, 7)', () => {
    let state = createInitialState();
    state = applyMove(state, 1); // X
    state = applyMove(state, 0); // O
    state = applyMove(state, 4); // X
    state = applyMove(state, 2); // O
    state = applyMove(state, 7); // X -> wins [1, 4, 7]

    expect(state.status).toBe('x_won');
    expect(state.winningLine).toEqual([1, 4, 7]);
  });

  it('detects right column win (2, 5, 8)', () => {
    let state = createInitialState();
    state = applyMove(state, 2); // X
    state = applyMove(state, 0); // O
    state = applyMove(state, 5); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 8); // X -> wins [2, 5, 8]

    expect(state.status).toBe('x_won');
    expect(state.winningLine).toEqual([2, 5, 8]);
  });
});

describe('8. Both diagonal winning lines', () => {
  it('detects main diagonal win (0, 4, 8)', () => {
    let state = createInitialState();
    state = applyMove(state, 0); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 4); // X
    state = applyMove(state, 2); // O
    state = applyMove(state, 8); // X -> wins [0, 4, 8]

    expect(state.status).toBe('x_won');
    expect(state.winningLine).toEqual([0, 4, 8]);
  });

  it('detects anti-diagonal win (2, 4, 6)', () => {
    let state = createInitialState();
    state = applyMove(state, 2); // X
    state = applyMove(state, 0); // O
    state = applyMove(state, 4); // X
    state = applyMove(state, 1); // O
    state = applyMove(state, 6); // X -> wins [2, 4, 6]

    expect(state.status).toBe('x_won');
    expect(state.winningLine).toEqual([2, 4, 6]);
  });
});

describe('9. Win detection at the correct point in the transition', () => {
  it('under default rule (after_removal), win is NOT formed if expiring mark was part of line', () => {
    // Suppose X has marks at 0, 1, 6.
    // 0 is oldest.
    // X plays at 2 (C1).
    // If win checked BEFORE removal, [0, 1, 2] is a row!
    // But under AFTER_REMOVAL rule, 0 is removed first, so surviving marks are [1, 6, 2], which is NOT a win!
    let state = createInitialState({ winCheckTiming: 'after_removal' });
    state = applyMove(state, 0); // X1 (oldest)
    state = applyMove(state, 3); // O1
    state = applyMove(state, 1); // X2
    state = applyMove(state, 4); // O2
    state = applyMove(state, 6); // X3
    state = applyMove(state, 7); // O3

    // X plays 4th move at 2
    state = applyMove(state, 2);

    // Oldest mark (0) was removed. Surviving X marks: [1, 6, 2]
    expect(state.status).toBe('in_progress');
    expect(state.winner).toBeNull();
    expect(state.board[0]).toBeNull();
    expect(state.board[2]).toBe('X');
  });

  it('under before_removal rule variation, detects win before oldest mark expires', () => {
    let state = createInitialState({ winCheckTiming: 'before_removal' });
    state = applyMove(state, 0); // X1
    state = applyMove(state, 3); // O1
    state = applyMove(state, 1); // X2
    state = applyMove(state, 4); // O2
    state = applyMove(state, 6); // X3
    state = applyMove(state, 7); // O3

    // X plays 4th move at 2
    state = applyMove(state, 2);

    // Formed [0, 1, 2] before removal!
    expect(state.status).toBe('x_won');
    expect(state.winner).toBe('X');
  });
});

describe('10. Undo restoring the exact previous state', () => {
  it('undo restores exact board, turn, queues, and status', () => {
    let state = createInitialState();
    state = applyMove(state, 4); // X: B2
    state = applyMove(state, 0); // O: A1
    state = applyMove(state, 2); // X: C1

    const stateBeforeLastMove = { ...state };
    const hashBeforeLastMove = getStateHashFromState(state);

    state = applyMove(state, 8); // O: C3

    const undone = undoMove(state);
    expect(getStateHashFromState(undone)).toBe(hashBeforeLastMove);
    expect(undone.board).toEqual(stateBeforeLastMove.board);
    expect(undone.xMarks).toEqual(stateBeforeLastMove.xMarks);
    expect(undone.oMarks).toEqual(stateBeforeLastMove.oMarks);
    expect(undone.turn).toBe(stateBeforeLastMove.turn);
    expect(undone.moveHistory.length).toBe(stateBeforeLastMove.moveHistory.length);
  });
});

describe('11. Reconstruction from a valid history', () => {
  it('reconstructs state accurately from move sequence', () => {
    const rawMoves = [
      { player: 'X' as const, cell: 'B2' },
      { player: 'O' as const, cell: 'A1' },
      { player: 'X' as const, cell: 'C1' },
    ];
    const res = reconstructFromMoves(rawMoves);
    expect(res.errors).toHaveLength(0);
    expect(res.state).not.toBeNull();
    expect(res.state!.board[4]).toBe('X');
    expect(res.state!.board[0]).toBe('O');
    expect(res.state!.board[2]).toBe('X');
    expect(res.state!.turn).toBe('O');
  });
});

describe('12. Rejection of invalid histories', () => {
  it('rejects history with illegal move into occupied square', () => {
    const rawMoves = [
      { player: 'X' as const, cell: 'B2' },
      { player: 'O' as const, cell: 'B2' }, // illegal!
    ];
    const res = reconstructFromMoves(rawMoves);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toMatch(/already occupied/i);
    expect(res.state).toBeNull();
  });

  it('rejects history with wrong player turn sequence', () => {
    const rawMoves = [
      { player: 'X' as const, cell: 'B2' },
      { player: 'X' as const, cell: 'A1' }, // wrong turn!
    ];
    const res = reconstructFromMoves(rawMoves);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toMatch(/Expected player O/i);
    expect(res.state).toBeNull();
  });
});

describe('13. Distinguishing states with identical visible boards but different mark ages', () => {
  it('generates different state hashes when visible board is identical but mark ages differ', () => {
    // Both positions have X at 0, 1, 2.
    // In Position 1: order is [0, 1, 2] -> 0 will expire next.
    // In Position 2: order is [2, 1, 0] -> 2 will expire next.
    const hash1 = getStateHash('X', [0, 1, 2], [3, 4, 5]);
    const hash2 = getStateHash('X', [2, 1, 0], [3, 4, 5]);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toBe('X|X:0,1,2|O:3,4,5');
    expect(hash2).toBe('X|X:2,1,0|O:3,4,5');
  });
});

describe('20. End-to-end gameplay across multiple expiration cycles', () => {
  it('simulates 12 moves with both players cycling through multiple mark expirations', () => {
    let state = createInitialState();
    // Move 1-6 (initial placement of 3 marks each)
    state = applyMove(state, 0); // X1 (0)
    state = applyMove(state, 1); // O1 (1)
    state = applyMove(state, 3); // X2 (3)
    state = applyMove(state, 4); // O2 (4)
    state = applyMove(state, 5); // X3 (5)
    state = applyMove(state, 8); // O3 (8)

    // X marks: [0, 3, 5], O marks: [1, 4, 8]
    expect(state.xMarks).toEqual([0, 3, 5]);
    expect(state.oMarks).toEqual([1, 4, 8]);

    // Move 7: X plays 6 (A3). Oldest X mark (0) expires!
    state = applyMove(state, 6);
    expect(state.board[0]).toBeNull();
    expect(state.xMarks).toEqual([3, 5, 6]);

    // Move 8: O plays 2 (C1). Oldest O mark (1) expires!
    state = applyMove(state, 2);
    expect(state.board[1]).toBeNull();
    expect(state.oMarks).toEqual([4, 8, 2]);

    // Move 9: X plays 7 (B3). Oldest X mark (3) expires!
    state = applyMove(state, 7);
    expect(state.board[3]).toBeNull();
    expect(state.xMarks).toEqual([5, 6, 7]);

    // Move 10: O plays 0 (A1). Oldest O mark (4) expires!
    state = applyMove(state, 0);
    expect(state.board[4]).toBeNull();
    expect(state.oMarks).toEqual([8, 2, 0]);

    // Move 11: X plays 3 (A2). Oldest X mark (5) expires!
    state = applyMove(state, 3);
    expect(state.board[5]).toBeNull();
    expect(state.xMarks).toEqual([6, 7, 3]);

    // Move 12: O plays 4 (B2). Oldest O mark (8) expires!
    state = applyMove(state, 4);
    expect(state.board[8]).toBeNull();
    expect(state.oMarks).toEqual([2, 0, 4]);

    expect(state.moveHistory).toHaveLength(12);
    const val = validateState(state);
    expect(val.valid).toBe(true);
    expect(state.status).toBe('in_progress');
  });
});
