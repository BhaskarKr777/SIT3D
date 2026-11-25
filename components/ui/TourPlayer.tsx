'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  Compass,
  Sparkles,
  Check,
} from 'lucide-react';
import { TourStop } from '@/types/campus';

interface TourPlayerProps {
  stops: TourStop[];
  currentStopIndex: number;
  isOpen: boolean;
  onNextStop: () => void;
  onPrevStop: () => void;
  onSelectStop: (index: number) => void;
  onClose: () => void;
}

export function TourPlayer({
  stops,
  currentStopIndex,
  isOpen,
  onNextStop,
  onPrevStop,
  onSelectStop,
  onClose,
}: TourPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset playback when tour opens/closes
  useEffect(() => {
    if (!isOpen) setIsPlaying(false);
  }, [isOpen]);

  // Keyboard navigation inside tour (Left/Right arrows, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        if (currentStopIndex < stops.length - 1) onNextStop();
      } else if (e.key === 'ArrowLeft') {
        if (currentStopIndex > 0) onPrevStop();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, currentStopIndex, stops.length, onNextStop, onPrevStop, onClose]);

  // Auto-advance timer when playing
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timer = setTimeout(() => {
      if (currentStopIndex < stops.length - 1) {
        onNextStop();
      } else {
        setIsPlaying(false); // Finished tour
      }
    }, 6500);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStopIndex, isOpen, stops.length, onNextStop]);

  if (!isOpen || !stops.length) return null;

  const currentStop = stops[currentStopIndex] || stops[0];
  const progressPercent = ((currentStopIndex + 1) / stops.length) * 100;

  return (
    <div className="absolute bottom-3 left-2.5 right-2.5 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 sm:w-[500px] pointer-events-none animate-sit-slide-up">
      <div className="pointer-events-auto bg-slate-950/92 backdrop-blur-xl border border-cyan-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Top Progress Line */}
        <div className="h-1.5 w-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                Fresher Orientation Tour
              </span>
              <span className="text-xs font-semibold text-white">
                Stop {currentStopIndex + 1} of {stops.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">{isPlaying ? 'Pause' : 'Auto Play'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div key={currentStop.id} className="p-4 sm:p-5 space-y-3 animate-sit-fade">
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {currentStop.title}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {currentStop.description}
          </p>

          {/* Highlights Pills */}
          {currentStop.highlights && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentStop.highlights.map((h, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium bg-amber-950/40 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controls Navigation Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onPrevStop}
            disabled={currentStopIndex === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentStopIndex === 0
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Dot Step Selectors */}
          <div className="hidden sm:flex items-center gap-1">
            {stops.map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onSelectStop(idx)}
                aria-label={`Go to stop ${idx + 1}: ${s.title}`}
                className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  idx === currentStopIndex
                    ? 'w-5 bg-amber-400'
                    : idx < currentStopIndex
                    ? 'w-2 bg-amber-600/70'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={currentStopIndex === stops.length - 1 ? onClose : onNextStop}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              currentStopIndex === stops.length - 1
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <span>{currentStopIndex === stops.length - 1 ? 'Finish Tour' : 'Next Stop'}</span>
            {currentStopIndex === stops.length - 1 ? (
              <Check className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
