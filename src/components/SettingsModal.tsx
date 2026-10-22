"use client";

import React from 'react';
import {
  X,
  Settings,
  Sliders,
  Shield,
  HelpCircle,
  Save,
} from 'lucide-react';
import { GameRules, Player, SearchOptions } from '../engine/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSymbol: Player;
  onChangeUserSymbol: (symbol: Player) => void;
  startingPlayer: Player;
  onChangeStartingPlayer: (player: Player) => void;
  rules: GameRules;
  onChangeRules: (newRules: GameRules) => void;
  searchOptions: SearchOptions;
  onChangeSearchOptions: (options: SearchOptions) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userSymbol,
  onChangeUserSymbol,
  startingPlayer,
  onChangeStartingPlayer,
  rules,
  onChangeRules,
  searchOptions,
  onChangeSearchOptions,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-charcoal-900 border border-charcoal-750 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accentIndigo-light" />
            <h2 className="text-base font-bold text-slate-100">
              Analysis & Rule Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-charcoal-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Player Configuration */}
          <div className="p-3.5 rounded-xl bg-charcoal-850 border border-charcoal-750 space-y-3">
            <h3 className="font-bold font-mono uppercase tracking-wider text-charcoal-300">
              Player Setup
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-charcoal-400 block mb-1">Your Symbol:</label>
                <div className="flex rounded-lg bg-charcoal-900 p-0.5 border border-charcoal-750 font-mono font-bold">
                  <button
                    onClick={() => onChangeUserSymbol('X')}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      userSymbol === 'X'
                        ? 'bg-playerX/20 text-playerX border border-playerX/40'
                        : 'text-charcoal-500 hover:text-slate-300'
                    }`}
                  >
                    Play as X
                  </button>
                  <button
                    onClick={() => onChangeUserSymbol('O')}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      userSymbol === 'O'
                        ? 'bg-playerO/20 text-playerO border border-playerO/40'
                        : 'text-charcoal-500 hover:text-slate-300'
                    }`}
                  >
                    Play as O
                  </button>
                </div>
              </div>

              <div>
                <label className="text-charcoal-400 block mb-1">Who Plays First?</label>
                <div className="flex rounded-lg bg-charcoal-900 p-0.5 border border-charcoal-750 font-mono font-bold">
                  <button
                    onClick={() => onChangeStartingPlayer(userSymbol)}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      startingPlayer === userSymbol
                        ? 'bg-accentIndigo/20 text-accentIndigo-light border border-accentIndigo/40'
                        : 'text-charcoal-500 hover:text-slate-300'
                    }`}
                  >
                    I play first
                  </button>
                  <button
                    onClick={() => onChangeStartingPlayer(userSymbol === 'X' ? 'O' : 'X')}
                    className={`flex-1 py-1.5 rounded-md transition-all ${
                      startingPlayer !== userSymbol
                        ? 'bg-accentIndigo/20 text-accentIndigo-light border border-accentIndigo/40'
                        : 'text-charcoal-500 hover:text-slate-300'
                    }`}
                  >
                    Opponent
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Search Engine Parameters */}
          <div className="p-3.5 rounded-xl bg-charcoal-850 border border-charcoal-750 space-y-3">
            <h3 className="font-bold font-mono uppercase tracking-wider text-charcoal-300">
              AI Search Engine
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-charcoal-400 block mb-1">
                  Search Depth Limit:
                </label>
                <select
                  value={searchOptions.maxDepth ?? 8}
                  onChange={(e) =>
                    onChangeSearchOptions({
                      ...searchOptions,
                      maxDepth: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-charcoal-900 border border-charcoal-750 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-accentIndigo"
                >
                  <option value={4}>4 Plies (Fast • ~20ms)</option>
                  <option value={6}>6 Plies (Standard • ~100ms)</option>
                  <option value={8}>8 Plies (Deep • ~400ms)</option>
                  <option value={10}>10 Plies (Master • ~900ms)</option>
                  <option value={12}>12 Plies (Grandmaster • ~1500ms)</option>
                </select>
              </div>

              <div>
                <label className="text-charcoal-400 block mb-1">
                  Time Budget:
                </label>
                <select
                  value={searchOptions.timeBudgetMs ?? 1500}
                  onChange={(e) =>
                    onChangeSearchOptions({
                      ...searchOptions,
                      timeBudgetMs: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-charcoal-900 border border-charcoal-750 rounded-lg p-2 font-mono text-slate-200 focus:outline-none focus:border-accentIndigo"
                >
                  <option value={300}>300 ms (Instant)</option>
                  <option value={800}>800 ms (Balanced)</option>
                  <option value={1500}>1500 ms (Deep)</option>
                  <option value={3000}>3000 ms (Thorough)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configurable Rules Variations */}
          <div className="p-3.5 rounded-xl bg-charcoal-850 border border-charcoal-750 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold font-mono uppercase tracking-wider text-charcoal-300">
                Rule Variations
              </h3>
            </div>
            <p className="text-[11px] text-charcoal-500">
              Note: Changing game rules will alter future transitions and move recommendations.
            </p>

            {/* Win Check Timing */}
            <div className="space-y-1">
              <label className="text-charcoal-400 block font-medium">
                Win Detection Timing:
              </label>
              <select
                value={rules.winCheckTiming}
                onChange={(e) =>
                  onChangeRules({
                    ...rules,
                    winCheckTiming: e.target.value as any,
                  })
                }
                className="w-full bg-charcoal-900 border border-charcoal-750 rounded-lg p-2 font-sans text-slate-200 focus:outline-none focus:border-accentIndigo"
              >
                <option value="after_removal">
                  Standard (Default): Old mark vanishes, then remaining 3 marks evaluated
                </option>
                <option value="before_removal">
                  Instantaneous: Check line of 3 among 4 marks before oldest vanishes
                </option>
              </select>
            </div>

            {/* Reoccupy Expiring Cell */}
            <div className="space-y-1">
              <label className="text-charcoal-400 block font-medium">
                Vacating Cell Re-entry:
              </label>
              <select
                value={rules.canReoccupyExpiringCell ? 'true' : 'false'}
                onChange={(e) =>
                  onChangeRules({
                    ...rules,
                    canReoccupyExpiringCell: e.target.value === 'true',
                  })
                }
                className="w-full bg-charcoal-900 border border-charcoal-750 rounded-lg p-2 font-sans text-slate-200 focus:outline-none focus:border-accentIndigo"
              >
                <option value="false">
                  Standard (Default): Player must pick a cell currently empty on the board
                </option>
                <option value="true">
                  Recycle Mode: Player can place directly on their own just-vacated cell
                </option>
              </select>
            </div>

            {/* Repetition Policy */}
            <div className="space-y-1">
              <label className="text-charcoal-400 block font-medium">
                Repetition / Cycle Policy:
              </label>
              <select
                value={rules.repetitionPolicy}
                onChange={(e) =>
                  onChangeRules({
                    ...rules,
                    repetitionPolicy: e.target.value as any,
                  })
                }
                className="w-full bg-charcoal-900 border border-charcoal-750 rounded-lg p-2 font-sans text-slate-200 focus:outline-none focus:border-accentIndigo"
              >
                <option value="threefold">Threefold Repetition (Standard Draw)</option>
                <option value="fivefold">Fivefold Repetition</option>
                <option value="none">No Automatic Repetition Draw</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-accentIndigo hover:bg-accentIndigo-light text-white font-bold text-xs shadow-lg shadow-accentIndigo/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
