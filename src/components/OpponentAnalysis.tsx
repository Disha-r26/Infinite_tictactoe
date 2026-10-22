"use client";

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Info,
} from 'lucide-react';
import { CandidateAnalysis, Player } from '../engine/types';

interface OpponentAnalysisProps {
  bestMove: CandidateAnalysis | null;
  activePlayer: Player;
}

export function OpponentAnalysis({
  bestMove,
  activePlayer,
}: OpponentAnalysisProps) {
  if (!bestMove) return null;

  const opponent: Player = activePlayer === 'X' ? 'O' : 'X';
  const predictedResponse = bestMove.opponentBestResponseAlgebraic;
  const isForced = bestMove.outcome === 'proven_win' || bestMove.outcome === 'proven_loss';

  return (
    <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-playerO/10 text-playerO">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
              Opponent Counter-Play Analysis
            </h2>
            <p className="text-[11px] text-charcoal-500">
              Anticipating Player {opponent}'s strongest replies
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isForced
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
              : 'bg-charcoal-750 text-charcoal-400 border-charcoal-700 font-semibold'
          }`}
        >
          {isForced ? 'Forced Line' : 'Estimated Response'}
        </span>
      </div>

      {predictedResponse ? (
        <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-charcoal-400">
              Predicted Opponent Reply to {bestMove.algebraic}:
            </span>
            <span className="text-base font-black font-mono text-playerO bg-playerO/10 px-2 py-0.5 rounded border border-playerO/30">
              {predictedResponse}
            </span>
          </div>

          <p className="text-xs text-charcoal-300 leading-relaxed">
            If you play <strong className="text-playerX">{bestMove.algebraic}</strong>, the adversarial game tree predicts {opponent} will counter at <strong className="text-playerO">{predictedResponse}</strong> to neutralize immediate line pressure.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-750 text-xs text-emerald-400 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            {bestMove.outcome === 'proven_win'
              ? 'No viable opponent counter-play exists! Move immediately concludes the game.'
              : 'Opponent has no legal replies remaining.'}
          </span>
        </div>
      )}

      {/* Threats created or blocked summary */}
      <div className="space-y-1.5 text-xs">
        {bestMove.threatsNeutralized.length > 0 && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Defensive Impact:</strong> {bestMove.threatsNeutralized.join(', ')}
            </div>
          </div>
        )}

        {bestMove.threatsCreated.length > 0 && (
          <div className="p-2.5 rounded-lg bg-playerX/10 border border-playerX/20 text-playerX-light flex items-start gap-2">
            <Crosshair className="w-4 h-4 text-playerX shrink-0 mt-0.5" />
            <div>
              <strong>Offensive Pressure:</strong> {bestMove.threatsCreated.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
