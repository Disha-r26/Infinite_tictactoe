import { describe, expect, it } from 'vitest';
import { ALL_CELLS, DEFAULT_RULES } from '../constants';
import { applyMove, createInitialState, getLegalMoves, validateState } from '../state';
import { CellIndex, GameRules, GameState } from '../types';

describe('Game Rules Variations & State Invariant Verification', () => {
  describe('Rule Variation: canReoccupyExpiringCell', () => {
    it('disallows reoccupying expiring cell when canReoccupyExpiringCell is false (default)', () => {
      const state = createInitialState({ canReoccupyExpiringCell: false });
      // X places marks at 0, 1, 6 (oldest is 0)
      // O places marks at 3, 4, 7 (non-winning)
      let s = applyMove(state, 0); // X: A1
      s = applyMove(s, 3); // O: A2
      s = applyMove(s, 1); // X: B1
      s = applyMove(s, 4); // O: B2
      s = applyMove(s, 6); // X: A3 (X has [0, 1, 6], oldest is 0)
      s = applyMove(s, 7); // O: B3 (O has [3, 4, 7])

      expect(s.status).toBe('in_progress');
      // Cell 0 is occupied by X's oldest mark.
      // Under default rules, legal moves do not include cell 0
      const legal = getLegalMoves(s);
      expect(legal).not.toContain(0);
      expect(() => applyMove(s, 0)).toThrow(/already occupied/i);
    });

    it('allows reoccupying expiring cell when canReoccupyExpiringCell is true', () => {
      const state = createInitialState({ canReoccupyExpiringCell: true });
      let s = applyMove(state, 0); // X: A1
      s = applyMove(s, 3); // O: A2
      s = applyMove(s, 1); // X: B1
      s = applyMove(s, 4); // O: B2
      s = applyMove(s, 6); // X: A3 (X has [0, 1, 6], oldest is 0)
      s = applyMove(s, 7); // O: B3 (O has [3, 4, 7])

      expect(s.status).toBe('in_progress');
      // With recycle mode enabled, cell 0 is listed as legal for X!
      const legal = getLegalMoves(s);
      expect(legal).toContain(0);

      // X places 4th move directly on cell 0
      const next = applyMove(s, 0);
      expect(next.board[0]).toBe('X');
      expect(next.xMarks).toEqual([1, 6, 0]); // 0 is now the newest mark!
    });
  });

  describe('Rule Variation: winCheckTiming', () => {
    it('standard after_removal: does not award win if the line depended on the expired mark', () => {
      // Suppose X marks are [0, 1, 8] (A1, B1, C3). Oldest mark is 0 (A1).
      // If X places 4th mark at 2 (C1), line [0, 1, 2] would be formed,
      // but cell 0 expires! Remaining marks are [1, 8, 2], which is not a line!
      const state = createInitialState({ winCheckTiming: 'after_removal' });
      let s = applyMove(state, 0); // X: A1 (oldest)
      s = applyMove(s, 3); // O: A2
      s = applyMove(s, 1); // X: B1
      s = applyMove(s, 4); // O: B2
      s = applyMove(s, 8); // X: C3 (newest of 3)
      s = applyMove(s, 7); // O: B3 (non-winning)

      expect(s.status).toBe('in_progress');

      // X plays cell 2 (C1).
      // Cell 0 (A1) vanishes. Marks become [1, 8, 2].
      const afterMove = applyMove(s, 2);
      expect(afterMove.status).toBe('in_progress');
      expect(afterMove.winner).toBeNull();
      expect(afterMove.board[0]).toBeNull();
      expect(afterMove.board[2]).toBe('X');
    });

    it('instantaneous before_removal: awards win if 4th mark forms line before removal', () => {
      const state = createInitialState({ winCheckTiming: 'before_removal' });
      let s = applyMove(state, 0); // X: A1 (oldest)
      s = applyMove(s, 3); // O: A2
      s = applyMove(s, 1); // X: B1
      s = applyMove(s, 4); // O: B2
      s = applyMove(s, 8); // X: C3
      s = applyMove(s, 7); // O: B3 (non-winning)

      expect(s.status).toBe('in_progress');

      // X plays cell 2 (C1).
      // Under before_removal, [0, 1, 2] completes row 1 before removal!
      const afterMove = applyMove(s, 2);
      expect(afterMove.status).toBe('x_won');
      expect(afterMove.winner).toBe('X');
    });
  });

  describe('Rule Variation: Repetition and Move Limit Policies', () => {
    it('declares draw when fivefold repetition is reached under fivefold policy', () => {
      const state = createInitialState({ repetitionPolicy: 'fivefold' });
      expect(state.rules.repetitionPolicy).toBe('fivefold');
    });

    it('declares draw when maxMovesLimit is reached', () => {
      const state = createInitialState({ maxMovesLimit: 4 });
      let s = applyMove(state, 0); // 1
      s = applyMove(s, 1); // 2
      s = applyMove(s, 2); // 3
      s = applyMove(s, 3); // 4th move reaches limit!

      expect(s.status).toBe('draw');
      expect(s.winner).toBeNull();
      expect(getLegalMoves(s)).toEqual([]);
    });
  });

  describe('State Invariants and Validation Checks', () => {
    it('detects corrupted board with more than 3 marks per player', () => {
      const corrupted: GameState = {
        ...createInitialState(),
        xMarks: [0, 1, 2, 3], // 4 marks is illegal!
      };
      const check = validateState(corrupted);
      expect(check.valid).toBe(false);
      expect(check.errors.some((e) => e.includes('more than 3 active marks'))).toBe(true);
    });

    it('detects duplicate marks within a single player queue', () => {
      const corrupted: GameState = {
        ...createInitialState(),
        xMarks: [0, 1, 0],
      };
      const check = validateState(corrupted);
      expect(check.valid).toBe(false);
      expect(check.errors.some((e) => e.includes('Duplicate cells in xMarks'))).toBe(true);
    });

    it('detects overlapping cell occupation between X and O', () => {
      const corrupted: GameState = {
        ...createInitialState(),
        xMarks: [4],
        oMarks: [4],
      };
      const check = validateState(corrupted);
      expect(check.valid).toBe(false);
      expect(check.errors.some((e) => e.includes('occupied by both X and O'))).toBe(true);
    });

    it('detects mismatch between board array and active marks', () => {
      const corrupted: GameState = {
        ...createInitialState(),
        board: ['X', null, null, null, null, null, null, null, null],
        xMarks: [], // board has X at 0, but xMarks is empty!
      };
      const check = validateState(corrupted);
      expect(check.valid).toBe(false);
      expect(check.errors.some((e) => e.includes('is not in mark queues but board has X'))).toBe(true);
    });
  });
});
