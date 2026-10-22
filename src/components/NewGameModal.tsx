"use client";

import React, { useState } from 'react';
import {
  X,
  Play,
  RotateCw,
  User,
  Bot,
  Sparkles,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Player } from '../engine/types';

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserSymbol: Player;
  initialFirstPlayer: 'user' | 'opponent';
  onStartNewGame: (userSymbol: Player, firstPlayer: 'user' | 'opponent') => void;
}

export function NewGameModal({
  isOpen,
  onClose,
  initialUserSymbol,
  initialFirstPlayer,
  onStartNewGame,
}: NewGameModalProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<Player>(initialUserSymbol);
  const [selectedFirstPlayer, setSelectedFirstPlayer] = useState<'user' | 'opponent'>(
    initialFirstPlayer
  );

  if (!isOpen) return null;

  const opponentSymbol: Player = selectedSymbol === 'X' ? 'O' : 'X';
  const startingPlayerSymbol: Player =
    selectedFirstPlayer === 'user' ? selectedSymbol : opponentSymbol;

  const handleStart = () => {
    onStartNewGame(selectedSymbol, selectedFirstPlayer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-charcoal-900 border border-charcoal-750 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-playerX/20 text-playerX flex items-center justify-center font-bold">
              <RotateCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                New Game Configuration
              </h2>
              <p className="text-[11px] text-charcoal-500">
                Choose your symbol and starting turn order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-charcoal-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Choose Your Symbol */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-400 block">
            1. Your Symbol
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedSymbol('X')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedSymbol === 'X'
                  ? 'bg-playerX/15 border-playerX shadow-lg shadow-playerX/20'
                  : 'bg-charcoal-850 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black font-mono text-playerX">X</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-playerX/20 text-playerX border border-playerX/40 font-bold">
                  {selectedSymbol === 'X' ? 'Selected' : 'Choose'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-200 block">Play as X</span>
              <span className="text-[11px] text-charcoal-500 block">
                Opponent will play as O
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSymbol('O')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedSymbol === 'O'
                  ? 'bg-playerO/15 border-playerO shadow-lg shadow-playerO/20'
                  : 'bg-charcoal-850 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black font-mono text-playerO">O</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-playerO/20 text-playerO border border-playerO/40 font-bold">
                  {selectedSymbol === 'O' ? 'Selected' : 'Choose'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-200 block">Play as O</span>
              <span className="text-[11px] text-charcoal-500 block">
                Opponent will play as X
              </span>
            </button>
          </div>
        </div>

        {/* 2. Who plays first? */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-400 block">
            2. Who plays first?
          </label>
          <div className="space-y-2.5">
            {/* Option A: I play first */}
            <button
              type="button"
              onClick={() => setSelectedFirstPlayer('user')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                selectedFirstPlayer === 'user'
                  ? 'bg-accentIndigo/15 border-accentIndigo shadow-md shadow-accentIndigo/20'
                  : 'bg-charcoal-850 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedFirstPlayer === 'user'
                      ? 'bg-accentIndigo text-white'
                      : 'bg-charcoal-750 text-charcoal-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>I play first</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-charcoal-750 text-charcoal-300">
                      Plays as {selectedSymbol}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-400">
                    You make the opening move on the board
                  </p>
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedFirstPlayer === 'user'
                    ? 'border-accentIndigo bg-accentIndigo'
                    : 'border-charcoal-600'
                }`}
              >
                {selectedFirstPlayer === 'user' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Option B: Opponent plays first */}
            <button
              type="button"
              onClick={() => setSelectedFirstPlayer('opponent')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                selectedFirstPlayer === 'opponent'
                  ? 'bg-accentIndigo/15 border-accentIndigo shadow-md shadow-accentIndigo/20'
                  : 'bg-charcoal-850 border-charcoal-750 hover:border-charcoal-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    selectedFirstPlayer === 'opponent'
                      ? 'bg-accentIndigo text-white'
                      : 'bg-charcoal-750 text-charcoal-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>Opponent plays first</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-charcoal-750 text-charcoal-300">
                      Plays as {opponentSymbol}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-400">
                    Opponent makes the opening move; enter it on the board
                  </p>
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedFirstPlayer === 'opponent'
                    ? 'border-accentIndigo bg-accentIndigo'
                    : 'border-charcoal-600'
                }`}
              >
                {selectedFirstPlayer === 'opponent' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Turn order recap box */}
        <div className="p-3 rounded-xl bg-charcoal-850 border border-charcoal-750 text-xs space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-charcoal-400 block font-semibold">
            Match Protocol
          </span>
          <p className="text-charcoal-300">
            {selectedFirstPlayer === 'user' ? (
              <>
                You (<strong className={selectedSymbol === 'X' ? 'text-playerX' : 'text-playerO'}>{selectedSymbol}</strong>) will make move #1. The AI coach will analyze and recommend your opening play.
              </>
            ) : (
              <>
                Opponent (<strong className={opponentSymbol === 'X' ? 'text-playerX' : 'text-playerO'}>{opponentSymbol}</strong>) will make move #1. You will be prompted to enter their move on the board.
              </>
            )}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-5 py-2 rounded-lg bg-playerX hover:bg-playerX-light text-charcoal-950 text-xs font-bold shadow-lg shadow-playerX/20 flex items-center gap-1.5 transition-all"
          >
            <span>Start Game</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
