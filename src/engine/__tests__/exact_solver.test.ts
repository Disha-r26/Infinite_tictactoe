import { describe, expect, it } from 'vitest';
import { WINNING_LINES } from '../constants';
import { queryExactState, solvePositionExact } from '../exactSolver';
import { applyMove, createInitialState } from '../state';
import { CellIndex, GameState, Player } from '../types';

describe('Exact Game-Theoretic Retrograde Solver', () => {
  describe('Root Position Game-Theoretic Truth', () => {
    it('proves that the first player (X) has a forced win in 13 plies from the empty board', () => {
      const state = createInitialState(undefined, 'X');
      const analysis = solvePositionExact(state);

      expect(analysis).not.toBeNull();
      expect(analysis!.bestMove).not.toBeNull();
      expect(analysis!.positionEvaluation.overallOutcome).toBe('proven_win');

      // The forced winning moves from the start are the edge cells: 1 (B1), 3 (A2), 5 (C2), 7 (B3)
      const edgeCells = [1, 3, 5, 7];
      expect(edgeCells).toContain(analysis!.bestMove!.cell);
      expect(analysis!.bestMove!.outcome).toBe('proven_win');

      // Center move (B2, cell 4) must be proven DRAW (cannot force a win)
      const centerCandidate = analysis!.candidates.find((c) => c.cell === 4);
      expect(centerCandidate).toBeDefined();
      expect(centerCandidate!.outcome).toBe('proven_draw');
    });

    it('proves that when O starts first, O also has a forced win in 13 plies from the empty board', () => {
      const state = createInitialState(undefined, 'O');
      const analysis = solvePositionExact(state);

      expect(analysis).not.toBeNull();
      expect(analysis!.bestMove).not.toBeNull();
      expect(analysis!.positionEvaluation.overallOutcome).toBe('proven_win');

      const edgeCells = [1, 3, 5, 7];
      expect(edgeCells).toContain(analysis!.bestMove!.cell);
      expect(analysis!.bestMove!.outcome).toBe('proven_win');

      // Center move (B2, cell 4) is also proven DRAW for O
      const centerCandidate = analysis!.candidates.find((c) => c.cell === 4);
      expect(centerCandidate).toBeDefined();
      expect(centerCandidate!.outcome).toBe('proven_draw');
    });
  });

  describe('Regression: Root-Cause Investigation of AI Failure', () => {
    it('explains why previous heuristic failed: center B2 (cell 4) gives up the win to a draw', () => {
      // In traditional Tic-Tac-Toe, center (cell 4) is strongest.
      // But in Infinite Tic-Tac-Toe, after 1. B2, opponent can guarantee a DRAW with corner responses!
      let state = createInitialState(undefined, 'X');
      state = applyMove(state, 4); // X plays center B2

      // Now query exact state for O's response:
      const tbEntry = queryExactState('O', state.xMarks, state.oMarks);
      expect(tbEntry).not.toBeNull();
      // O can guarantee at least a DRAW against B2
      expect(tbEntry!.outcome).toBe('proven_draw');

      // If O plays corner cell 0 (A1):
      const stateAfterA1 = applyMove(state, 0);
      const xResponse = queryExactState('X', stateAfterA1.xMarks, stateAfterA1.oMarks);
      expect(xResponse!.outcome).toBe('proven_draw'); // X can no longer force a win!
    });
  });

  describe('Exhaustive Winning Line Verification (All 8 Lines for Both Players)', () => {
    const lineDescriptions = [
      'Row 1 [0, 1, 2] (A1-B1-C1)',
      'Row 2 [3, 4, 5] (A2-B2-C2)',
      'Row 3 [6, 7, 8] (A3-B3-C3)',
      'Column 1 [0, 3, 6] (A1-A2-A3)',
      'Column 2 [1, 4, 7] (B1-B2-B3)',
      'Column 3 [2, 5, 8] (C1-C2-C3)',
      'Main Diagonal [0, 4, 8] (A1-B2-C3)',
      'Anti-Diagonal [2, 4, 6] (C1-B2-A3)',
    ];

    WINNING_LINES.forEach((line, index) => {
      it(`recognizes immediate win for X along ${lineDescriptions[index]}`, () => {
        const [c0, c1, c2] = line;
        let state = createInitialState(undefined, 'X');

        // Give X two marks on the line: c0 and c1
        // Give O marks elsewhere that don't block c2
        const otherCells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
          (c) => c !== c0 && c !== c1 && c !== c2
        );

        state = applyMove(state, c0 as CellIndex); // X
        state = applyMove(state, otherCells[0] as CellIndex); // O
        state = applyMove(state, c1 as CellIndex); // X
        state = applyMove(state, otherCells[1] as CellIndex); // O

        // Now it's X's turn, cell c2 completes the line!
        const analysis = solvePositionExact(state);
        expect(analysis).not.toBeNull();
        expect(analysis!.bestMove).not.toBeNull();
        expect(analysis!.bestMove!.cell).toBe(c2);
        expect(analysis!.bestMove!.outcome).toBe('proven_win');

        // Apply the move and verify game status is x_won
        const winState = applyMove(state, c2 as CellIndex);
        expect(winState.status).toBe('x_won');
        expect(winState.winner).toBe('X');
        expect(winState.winningLine).toEqual(line);
      });

      it(`recognizes immediate win for O along ${lineDescriptions[index]}`, () => {
        const [c0, c1, c2] = line;
        let state = createInitialState(undefined, 'O');

        const otherCells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
          (c) => c !== c0 && c !== c1 && c !== c2
        );

        state = applyMove(state, c0 as CellIndex); // O
        state = applyMove(state, otherCells[0] as CellIndex); // X
        state = applyMove(state, c1 as CellIndex); // O
        state = applyMove(state, otherCells[1] as CellIndex); // X

        // Now it's O's turn, cell c2 completes the line!
        const analysis = solvePositionExact(state);
        expect(analysis).not.toBeNull();
        expect(analysis!.bestMove).not.toBeNull();
        expect(analysis!.bestMove!.cell).toBe(c2);
        expect(analysis!.bestMove!.outcome).toBe('proven_win');

        // Apply the move and verify game status is o_won
        const winState = applyMove(state, c2 as CellIndex);
        expect(winState.status).toBe('o_won');
        expect(winState.winner).toBe('O');
        expect(winState.winningLine).toEqual(line);
      });
    });
  });

  describe('Mark Expiration Tactical Correctness', () => {
    it('verifies that when mark 4 is placed, mark 1 vanishes before win evaluation', () => {
      let state = createInitialState();
      // Sequence:
      // X: 0 (A1)
      // O: 3 (A2)
      // X: 1 (B1)
      // O: 4 (B2)
      // X: 6 (A3)
      // O: 8 (C3) -> O has [3, 4, 8], not a line!
      state = applyMove(state, 0); // X #1 at 0
      state = applyMove(state, 3); // O #1 at 3
      state = applyMove(state, 1); // X #2 at 1
      state = applyMove(state, 4); // O #2 at 4
      state = applyMove(state, 6); // X #3 at 6
      state = applyMove(state, 8); // O #3 at 8

      // X marks: [0, 1, 6]. Oldest is 0.
      // If X plays at 2 (C1), X's 4th mark:
      // Mark 0 (A1) vanishes!
      // Active marks for X become [1, 6, 2].
      // Cells 1, 6, 2 do NOT form a line: [B1, A3, C1].
      // Row 1 [0, 1, 2] is NOT formed because 0 vanished!
      const afterMove = applyMove(state, 2);
      expect(afterMove.board[0]).toBeNull(); // 0 is gone
      expect(afterMove.xMarks).toEqual([1, 6, 2]);
      expect(afterMove.status).toBe('in_progress'); // NOT x_won!
    });

    it('awards win when 4th mark forms a line with marks 2 and 3 after mark 1 vanishes', () => {
      let state = createInitialState();
      // Setup X marks at 8 (C3 - mark 1), 3 (A2 - mark 2), 4 (B2 - mark 3)
      // O marks at 0 (A1), 1 (B1), 7 (B3) -> [0, 1, 7], not a line!
      state = applyMove(state, 8); // X #1 at 8
      state = applyMove(state, 0); // O #1 at 0
      state = applyMove(state, 3); // X #2 at 3
      state = applyMove(state, 1); // O #2 at 1
      state = applyMove(state, 4); // X #3 at 4
      state = applyMove(state, 7); // O #3 at 7

      // Now X places mark #4 at 5 (C2).
      // Mark 1 at 8 vanishes!
      // New marks for X: [3, 4, 5] = Row 2 [A2, B2, C2]!
      // This forms a line, so X should win!
      const afterMove = applyMove(state, 5);
      expect(afterMove.board[8]).toBeNull(); // Mark 8 vanished
      expect(afterMove.status).toBe('x_won');
      expect(afterMove.winner).toBe('X');
      expect(afterMove.winningLine).toEqual([3, 4, 5]);
    });
  });

  describe('Candidate Move Ranking', () => {
    it('ranks PROVEN WIN before PROVEN DRAW before PROVEN LOSS', () => {
      const state = createInitialState(undefined, 'X');
      const analysis = solvePositionExact(state);
      expect(analysis).not.toBeNull();

      const candidates = analysis!.candidates;
      expect(candidates.length).toBe(9);

      // Verify strict sorting order:
      let seenDraw = false;
      let seenLoss = false;

      for (const cand of candidates) {
        if (cand.outcome === 'proven_win') {
          expect(seenDraw).toBe(false);
          expect(seenLoss).toBe(false);
        } else if (cand.outcome === 'proven_draw') {
          seenDraw = true;
          expect(seenLoss).toBe(false);
        } else if (cand.outcome === 'proven_loss') {
          seenLoss = true;
        }
      }
    });

    it('ranks fastest wins first when multiple winning moves exist', () => {
      const state = createInitialState(undefined, 'X');
      const analysis = solvePositionExact(state);
      const wins = analysis!.candidates.filter((c) => c.outcome === 'proven_win');

      for (let i = 0; i < wins.length - 1; i++) {
        expect(wins[i].score).toBeGreaterThanOrEqual(wins[i + 1].score);
      }
    });
  });
});
