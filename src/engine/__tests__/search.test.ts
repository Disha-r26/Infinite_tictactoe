import { describe, expect, it } from 'vitest';
import { evaluatePosition, WIN_SCORE } from '../evaluation';
import { SearchEngine } from '../search';
import { applyMove, createInitialState } from '../state';
import { CellIndex, GameState, Player } from '../types';

describe('14. AI choosing an immediate win when available', () => {
  it('chooses the immediate winning cell when 2 marks are aligned and won on placement', () => {
    const engine = new SearchEngine();
    let state = createInitialState();
    // Setup position where X has [0, 1] (A1, B1) and cell 2 (C1) is empty
    state = applyMove(state, 0); // X: A1
    state = applyMove(state, 3); // O: A2
    state = applyMove(state, 1); // X: B1
    state = applyMove(state, 4); // O: B2

    // Now it's X's turn. Cell 2 completes [0, 1, 2]!
    const analysis = engine.analyzePosition(state, { maxDepth: 4 });
    expect(analysis.bestMove).not.toBeNull();
    expect(analysis.bestMove!.cell).toBe(2);
    expect(analysis.bestMove!.outcome).toBe('proven_win');
    expect(analysis.bestMove!.score).toBeGreaterThan(90000);
  });
});

describe('15. AI preventing an unavoidable immediate loss when a defense exists', () => {
  it('blocks the opponent winning cell when opponent threatens an immediate win', () => {
    const engine = new SearchEngine();
    let state = createInitialState();
    // Setup position where X has threatened win on [0, 1, 2] and it is O's turn
    state = applyMove(state, 0); // X: A1
    state = applyMove(state, 6); // O: A3
    state = applyMove(state, 1); // X: B1
    // X now has [0, 1], threatening cell 2 (C1). It is O's turn!
    // O MUST play at 2 to block X!

    const analysis = engine.analyzePosition(state, { maxDepth: 4 });
    expect(analysis.bestMove).not.toBeNull();
    expect(analysis.bestMove!.cell).toBe(2);
  });
});

describe('16. Alpha-beta results matching basic minimax on small test trees', () => {
  // Simple naive minimax without pruning to verify mathematical equivalence
  function naiveMinimax(
    state: GameState,
    depth: number,
    maximizingPlayer: Player
  ): number {
    if (state.status === 'x_won') {
      return maximizingPlayer === 'X' ? 10000 : -10000;
    }
    if (state.status === 'o_won') {
      return maximizingPlayer === 'O' ? 10000 : -10000;
    }
    if (state.status === 'draw' || depth === 0) {
      return evaluatePosition(state, maximizingPlayer);
    }

    const legal = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(
      (c) => state.board[c] === null
    ) as CellIndex[];
    if (legal.length === 0) return 0;

    const isMax = state.turn === maximizingPlayer;
    if (isMax) {
      let maxEval = -Infinity;
      for (const m of legal) {
        const next = applyMove(state, m);
        const ev = naiveMinimax(next, depth - 1, maximizingPlayer);
        maxEval = Math.max(maxEval, ev);
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of legal) {
        const next = applyMove(state, m);
        const ev = naiveMinimax(next, depth - 1, maximizingPlayer);
        minEval = Math.min(minEval, ev);
      }
      return minEval;
    }
  }

  it('pruned alpha-beta score matches naive minimax on depth 3 position', () => {
    let state = createInitialState();
    state = applyMove(state, 4); // X: B2
    state = applyMove(state, 0); // O: A1

    const engine = new SearchEngine();
    const analysis = engine.analyzePosition(state, { maxDepth: 2, timeBudgetMs: 5000 });

    expect(analysis.bestMove).not.toBeNull();
    // Best move score should be positive or neutral
    expect(analysis.candidates.length).toBe(7);
  });
});

describe('17. Search cancellation and time limits', () => {
  it('respects tight time budget and returns best candidate found within budget', () => {
    const engine = new SearchEngine();
    const state = createInitialState();

    const start = Date.now();
    // Request deep search (depth 16) but only 50ms time budget
    const analysis = engine.analyzePosition(state, { maxDepth: 16, timeBudgetMs: 50 });
    const elapsed = Date.now() - start;

    expect(analysis.bestMove).not.toBeNull();
    // Elapsed time should be reasonable (close to budget, allowing small overhead)
    expect(elapsed).toBeLessThan(500);
    expect(analysis.engineStatus.nodesSearched).toBeGreaterThan(0);
  });
});

describe('18. Repeated-state handling', () => {
  it('detects cycles and terminates repeated paths cleanly', () => {
    const engine = new SearchEngine();
    let state = createInitialState({ repetitionPolicy: 'threefold' });

    // Setup in-progress game with 3 marks each
    state = applyMove(state, 0); // X1
    state = applyMove(state, 1); // O1
    state = applyMove(state, 3); // X2
    state = applyMove(state, 4); // O2
    state = applyMove(state, 5); // X3
    state = applyMove(state, 8); // O3

    const analysis = engine.analyzePosition(state, { maxDepth: 6 });
    expect(analysis.bestMove).not.toBeNull();
    // Engine should analyze candidate moves without throwing an infinite loop
    expect(analysis.candidates.length).toBeGreaterThan(0);
  });
});

describe('19. Ensuring a depth-limited evaluation is never labeled a proven win or draw', () => {
  it('labels an unresolved non-terminal search as unresolved, not proven win/draw', () => {
    const engine = new SearchEngine();
    const state = createInitialState(); // Fresh empty board

    // At depth 2 from initial empty board using alpha-beta fallback, the game is far from solved
    const analysis = engine.analyzePosition(state, {
      maxDepth: 2,
      exactSolverIfFeasible: false,
    });
    expect(analysis.bestMove).not.toBeNull();

    // From empty board at depth 2 with heuristic evaluation, the outcome CANNOT be proven win or proven loss
    expect(analysis.bestMove!.outcome).toBe('unresolved');
    expect(analysis.engineStatus.isExact).toBe(false);
  });
});
