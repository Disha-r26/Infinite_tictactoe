"use client";

import React from 'react';
import {
  History,
  Clock,
  ArrowRight,
  Trash2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { indexToAlgebraic } from '../engine/constants';
import { MoveRecord } from '../engine/types';

interface GameTimelineProps {
  history: MoveRecord[];
  onInspectMove?: (index: number) => void;
  inspectedIndex?: number | null;
}

export function GameTimeline({
  history,
  onInspectMove,
  inspectedIndex,
}: GameTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 text-center text-charcoal-500 text-xs">
        <History className="w-6 h-6 mx-auto mb-2 text-charcoal-600" />
        No moves recorded yet. Make a move on the board to start the game timeline.
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-charcoal-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
            Game Timeline & Expirations
          </h2>
        </div>
        <span className="text-[11px] font-mono text-charcoal-500">
          {history.length} ply{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {history.map((record, idx) => {
          const isInspected = inspectedIndex === idx;
          const isX = record.player === 'X';

          return (
            <div
              key={idx}
              onClick={() => onInspectMove?.(idx)}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                isInspected
                  ? 'bg-charcoal-800 border-accentIndigo'
                  : 'bg-charcoal-900 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-charcoal-500 text-[11px] w-5">
                  #{record.moveNumber}
                </span>

                <span
                  className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                    isX
                      ? 'bg-playerX/20 text-playerX'
                      : 'bg-playerO/20 text-playerO'
                  }`}
                >
                  {record.player}
                </span>

                <span className="font-mono font-bold text-slate-100">
                  {record.algebraic}
                </span>

                {record.expiredCell !== null && (
                  <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    expired {indexToAlgebraic(record.expiredCell)}
                  </span>
                )}
              </div>

              {onInspectMove && (
                <button
                  title="Inspect board state at this move"
                  className="text-charcoal-500 hover:text-slate-300 p-1 rounded"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
