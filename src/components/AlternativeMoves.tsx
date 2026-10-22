"use client";

import React from 'react';
import {
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Trophy,
  ShieldAlert,
} from 'lucide-react';
import { CandidateAnalysis, CellIndex } from '../engine/types';

interface AlternativeMovesProps {
  candidates: CandidateAnalysis[];
  selectedCandidate: CandidateAnalysis | null;
  onSelectCandidate: (candidate: CandidateAnalysis | null) => void;
  onCommitMove: (cell: CellIndex) => void;
}

export function AlternativeMoves({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  onCommitMove,
}: AlternativeMovesProps) {
  if (candidates.length <= 1) {
    return null;
  }

  // The 1st is the best move; alternatives are 2nd and beyond
  const alternatives = candidates.slice(1);

  return (
    <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-2.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
            Alternative Candidate Moves
          </h2>
          <p className="text-[11px] text-charcoal-500">
            {alternatives.length} other legal options ranked by adversarial value
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {alternatives.map((cand, idx) => {
          const isSelected =
            selectedCandidate !== null && selectedCandidate.cell === cand.cell;

          const isProvenLoss = cand.outcome === 'proven_loss';
          const isProvenWin = cand.outcome === 'proven_win';

          return (
            <div
              key={cand.cell}
              className={`p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-charcoal-800 border-accentIndigo shadow-md shadow-accentIndigo/20'
                  : 'bg-charcoal-900 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-charcoal-500 w-4">
                    #{idx + 2}
                  </span>
                  <span className="text-base font-black font-mono text-slate-100">
                    {cand.algebraic}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      isProvenWin
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isProvenLoss
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : cand.outcome === 'proven_draw'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-charcoal-750 text-charcoal-400 border-charcoal-700'
                    }`}
                  >
                    {isProvenWin
                      ? `PROVEN WIN (+M${Math.ceil((100000 - cand.score) / 2)})`
                      : cand.outcome === 'proven_draw'
                      ? 'PROVEN DRAW'
                      : isProvenLoss
                      ? `PROVEN LOSS (-M${Math.ceil((100000 + cand.score) / 2)})`
                      : 'BEST ESTIMATED MOVE'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onSelectCandidate(isSelected ? null : cand)
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-accentIndigo text-white border-accentIndigo'
                        : 'bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 border-charcoal-700'
                    }`}
                  >
                    {isSelected ? 'Clear' : 'Simulate'}
                  </button>

                  <button
                    onClick={() => onCommitMove(cand.cell)}
                    className="p-1 rounded-md bg-charcoal-800 hover:bg-playerX hover:text-charcoal-950 text-charcoal-400 border border-charcoal-700 transition-colors"
                    title={`Play ${cand.algebraic}`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Warning if losing mistake */}
              {isProvenLoss && (
                <div className="mt-2 p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Warning: Losing mistake — gives opponent a forced win</span>
                </div>
              )}

              {/* Tactical note */}
              <p className="text-[11px] text-charcoal-400 mt-2 leading-relaxed">
                {cand.tacticalExplanation}
              </p>

              {/* Details footer: Opponent response & Expiration */}
              <div className="mt-2 pt-2 border-t border-charcoal-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-charcoal-500 gap-2">
                {cand.opponentBestResponseAlgebraic && (
                  <span>
                    Opponent response: <strong className="text-amber-400">{cand.opponentBestResponseAlgebraic}</strong>
                  </span>
                )}
                {cand.willExpireAlgebraic && (
                  <span className="text-amber-400/80">
                    Expires: <strong className="text-amber-300">{cand.willExpireAlgebraic}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
