"use client";

import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  AlertCircle,
} from 'lucide-react';
import { exportGameToJson, importGameFromJson } from '../engine/serializer';
import { GameState } from '../engine/types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  onLoadGame: (state: GameState) => void;
}

export function ExportImportModal({
  isOpen,
  onClose,
  state,
  onLoadGame,
}: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = exportGameToJson(state);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infinite-ttt-game-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportErrors([]);
    const res = importGameFromJson(importText);
    if (res.state && res.errors.length === 0) {
      onLoadGame(res.state);
      onClose();
    } else {
      setImportErrors(res.errors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-charcoal-900 border border-charcoal-750 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal-750 pb-3">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-accentIndigo-light" />
            <h2 className="text-base font-bold text-slate-100">
              Export / Import Game History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-charcoal-400 hover:text-slate-200 hover:bg-charcoal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-charcoal-850 p-0.5 border border-charcoal-750 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              activeTab === 'export'
                ? 'bg-charcoal-700 text-slate-100 shadow-sm'
                : 'text-charcoal-500 hover:text-slate-300'
            }`}
          >
            Export Current Game
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              activeTab === 'import'
                ? 'bg-charcoal-700 text-slate-100 shadow-sm'
                : 'text-charcoal-500 hover:text-slate-300'
            }`}
          >
            Import Game JSON
          </button>
        </div>

        {/* Tab 1: Export */}
        {activeTab === 'export' && (
          <div className="space-y-3">
            <p className="text-xs text-charcoal-400">
              Full move history, player symbols, chronological mark queues, and rule configuration:
            </p>

            <textarea
              readOnly
              value={jsonString}
              rows={8}
              className="w-full bg-charcoal-950 border border-charcoal-750 rounded-xl p-3 font-mono text-xs text-playerX-light focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 border border-charcoal-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex-1 py-2 px-3 rounded-lg bg-accentIndigo hover:bg-accentIndigo-light text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-accentIndigo/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Import */}
        {activeTab === 'import' && (
          <div className="space-y-3">
            <p className="text-xs text-charcoal-400">
              Paste a previously exported Infinite Tic-Tac-Toe JSON string:
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Paste {"version":"1.0", "moves": [...]} here...'
              rows={8}
              className="w-full bg-charcoal-950 border border-charcoal-750 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-charcoal-600 focus:outline-none focus:border-accentIndigo"
            />

            {importErrors.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Import Validation Failed:</span>
                </div>
                {importErrors.map((err, i) => (
                  <p key={i} className="text-[11px] pl-5">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full py-2.5 rounded-lg bg-accentIndigo hover:bg-accentIndigo-light disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-accentIndigo/20 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Validate & Load Game</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
