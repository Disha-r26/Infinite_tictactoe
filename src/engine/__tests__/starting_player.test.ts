import { describe, expect, it } from 'vitest';
import { SearchEngine } from '../search';
import {
  applyMove,
  createInitialState,
  getExpiringMark,
  getLegalMoves,
  undoMove,
  validateState,
} from '../state';
import { CellIndex, Player } from '../types';

describe('Starting-Player & Symbol Combinations (Section 5)', () => {
  const engine = new SearchEngine();

  describe('Test A: User plays X and starts first (User = X, Start = X)', () => {
    it('initializes game with X to move and recommends move for X', () => {
      const state = createInitialState(undefined, 'X');
      expect(state.startingPlayer).toBe('X');
      expect(state.turn).toBe('X');
      expect(state.xMarks).toEqual([]);
      expect(state.oMarks).toEqual([]);

      // AI recommends opening move for X
      const analysis = engine.analyzePosition(state, { maxDepth: 4 });
      expect(analysis.bestMove).not.toBeNull();
      // Edge moves [1, 3, 5, 7] are proven forced wins in 13 plies
      expect([1, 3, 5, 7]).toContain(analysis.bestMove!.cell);
      expect(analysis.bestMove!.outcome).toBe('proven_win');
    });

    it('processes turn-taking, queues, mark expiration, and undo correctly', () => {
      let state = createInitialState(undefined, 'X');

      // Move 1: User (X) plays 4 (B2)
      state = applyMove(state, 4);
      expect(state.board[4]).toBe('X');
      expect(state.turn).toBe('O'); // Opponent's turn
      expect(state.xMarks).toEqual([4]);

      // Move 2: Opponent (O) plays 0 (A1)
      state = applyMove(state, 0);
      expect(state.board[0]).toBe('O');
      expect(state.turn).toBe('X'); // User's turn
      expect(state.oMarks).toEqual([0]);

      // Move 3: User (X) plays 1 (B1)
      state = applyMove(state, 1);
      // Move 4: Opponent (O) plays 2 (C1)
      state = applyMove(state, 2);
      // Move 5: User (X) plays 6 (A3) -> X now has 3 marks: [4, 1, 6] (no win)
      state = applyMove(state, 6);
      // Move 6: Opponent (O) plays 8 (C3) -> O now has 3 marks: [0, 2, 8] (no win)
      state = applyMove(state, 8);

      expect(state.xMarks).toEqual([4, 1, 6]);
      expect(state.oMarks).toEqual([0, 2, 8]);
      expect(getExpiringMark(state, 'X')).toBe(4);

      // Move 7: User (X) plays 7 (B3). Oldest X mark (4 / B2) expires!
      state = applyMove(state, 7);
      expect(state.board[4]).toBeNull(); // B2 vacated
      expect(state.board[7]).toBe('X');
      expect(state.xMarks).toEqual([1, 6, 7]);

      // Test undo restoring exact state back to initial state
      let undone = state;
      for (let i = 0; i < 7; i++) {
        undone = undoMove(undone);
      }
      expect(undone.startingPlayer).toBe('X');
      expect(undone.turn).toBe('X');
      expect(undone.moveHistory).toHaveLength(0);
      expect(undone.board.every((c) => c === null)).toBe(true);
    });
  });

  describe('Test B: User plays O, Opponent plays X and starts first (User = O, Start = X)', () => {
    it('initializes game with X to move (Opponent) and turn switches to O (User) after move 1', () => {
      let state = createInitialState(undefined, 'X');
      expect(state.startingPlayer).toBe('X');
      expect(state.turn).toBe('X');

      // Opponent makes opening move as X at 4 (B2)
      state = applyMove(state, 4);
      expect(state.board[4]).toBe('X');
      expect(state.turn).toBe('O'); // User's turn!

      // AI recommends optimal response for User (O)
      const analysis = engine.analyzePosition(state, { maxDepth: 4 });
      expect(analysis.bestMove).not.toBeNull();
      // Corners are best response against center
      expect([0, 2, 6, 8]).toContain(analysis.bestMove!.cell);
    });

    it('correctly expires O marks when User (O) plays their 4th move', () => {
      let state = createInitialState(undefined, 'X');
      // Plies 1-6
      state = applyMove(state, 0); // X1 (Opponent)
      state = applyMove(state, 1); // O1 (User)
      state = applyMove(state, 3); // X2 (Opponent)
      state = applyMove(state, 4); // O2 (User)
      state = applyMove(state, 5); // X3 (Opponent)
      state = applyMove(state, 8); // O3 (User)

      expect(state.xMarks).toEqual([0, 3, 5]);
      expect(state.oMarks).toEqual([1, 4, 8]);
      expect(getExpiringMark(state, 'O')).toBe(1); // Oldest O mark is 1

      // Move 7: Opponent (X) plays 6 -> X oldest (0) expires
      state = applyMove(state, 6);
      expect(state.board[0]).toBeNull();
      expect(state.xMarks).toEqual([3, 5, 6]);
      expect(state.turn).toBe('O'); // User's turn!

      // Move 8: User (O) plays 2 -> User oldest (1) expires!
      state = applyMove(state, 2);
      expect(state.board[1]).toBeNull();
      expect(state.board[2]).toBe('O');
      expect(state.oMarks).toEqual([4, 8, 2]);

      const val = validateState(state);
      expect(val.valid).toBe(true);
    });
  });

  describe('Reverse Combination C: User plays X, Opponent plays O and starts first (User = X, Start = O)', () => {
    it('initializes game with O to move (Opponent) and switches to X (User) after move 1', () => {
      let state = createInitialState(undefined, 'O');
      expect(state.startingPlayer).toBe('O');
      expect(state.turn).toBe('O');

      // Opponent makes opening move as O at 4 (B2)
      state = applyMove(state, 4);
      expect(state.board[4]).toBe('O');
      expect(state.turn).toBe('X'); // User's turn!

      // AI recommends optimal response for User (X)
      const analysis = engine.analyzePosition(state, { maxDepth: 4 });
      expect(analysis.bestMove).not.toBeNull();
      expect([0, 2, 6, 8]).toContain(analysis.bestMove!.cell);
    });
  });

  describe('Reverse Combination D: User plays O, User starts first (User = O, Start = O)', () => {
    it('initializes game with O to move (User) and recommends opening move for O', () => {
      let state = createInitialState(undefined, 'O');
      expect(state.startingPlayer).toBe('O');
      expect(state.turn).toBe('O'); // User starts as O!

      // AI recommends opening move for O
      const analysis = engine.analyzePosition(state, { maxDepth: 4 });
      expect(analysis.bestMove).not.toBeNull();
      // Edge moves [1, 3, 5, 7] are proven forced wins in 13 plies
      expect([1, 3, 5, 7]).toContain(analysis.bestMove!.cell);
      expect(analysis.bestMove!.outcome).toBe('proven_win');

      // User (O) plays recommended move
      const chosenMove = analysis.bestMove!.cell;
      state = applyMove(state, chosenMove);
      expect(state.board[chosenMove]).toBe('O');
      expect(state.turn).toBe('X'); // Opponent's turn

      // Opponent (X) plays 0
      state = applyMove(state, 0);
      expect(state.board[0]).toBe('X');
      expect(state.turn).toBe('O'); // Back to User!
    });
  });
});
