"use client";

import React from 'react';
import {
  RotateCcw,
  Settings,
  Download,
  Upload,
  Play,
  RotateCw,
  Trophy,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { GameState, Player } from '../engine/types';

interface HeaderProps {
  state: GameState;
  userSymbol: Player;
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  onOpenSettings: () => void;
  onOpenExportImport: () => void;
  onOpenReconstruct: () => void;
  inputMode: 'guided' | 'reconstruct';
  onChangeInputMode: (mode: 'guided' | 'reconstruct') => void;
}

export function Header({
  state,
  userSymbol,
  onNewGame,
  onUndo,
  canUndo,
  onRedo,
  canRedo = false,
  onOpenSettings,
  onOpenExportImport,
  onOpenReconstruct,
  inputMode,
  onChangeInputMode,
}: HeaderProps) {
  const isUserTurn = state.turn === userSymbol;
  const isGameOver = state.status !== 'in_progress';

  return (
    <header className="border-b border-charcoal-800 bg-charcoal-900/90 backdrop-blur-md px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-playerX to-accentIndigo flex items-center justify-center shadow-lg shadow-playerX/20">
            <Sparkles className="w-5 h-5 text-charcoal-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Infinite Tic-Tac-Toe Analyzer
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-playerX/10 text-playerX border border-playerX/30 font-semibold">
                AI Coach
              </span>
            </div>
            <p className="text-xs text-charcoal-500">
              Game-theory adversarial tree search • 3-mark expiration dynamics
            </p>
          </div>
        </div>

        {/* Status Strip & Mode Toggle */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Turn / Game Status Badge */}
          {isGameOver ? (
            <div
              className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-2 border ${
                state.status === 'x_won'
                  ? 'bg-playerX/10 text-playerX border-playerX/30'
                  : state.status === 'o_won'
                  ? 'bg-playerO/10 text-playerO border-playerO/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>
                {state.status === 'x_won'
                  ? 'Player X Won!'
                  : state.status === 'o_won'
                  ? 'Player O Won!'
                  : 'Game Drawn (Repetition / Move Limit)'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-charcoal-850 border border-charcoal-750 text-xs">
              <span className="text-charcoal-500">To Move:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                  state.turn === 'X'
                    ? 'bg-playerX/20 text-playerX border border-playerX/40'
                    : 'bg-playerO/20 text-playerO border border-playerO/40'
                }`}
              >
                Player {state.turn}
              </span>
              <span className="text-charcoal-500 text-[11px]">
                {isUserTurn ? '(Your Turn)' : "(Opponent's Turn)"}
              </span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center bg-charcoal-850 p-0.5 rounded-lg border border-charcoal-750 text-xs font-medium">
            <button
              onClick={() => onChangeInputMode('guided')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                inputMode === 'guided'
                  ? 'bg-charcoal-700 text-slate-100 shadow-sm'
                  : 'text-charcoal-500 hover:text-slate-300'
              }`}
            >
              Mode A: Live Play
            </button>
            <button
              onClick={onOpenReconstruct}
              className={`px-2.5 py-1 rounded-md transition-all ${
                inputMode === 'reconstruct'
                  ? 'bg-charcoal-700 text-slate-100 shadow-sm'
                  : 'text-charcoal-500 hover:text-slate-300'
              }`}
            >
              Mode B: Reconstruct
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last recorded move"
            className="px-2.5 py-1.5 rounded-md bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-xs border border-charcoal-700 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo previously undone move"
              className="px-2.5 py-1.5 rounded-md bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-xs border border-charcoal-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redo</span>
            </button>
          )}

          <button
            onClick={onNewGame}
            title="Configure and start a new game"
            className="px-2.5 py-1.5 rounded-md bg-playerX/15 hover:bg-playerX/25 text-playerX font-semibold text-xs border border-playerX/30 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>

          <button
            onClick={onOpenExportImport}
            title="Export or import game history"
            className="px-2.5 py-1.5 rounded-md bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 text-xs border border-charcoal-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Configure engine depth, user symbol, and game rules"
            className="p-1.5 rounded-md bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 text-xs border border-charcoal-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
