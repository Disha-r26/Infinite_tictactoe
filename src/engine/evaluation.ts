import {
  ALL_CELLS,
  indexToAlgebraic,
  WINNING_LINES,
} from './constants';
import { CellIndex, GameState, Player } from './types';

export const WIN_SCORE = 100_000;
export const LOSS_SCORE = -100_000;
export const DRAW_SCORE = 0;

export interface ThreatInfo {
  line: [CellIndex, CellIndex, CellIndex];
  targetCell: CellIndex;
  existingMarks: [CellIndex, CellIndex];
  isPhantom: boolean; // Will dissolve upon next move because one mark expires
}

/**
 * Detects winning threats for a player on the board.
 * A threat exists when 2 marks occupy a winning line and the 3rd cell is empty.
 *
 * In Infinite Tic-Tac-Toe, a threat is PHANTOM if one of the 2 aligned marks
 * is the player's oldest mark that will vanish on their next move!
 */
export function detectThreats(
  marks: readonly CellIndex[],
  board: readonly (Player | null)[],
  willExpireMark: CellIndex | null
): ThreatInfo[] {
  if (marks.length < 2) return [];

  const markSet = new Set(marks);
  const threats: ThreatInfo[] = [];

  for (const line of WINNING_LINES) {
    const [c1, c2, c3] = line;
    const occupied: CellIndex[] = [];
    let emptyCell: CellIndex | null = null;

    if (markSet.has(c1)) occupied.push(c1);
    else if (board[c1] === null) emptyCell = c1;

    if (markSet.has(c2)) occupied.push(c2);
    else if (board[c2] === null) emptyCell = c2;

    if (markSet.has(c3)) occupied.push(c3);
    else if (board[c3] === null) emptyCell = c3;

    if (occupied.length === 2 && emptyCell !== null) {
      const isPhantom =
        willExpireMark !== null &&
        (occupied[0] === willExpireMark || occupied[1] === willExpireMark);

      threats.push({
        line,
        targetCell: emptyCell,
        existingMarks: [occupied[0], occupied[1]],
        isPhantom,
      });
    }
  }

  return threats;
}

/**
 * Heuristic evaluation function for non-terminal game states.
 * Evaluates from the perspective of `evaluatingPlayer`.
 * Positive score favors `evaluatingPlayer`, negative favors the opponent.
 */
export function evaluatePosition(state: GameState, evaluatingPlayer: Player): number {
  if (state.status === 'x_won') {
    return evaluatingPlayer === 'X' ? WIN_SCORE : LOSS_SCORE;
  }
  if (state.status === 'o_won') {
    return evaluatingPlayer === 'O' ? WIN_SCORE : LOSS_SCORE;
  }
  if (state.status === 'draw') {
    return DRAW_SCORE;
  }

  const p = evaluatingPlayer;
  const opp: Player = p === 'X' ? 'O' : 'X';

  const pMarks = p === 'X' ? state.xMarks : state.oMarks;
  const oppMarks = opp === 'X' ? state.xMarks : state.oMarks;

  const pExpiring = pMarks.length >= 3 ? pMarks[0] : null;
  const oppExpiring = oppMarks.length >= 3 ? oppMarks[0] : null;

  const pThreats = detectThreats(pMarks, state.board, pExpiring);
  const oppThreats = detectThreats(oppMarks, state.board, oppExpiring);

  const pRealThreats = pThreats.filter((t) => !t.isPhantom);
  const oppRealThreats = oppThreats.filter((t) => !t.isPhantom);

  let score = 0;

  // Real immediate threats
  // If it's P's turn and P has real threats, P wins immediately:
  if (state.turn === p && pRealThreats.length > 0) {
    return WIN_SCORE - 50; // 1 ply to win
  }

  // If it's Opp's turn and Opp has real threats, Opp wins immediately:
  if (state.turn === opp && oppRealThreats.length > 0) {
    return LOSS_SCORE + 50; // 1 ply to loss
  }

  // Value real threats heavily
  score += pRealThreats.length * 800;
  score -= oppRealThreats.length * 1000;

  // Double threats (forks) are almost always decisive
  if (pRealThreats.length >= 2) {
    score += 2500;
  }
  if (oppRealThreats.length >= 2) {
    score -= 3000;
  }

  // Phantom threats have minor psychological/tactical weight (+50)
  const pPhantomThreats = pThreats.filter((t) => t.isPhantom);
  const oppPhantomThreats = oppThreats.filter((t) => t.isPhantom);
  score += pPhantomThreats.length * 40;
  score -= oppPhantomThreats.length * 40;

  // Center control (Cell 4 / B2)
  // Cell 4 participates in 4 winning lines (horizontal, vertical, 2 diagonals)
  if (state.board[4] === p) {
    // If center mark is oldest and about to vanish on next turn, it's worth less
    score += pExpiring === 4 ? 20 : 70;
  } else if (state.board[4] === opp) {
    score -= oppExpiring === 4 ? 20 : 70;
  }

  // Corners (0, 2, 6, 8) participate in 3 winning lines each
  const corners: CellIndex[] = [0, 2, 6, 8];
  for (const c of corners) {
    if (state.board[c] === p) {
      score += pExpiring === c ? 10 : 30;
    } else if (state.board[c] === opp) {
      score -= oppExpiring === c ? 10 : 30;
    }
  }

  // Mark age stability:
  // If player has 3 marks, oldest will vanish on their next move.
  // Check if expiring mark was anchoring any lines.
  if (pExpiring !== null) {
    // Check if expiring mark is part of any 2-in-a-row
    for (const t of pPhantomThreats) {
      if (t.existingMarks.includes(pExpiring)) {
        score -= 60; // Penalty for imminent threat collapse
      }
    }
  }

  // Turn initiative bonus
  if (state.turn === p) {
    score += 35;
  } else {
    score -= 35;
  }

  return score;
}
