"use client";

import React from 'react';
import {
  Sparkles,
  Trophy,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { indexToCoordinateName } from '../engine/constants';
import { CandidateAnalysis, CellIndex, EngineStatus, Player } from '../engine/types';

interface BestMovePanelProps {
  bestMove: CandidateAnalysis | null;
  turn: Player;
  isUserTurn: boolean;
  engineStatus: EngineStatus;
  onCommitMove: (cell: CellIndex) => void;
  onSimulateMove: (candidate: CandidateAnalysis) => void;
  isSimulating: boolean;
}

export function BestMovePanel({
  bestMove,
  turn,
  isUserTurn,
  engineStatus,
  onCommitMove,
  onSimulateMove,
  isSimulating,
}: BestMovePanelProps) {
  if (!isUserTurn) {
    return (
      <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
                Awaiting Opponent's Move
              </h2>
              <p className="text-[11px] text-charcoal-500">
                Opponent ({turn}) is playing on the physical board
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
            Opponent's Turn ({turn})
          </span>
        </div>

        <div className="p-4 rounded-xl bg-charcoal-900 border border-charcoal-750 space-y-2">
          <p className="text-xs text-slate-200 leading-relaxed">
            👉 Enter the move your opponent played by clicking that square on the 3×3 grid.
          </p>
          <p className="text-[11px] text-charcoal-400">
            The AI coach will instantly analyze the updated game state and recommend your strongest response.
          </p>
        </div>

        {bestMove && (
          <div className="p-3 rounded-lg bg-charcoal-900/60 border border-charcoal-750/70 text-xs text-charcoal-400 flex items-center justify-between">
            <span>Anticipated Opponent Square:</span>
            <span className="font-mono font-bold text-amber-400">{bestMove.algebraic}</span>
          </div>
        )}
      </div>
    );
  }

  if (!bestMove) {
    return (
      <div className="p-5 rounded-xl bg-charcoal-850 border border-charcoal-750 text-center text-charcoal-400 text-xs">
        No active move recommendation available for this position.
      </div>
    );
  }

  const outcomeColors = {
    proven_win: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    proven_loss: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    proven_draw: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    unresolved: 'bg-accentIndigo/10 text-accentIndigo-light border-accentIndigo/30',
  };

  const outcomeLabels = {
    proven_win: 'PROVEN WIN',
    proven_loss: 'PROVEN LOSS',
    proven_draw: 'PROVEN DRAW',
    unresolved: 'BEST ESTIMATED MOVE — SEARCH INCOMPLETE',
  };

  const outcomeIcons = {
    proven_win: <Trophy className="w-3.5 h-3.5 text-emerald-400" />,
    proven_loss: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
    proven_draw: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    unresolved: <TrendingUp className="w-3.5 h-3.5 text-accentIndigo-light" />,
  };

  return (
    <div className="p-5 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-playerX/10 text-playerX">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
              Best Recommended Move
            </h2>
            <p className="text-[11px] text-charcoal-500">
              For {turn} {isUserTurn ? '(You)' : '(Opponent)'}
            </p>
          </div>
        </div>

        {/* Outcome Badge */}
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            outcomeColors[bestMove.outcome]
          }`}
        >
          {outcomeIcons[bestMove.outcome]}
          <span>{outcomeLabels[bestMove.outcome]}</span>
        </div>
      </div>

      {/* Recommended Square Showcase */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-750">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-charcoal-500 block">
            Target Cell
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-black font-mono text-playerX tracking-tight">
              {bestMove.algebraic}
            </span>
            <span className="text-xs text-charcoal-400 font-mono">
              {indexToCoordinateName(bestMove.cell)}
            </span>
          </div>
        </div>

        {/* Eval Score */}
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono tracking-wider text-charcoal-500 block">
            Position Score
          </span>
          <span
            className={`text-base font-bold font-mono block mt-0.5 ${
              bestMove.score > 0
                ? 'text-emerald-400'
                : bestMove.score < 0
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {bestMove.outcome === 'proven_win'
              ? `+M${Math.ceil((100000 - bestMove.score) / 2)}`
              : bestMove.outcome === 'proven_loss'
              ? `-M${Math.ceil((100000 + bestMove.score) / 2)}`
              : bestMove.score > 0
              ? `+${bestMove.score}`
              : `${bestMove.score}`}
          </span>
          <span className="text-[10px] font-mono text-charcoal-500">
            {bestMove.outcome === 'unresolved' ? 'Heuristic eval' : 'Game-theoretic'}
          </span>
        </div>
      </div>

      {/* Plain-English Tactical Explanation */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 font-mono">
          Why this move?
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed bg-charcoal-900/60 p-3 rounded-lg border border-charcoal-750/70">
          {bestMove.tacticalExplanation}
        </p>
      </div>

      {/* Warning if losing position/move */}
      {bestMove.outcome === 'proven_loss' && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-rose-300">Caution:</strong>{' '}
            This position is a forced loss under optimal opponent play. Playing this move delays defeat as long as possible.
          </div>
        </div>
      )}

      {/* Mark Age Consequence */}
      {bestMove.willExpireAlgebraic && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-amber-300">Mark Removal:</strong>{' '}
            {bestMove.markAgeConsequence}
          </div>
        </div>
      )}

      {/* Predicted Opponent Response */}
      {bestMove.opponentBestResponseAlgebraic && (
        <div className="p-2.5 rounded-lg bg-charcoal-900 border border-charcoal-750 text-xs flex items-center justify-between">
          <span className="text-charcoal-400 font-mono">Predicted Opponent Response:</span>
          <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            {bestMove.opponentBestResponseAlgebraic}
          </span>
        </div>
      )}

      {/* Principal Variation (Engine PV line) */}
      {bestMove.pvAlgebraic.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-400">
            <span className="font-bold uppercase tracking-wider">Strongest Line (PV)</span>
            <span>Depth {engineStatus.searchDepth}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 rounded-lg bg-charcoal-900 border border-charcoal-750 text-xs font-mono">
            {bestMove.pvAlgebraic.map((alg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-charcoal-600 shrink-0" />}
                <span
                  className={`px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    idx === 0
                      ? 'bg-playerX/20 text-playerX border border-playerX/40'
                      : idx % 2 === 1
                      ? 'bg-playerO/15 text-playerO'
                      : 'bg-playerX/15 text-playerX'
                  }`}
                >
                  {alg}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Commit Move & What-if Simulation */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onSimulateMove(bestMove)}
          className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
            isSimulating
              ? 'bg-accentIndigo text-white border-accentIndigo-light shadow-md shadow-accentIndigo/30'
              : 'bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 border-charcoal-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isSimulating ? 'Simulating' : 'Simulate Line'}</span>
        </button>

        <button
          onClick={() => onCommitMove(bestMove.cell)}
          className="py-2 px-3 rounded-lg text-xs font-bold bg-playerX hover:bg-playerX-light text-charcoal-950 flex items-center justify-center gap-1.5 shadow-lg shadow-playerX/20 transition-all"
        >
          <span>Play {bestMove.algebraic}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
