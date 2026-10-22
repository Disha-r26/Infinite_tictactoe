"use client";

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Plus,
  Play,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import {
  parseMoveString,
  reconstructFromMoves,
} from '../engine/serializer';
import { GameRules, GameState, Player } from '../engine/types';

interface ReconstructModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: GameRules;
  onGameReconstructed: (state: GameState) => void;
}

export function ReconstructModal({
  isOpen,
  onClose,
  rules,
  onGameReconstructed,
}: ReconstructModalProps) {
  const [inputText, setInputText] = useState(
    'X: B2\nO: A1\nX: B1\nO: C3\nX: A3\nO: C1'
  );
  const [startingPlayer, setStartingPlayer] = useState<Player>('X');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewState, setPreviewState] = useState<GameState | null>(null);

  if (!isOpen) return null;

  const handleValidate = () => {
    setValidationErrors([]);
    setPreviewState(null);

    const parsedMoves = parseMoveString(inputText);
    if (parsedMoves.length === 0) {
      setValidationErrors(['No valid moves recognized. Please format like "X: B2, O: A1" or line-by-line.']);
      return;
    }

    const res = reconstructFromMoves(parsedMoves, rules, startingPlayer);
    if (res.state && res.errors.length === 0) {
      setPreviewState(res.state);
    } else {
      setValidationErrors(res.errors);
    }
  };

  const handleCommit = () => {
    if (previewState) {
      onGameReconstructed(previewState);
      onClose();
    } else {
      const parsedMoves = parseMoveString(inputText);
      const res = reconstructFromMoves(parsedMoves, rules, startingPlayer);
      if (res.state && res.errors.length === 0) {
        onGameReconstructed(res.state);
        onClose();
      } else {
        setValidationErrors(res.errors);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-charcoal-900 border border-charcoal-750 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-accentIndigo-light" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Mode B: Reconstruct Game in Progress
              </h2>
              <p className="text-[11px] text-charcoal-500">
                Reconstruct active board and chronological mark ages from history
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

        {/* Starting Player Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-charcoal-850 border border-charcoal-750 text-xs">
          <span className="text-charcoal-400 font-medium">Starting Player of this game:</span>
          <div className="flex rounded-md bg-charcoal-900 p-0.5 border border-charcoal-750 font-mono font-bold">
            <button
              onClick={() => setStartingPlayer('X')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                startingPlayer === 'X'
                  ? 'bg-playerX/20 text-playerX border border-playerX/40'
                  : 'text-charcoal-500 hover:text-slate-300'
              }`}
            >
              Player X
            </button>
            <button
              onClick={() => setStartingPlayer('O')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                startingPlayer === 'O'
                  ? 'bg-playerO/20 text-playerO border border-playerO/40'
                  : 'text-charcoal-500 hover:text-slate-300'
              }`}
            >
              Player O
            </button>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-1.5 text-xs">
          <label className="text-charcoal-400 block font-medium">
            Recorded Moves Sequence (Algebraic coordinates A1-C3):
          </label>
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setPreviewState(null);
            }}
            rows={7}
            placeholder={"X: B2\nO: A1\nX: B1\nO: C3\n..."}
            className="w-full bg-charcoal-950 border border-charcoal-750 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-charcoal-600 focus:outline-none focus:border-accentIndigo leading-relaxed"
          />
          <p className="text-[10px] text-charcoal-500">
            Accepts formats: &quot;X: B2, O: A1&quot; or line-by-line &quot;B2\nA1\nB1...&quot;
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Invalid Move Sequence:</span>
            </div>
            {validationErrors.map((err, i) => (
              <p key={i} className="text-[11px] pl-5">
                • {err}
              </p>
            ))}
          </div>
        )}

        {/* Preview Summary */}
        {previewState && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Verified! {previewState.moveHistory.length} moves applied cleanly. Next turn: Player {previewState.turn}.
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleValidate}
            className="px-3.5 py-2 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-charcoal-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Validate Sequence
          </button>

          <button
            onClick={handleCommit}
            className="px-4 py-2 rounded-lg bg-playerX hover:bg-playerX-light text-charcoal-950 text-xs font-bold shadow-lg shadow-playerX/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load into Analyzer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
