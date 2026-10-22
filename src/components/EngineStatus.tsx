"use client";

import React from 'react';
import {
  Cpu,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
} from 'lucide-react';
import { EngineStatus as EngineStatusType } from '../engine/types';

interface EngineStatusProps {
  status: EngineStatusType;
}

export function EngineStatus({ status }: EngineStatusProps) {
  return (
    <div className="p-4 rounded-2xl bg-charcoal-850 border border-charcoal-750 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-charcoal-750 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accentIndigo-light" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 font-mono">
            Engine Telemetry
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-charcoal-750 text-charcoal-400 border border-charcoal-700">
          Pure Adversarial Tree Search
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Depth */}
        <div className="p-2.5 rounded-xl bg-charcoal-900 border border-charcoal-750 text-center">
          <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
            Search Depth
          </span>
          <span className="text-base font-bold font-mono text-slate-100 block mt-0.5">
            {status.searchDepth} plies
          </span>
          <span className="text-[9px] font-mono text-charcoal-500 block mt-0.5">
            {status.completedDepth ? 'Full depth' : 'Time limit'}
          </span>
        </div>

        {/* Nodes Searched */}
        <div className="p-2.5 rounded-xl bg-charcoal-900 border border-charcoal-750 text-center">
          <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
            Nodes Visited
          </span>
          <span className="text-base font-bold font-mono text-playerX block mt-0.5 tabular-nums">
            {status.nodesSearched.toLocaleString()}
          </span>
          <span className="text-[9px] font-mono text-charcoal-500 block mt-0.5">
            Minimax + α-β
          </span>
        </div>

        {/* Search Duration */}
        <div className="p-2.5 rounded-xl bg-charcoal-900 border border-charcoal-750 text-center">
          <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
            Search Time
          </span>
          <span className="text-base font-bold font-mono text-slate-100 block mt-0.5 tabular-nums">
            {status.timeTakenMs} ms
          </span>
          <span className="text-[9px] font-mono text-charcoal-500 block mt-0.5">
            Local browser execution
          </span>
        </div>

        {/* Transposition Hits */}
        <div className="p-2.5 rounded-xl bg-charcoal-900 border border-charcoal-750 text-center">
          <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
            TT Cache Hits
          </span>
          <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5 tabular-nums">
            {status.transpositionHits.toLocaleString()}
          </span>
          <span className="text-[9px] font-mono text-charcoal-500 block mt-0.5">
            {status.isExact ? 'Exact resolution' : 'Bounded heuristic'}
          </span>
        </div>
      </div>
    </div>
  );
}
