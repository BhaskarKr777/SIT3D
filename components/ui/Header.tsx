'use client';

import React, { useEffect, useState } from 'react';
import {
  Compass,
  Navigation,
  Sun,
  Moon,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  isNight: boolean;
  onToggleDayNight: () => void;
  onStartTour: () => void;
  onOpenNavDrawer: () => void;
  onResetView: () => void;
  isTourActive: boolean;
}

export function Header({
  isNight,
  onToggleDayNight,
  onStartTour,
  onOpenNavDrawer,
  onResetView,
  isTourActive,
}: HeaderProps) {
  const [localTime, setLocalTime] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Siliguri is in IST (UTC +5:30)
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 3600000 * 5.5);
      setLocalTime(
        ist.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showInfo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInfo(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInfo]);

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-30 p-2.5 sm:p-4 pointer-events-none flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-2xl shadow-xl min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md ring-1 ring-white/20 overflow-hidden flex-shrink-0">
            <img
              src="/sit-logo.webp"
              alt="Siliguri Institute of Technology Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-[11px] sm:text-sm tracking-tight text-slate-50 truncate max-w-[135px] sm:max-w-none">
                Siliguri Institute of Technology
              </h1>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold px-1.5 py-0.2 rounded-full hidden md:inline-block whitespace-nowrap">
                3D Digital Twin
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-slate-400">
              <span className="text-emerald-400/90 font-medium hidden sm:inline">Salbari, West Bengal</span>
              <span className="hidden sm:inline" aria-hidden="true">•</span>
              <span className="flex items-center gap-1 text-slate-300 font-medium whitespace-nowrap">
                <Clock className="w-3 h-3 inline text-cyan-400" /> {localTime || '12:00 PM'} IST
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Fresher Tour Button */}
          <button
            type="button"
            onClick={onStartTour}
            aria-pressed={isTourActive}
            aria-label="Start Fresher Orientation Tour"
            className={`flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 shadow-lg ${
              isTourActive
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-cyan-500/20'
                : 'bg-slate-950/90 text-slate-200 border-slate-800/80 hover:bg-slate-900 hover:border-cyan-500/40 hover:text-cyan-300'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Fresher Tour</span>
          </button>

          {/* Walking Navigation Button */}
          <button
            type="button"
            onClick={onOpenNavDrawer}
            aria-label="Open Campus Walking Directions"
            className="flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Navigation className="w-4 h-4" />
            <span className="hidden sm:inline">Directions</span>
          </button>

          {/* Day / Night Toggle */}
          <button
            type="button"
            onClick={onToggleDayNight}
            title={isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            aria-label={isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            aria-pressed={isNight}
            className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-800/80 hover:border-slate-700 shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {isNight ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-300" />
            )}
          </button>

          {/* Reset Overview Camera */}
          <button
            type="button"
            onClick={onResetView}
            title="Campus Overview"
            aria-label="Reset camera to campus overview"
            className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-800/80 hover:border-slate-700 shadow-lg transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 hidden sm:flex items-center justify-center"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Info Button */}
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            title="About SIT Campus 3D"
            aria-label="About SIT Campus 3D"
            className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-800/80 hover:border-slate-700 shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* About Modal */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto animate-sit-fade"
          onClick={() => setShowInfo(false)}
          role="dialog"
          aria-modal="true"
          aria-label="About Siliguri Institute of Technology 3D Digital Twin"
        >
          <div
            className="bg-slate-950 border border-slate-800 max-w-md w-full rounded-2xl p-5 shadow-2xl text-slate-200 animate-sit-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src="/sit-logo.webp"
                    alt="SIT Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Siliguri Institute of Technology
                  </h3>
                  <p className="text-[11px] text-slate-400">Interactive 3D Digital Twin</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                A high-precision 3D digital campus navigation platform for{' '}
                <strong className="text-white">Siliguri Institute of Technology (SIT)</strong>,
                located on Hill Cart Road, Salbari, Sukna, West Bengal.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">CAMPUS AREA</span>
                  <span className="font-semibold text-slate-100">~10 Acres</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">BUILDINGS</span>
                  <span className="font-semibold text-slate-100">19 Key Facilities</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LAT / LON</span>
                  <span className="font-semibold text-slate-100">26.769° N, 88.376° E</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ELEVATION</span>
                  <span className="font-semibold text-slate-100">~144m AMSL</span>
                </div>
              </div>
              <p>
                Featuring actual OpenStreetMap building footprints, A* graph-based walking
                pathfinding, floor & room exploration, fresher orientation tour, and dynamic
                Siliguri sun lighting.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all"
              >
                Close & Explore
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
