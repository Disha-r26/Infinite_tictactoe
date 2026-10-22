"use client";

import React, { useState } from 'react';
import {
  ALL_CELLS,
  indexToAlgebraic,
  indexToCoordinateName,
} from '../engine/constants';
import { getExpiringMark, getLegalMoves } from '../engine/state';
import {
  CandidateAnalysis,
  CellIndex,
  GameState,
  Player,
} from '../engine/types';

interface BoardProps {
  state: GameState;
  recommendedMove: CandidateAnalysis | null;
  selectedCandidate: CandidateAnalysis | null;
  onCellClick: (cell: CellIndex) => void;
  onCellHover?: (cell: CellIndex | null) => void;
  disabled?: boolean;
}

export function Board({
  state,
  recommendedMove,
  selectedCandidate,
  onCellClick,
  onCellHover,
  disabled = false,
}: BoardProps) {
  const [hoveredCell, setHoveredCell] = useState<CellIndex | null>(null);

  const legalMoves = getLegalMoves(state);
  const legalSet = new Set(legalMoves);

  const currentTurn = state.turn;
  const currentTurnMarks = currentTurn === 'X' ? state.xMarks : state.oMarks;
  const willExpireCell = getExpiringMark(state, currentTurn);

  // Active preview move is either explicitly selected candidate or hovered empty cell
  const previewCell: CellIndex | null =
    selectedCandidate !== null
      ? selectedCandidate.cell
      : hoveredCell !== null && legalSet.has(hoveredCell)
      ? hoveredCell
      : null;

  // The mark that will vanish if the previewed move is played
  const previewExpiringCell: CellIndex | null =
    previewCell !== null && willExpireCell !== null ? willExpireCell : null;

  const handleMouseEnter = (cell: CellIndex) => {
    if (disabled || state.status !== 'in_progress') return;
    setHoveredCell(cell);
    onCellHover?.(cell);
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    onCellHover?.(null);
  };

  /**
   * Returns age info for a cell:
   * 1 = oldest (about to vanish if 3 marks)
   * 2 = mid
   * 3 = newest
   */
  const getMarkAgeInfo = (cell: CellIndex) => {
    const isX = state.xMarks.includes(cell);
    const isO = state.oMarks.includes(cell);
    if (!isX && !isO) return null;

    const queue = isX ? state.xMarks : state.oMarks;
    const indexInQueue = queue.indexOf(cell);
    const count = queue.length;
    const isOldest = indexInQueue === 0 && count === 3;
    const ageRank = count - indexInQueue; // 1 = newest, 2 = mid, 3 = oldest

    return {
      player: isX ? ('X' as Player) : ('O' as Player),
      isOldest,
      order: indexInQueue + 1, // 1st placed, 2nd placed, 3rd placed
      label: isOldest ? 'Oldest (Vanishes next!)' : indexInQueue === 1 ? 'Age 2' : 'Newest',
    };
  };

  return (
    <div className="flex flex-col items-center">
      {/* Board Column Coordinates (A, B, C) */}
      <div className="grid grid-cols-3 w-72 sm:w-84 md:w-96 text-center text-xs font-mono font-semibold text-charcoal-500 mb-1.5 px-4">
        <span>A</span>
        <span>B</span>
        <span>C</span>
      </div>

      <div className="relative flex">
        {/* Board Row Coordinates (1, 2, 3) */}
        <div className="flex flex-col justify-around text-xs font-mono font-semibold text-charcoal-500 mr-2 py-4">
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>

        {/* 3x3 Grid Board */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-charcoal-900 border-2 border-charcoal-800 shadow-2xl w-72 sm:w-84 md:w-96 h-72 sm:h-84 md:h-96">
          {ALL_CELLS.map((cell) => {
            const occupant = state.board[cell];
            const isLegal = legalSet.has(cell);
            const isRecommended =
              state.status === 'in_progress' &&
              recommendedMove !== null &&
              recommendedMove.cell === cell;

            const isPreviewMove = previewCell === cell && occupant === null;
            const isPreviewExpiring = previewExpiringCell === cell;
            const ageInfo = getMarkAgeInfo(cell);

            const isWinningCell =
              state.winningLine !== null && state.winningLine.includes(cell);

            return (
              <button
                key={cell}
                disabled={disabled || (!isLegal && occupant !== null) || state.status !== 'in_progress'}
                onClick={() => onCellClick(cell)}
                onMouseEnter={() => handleMouseEnter(cell)}
                onMouseLeave={handleMouseLeave}
                title={indexToCoordinateName(cell)}
                className={`relative rounded-xl flex flex-col items-center justify-center transition-all duration-150 select-none ${
                  isWinningCell
                    ? occupant === 'X'
                      ? 'bg-playerX/20 border-2 border-playerX shadow-lg shadow-playerX/40 scale-[1.02]'
                      : 'bg-playerO/20 border-2 border-playerO shadow-lg shadow-playerO/40 scale-[1.02]'
                    : isRecommended
                    ? 'bg-charcoal-850 border-2 border-playerX recommend-glow'
                    : isPreviewExpiring
                    ? 'bg-red-500/10 border-2 border-dashed border-red-500/80 expiring-pulse'
                    : isLegal && !occupant
                    ? 'bg-charcoal-850 hover:bg-charcoal-800 border border-charcoal-750 hover:border-charcoal-600 cursor-pointer'
                    : 'bg-charcoal-850/60 border border-charcoal-800 cursor-default'
                }`}
              >
                {/* Cell Coordinate Tag (top-left) */}
                <span className="absolute top-1.5 left-2 text-[9px] font-mono text-charcoal-600 font-medium">
                  {indexToAlgebraic(cell)}
                </span>

                {/* AI Recommended Badge */}
                {isRecommended && !occupant && !isPreviewMove && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[8px] font-mono uppercase bg-playerX/20 text-playerX border border-playerX/40 font-bold">
                    Best
                  </span>
                )}

                {/* Mark Expiration Warning Tag */}
                {isPreviewExpiring && occupant !== null && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[8px] font-mono uppercase bg-red-500/30 text-red-300 border border-red-500 font-bold">
                    Vanishes
                  </span>
                )}

                {/* Render Mark (X or O) */}
                {occupant !== null ? (
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tighter ${
                        occupant === 'X' ? 'text-playerX drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'text-playerO drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                      } ${isPreviewExpiring ? 'opacity-40 line-through' : ''}`}
                    >
                      {occupant}
                    </span>

                    {/* Age Indicator Badge */}
                    {ageInfo && (
                      <div className="mt-1 flex items-center gap-1">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-semibold border ${
                            ageInfo.isOldest
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : 'bg-charcoal-750 text-charcoal-400 border-charcoal-700'
                          }`}
                        >
                          {ageInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                ) : isPreviewMove ? (
                  /* Ghost Preview Mark on Hover or Simulation */
                  <div className="flex flex-col items-center opacity-70">
                    <span
                      className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tighter animate-pulse ${
                        currentTurn === 'X' ? 'text-playerX/60' : 'text-playerO/60'
                      }`}
                    >
                      {currentTurn}
                    </span>
                    <span className="text-[9px] font-mono text-charcoal-400 mt-1">
                      (Preview)
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expiration Note Footer */}
      <div className="mt-3 text-center text-xs text-charcoal-400 max-w-sm">
        {willExpireCell !== null ? (
          <span className="text-amber-400/90 font-medium">
            ⚠️ Player {currentTurn} already has 3 marks. Placing next mark will immediately remove oldest mark at{' '}
            <strong className="text-slate-200 underline">{indexToAlgebraic(willExpireCell)}</strong>.
          </span>
        ) : (
          <span className="text-charcoal-500">
            Player {currentTurn} has {currentTurnMarks.length}/3 marks placed. No marks expire yet.
          </span>
        )}
      </div>
    </div>
  );
}
