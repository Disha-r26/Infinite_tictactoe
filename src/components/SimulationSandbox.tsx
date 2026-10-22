"use client";

import React from 'react';
import {
  Layers,
  X,
  ArrowRight,
  Sparkles,
  Info,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { indexToAlgebraic, indexToCoordinateName } from '../engine/constants';
import { applyMove } from '../engine/state';
import { CandidateAnalysis, CellIndex, GameState, Player } from '../engine/types';

interface SimulationSandboxProps {
  realState: GameState;
  candidate: CandidateAnalysis;
  onClose: () => void;
  onCommitMove: (cell: CellIndex) => void;
}

export function SimulationSandbox({
  realState,
  candidate,
  onClose,
  onCommitMove,
}: SimulationSandboxProps) {
  // Simulate applying this candidate move
  let simulatedState: GameState | null = null;
  let opponentSimState: GameState | null = null;

  try {
    simulatedState = applyMove(realState, candidate.cell);
    if (
      candidate.opponentBestResponse !== null &&
      simulatedState.status === 'in_progress'
    ) {
      opponentSimState = applyMove(simulatedState, candidate.opponentBestResponse);
    }
  } catch (e) {
    // handled gracefully
  }

  const activePlayer = realState.turn;
  const oppPlayer: Player = activePlayer === 'X' ? 'O' : 'X';

  return (
    <div className="p-5 rounded-2xl bg-charcoal-850 border-2 border-accentIndigo shadow-2xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accentIndigo/20 text-accentIndigo-light">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-accentIndigo-light font-mono">
              Hypothetical Simulation Sandbox
            </h2>
            <p className="text-[11px] text-charcoal-400">
              Exploring simulated consequence of playing{' '}
              <strong className="text-slate-100">{candidate.algebraic}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-charcoal-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Simulated Outcomes */}
      <div className="space-y-3 text-xs">
        <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Immediate Effect on Mark Queue:
            </span>
            <span className="font-mono text-playerX font-bold">
              +{candidate.algebraic}
              {candidate.willExpireAlgebraic ? ` (-${candidate.willExpireAlgebraic})` : ''}
            </span>
          </div>
          <p className="text-charcoal-400 leading-relaxed">
            {candidate.markAgeConsequence}
          </p>
        </div>

        {candidate.opponentBestResponseAlgebraic && (
          <div className="p-3.5 rounded-xl bg-charcoal-900 border border-charcoal-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                Opponent ({oppPlayer}) Best Searched Response:
              </span>
              <span className="font-mono text-playerO font-bold bg-playerO/10 px-2 py-0.5 rounded border border-playerO/30">
                {candidate.opponentBestResponseAlgebraic}
              </span>
            </div>
            <p className="text-charcoal-400 leading-relaxed">
              If {activePlayer} plays {candidate.algebraic}, opponent {oppPlayer} will counter at{' '}
              {candidate.opponentBestResponseAlgebraic} to prevent further disadvantage.
            </p>
          </div>
        )}

        {/* PV Sequence */}
        {candidate.pvAlgebraic.length > 1 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal-400">
              Continuation Trajectory (Depth {candidate.depthReached}):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2.5 rounded-lg bg-charcoal-900 border border-charcoal-750 text-xs font-mono">
              {candidate.pvAlgebraic.map((alg, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-charcoal-600 shrink-0" />}
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      i % 2 === 0
                        ? 'bg-playerX/20 text-playerX border border-playerX/30'
                        : 'bg-playerO/20 text-playerO border border-playerO/30'
                    }`}
                  >
                    {alg}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commit or dismiss */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2 px-3 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-charcoal-700 text-slate-300 text-xs font-medium transition-colors"
        >
          Exit Simulation
        </button>

        <button
          onClick={() => {
            onCommitMove(candidate.cell);
            onClose();
          }}
          className="flex-1 py-2 px-3 rounded-lg bg-playerX hover:bg-playerX-light text-charcoal-950 text-xs font-bold shadow-lg shadow-playerX/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <span>Commit {candidate.algebraic} to Real Game</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
