'use client';

import React from 'react';
import { Plus, Minus, Compass, Eye, Maximize } from 'lucide-react';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
  onToggle2D3D: () => void;
  onOverview: () => void;
  is2DView: boolean;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetNorth,
  onToggle2D3D,
  onOverview,
  is2DView,
}: MapControlsProps) {
  return (
    <div className="absolute bottom-4 right-2.5 sm:bottom-6 sm:right-6 z-20 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-1 shadow-2xl space-y-1">
        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Zoom in"
          className="p-2.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Zoom out"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="h-px bg-slate-800 my-0.5" />

        {/* Reset North */}
        <button
          type="button"
          onClick={onResetNorth}
          title="Align North"
          aria-label="Align camera north"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 transition-all active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Compass className="w-4 h-4 text-rose-400" />
        </button>

        {/* 2D / 3D Toggle */}
        <button
          type="button"
          onClick={onToggle2D3D}
          title={is2DView ? 'Switch to 3D View' : 'Switch to Top-down 2D View'}
          aria-label={is2DView ? 'Switch to 3D View' : 'Switch to Top-down 2D View'}
          aria-pressed={is2DView}
          className={`p-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            is2DView
              ? 'bg-indigo-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
          }`}
        >
          {is2DView ? '2D' : '3D'}
        </button>

        {/* Overview */}
        <button
          type="button"
          onClick={onOverview}
          title="Campus Overview"
          aria-label="Reset to campus overview"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 transition-all active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
