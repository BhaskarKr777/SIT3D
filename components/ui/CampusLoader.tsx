'use client';

import React from 'react';

interface CampusLoaderProps {
  progress?: number;
  status?: string;
}

export function CampusLoader({
  progress,
  status = 'Preparing SIT Digital Campus...',
}: CampusLoaderProps) {
  return (
    <div
      className="w-full h-full relative overflow-hidden bg-[#060a14] flex flex-col items-center justify-center text-white px-5 animate-sit-fade"
      role="status"
      aria-live="polite"
      aria-label="Loading Siliguri Institute of Technology 3D Digital Twin"
    >
      {/* Full-bleed Campus Photo Background with Smooth Ken Burns Motion */}
      <img
        src="/sit-campus-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-50 animate-sit-kenburns select-none pointer-events-none"
      />

      {/* Atmospheric Midnight-Navy Gradient Scrim & Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#060a14]/80 via-[#070d1c]/65 to-[#050811]/92 backdrop-blur-[2px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(4,7,15,0.85)_100%)]"
      />

      {/* Center Glassmorphic Branding Card */}
      <div className="relative z-10 w-full max-w-sm bg-slate-950/75 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center animate-sit-slide-up">
        <div className="relative mb-4">
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-2xl shadow-indigo-500/25 ring-1 ring-white/30 overflow-hidden">
            <img
              src="/sit-logo.webp"
              alt="Siliguri Institute of Technology Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
        </div>

        <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-50">
          Siliguri Institute of Technology
        </h2>
        <span className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] uppercase tracking-widest text-cyan-300 font-semibold">
          3D Campus Digital Twin
        </span>

        {/* Animated Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden mt-6 ring-1 ring-white/10">
          {typeof progress === 'number' ? (
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              style={{ width: `${progress}%` }}
            />
          ) : (
            <div className="h-full w-2/3 bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
          )}
        </div>

        <div className="flex items-center justify-between w-full mt-2.5 text-[11px] text-slate-300/90">
          <span className="truncate pr-2">{status}</span>
          {typeof progress === 'number' && (
            <span className="font-mono text-cyan-300 font-semibold flex-shrink-0">
              {progress}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
