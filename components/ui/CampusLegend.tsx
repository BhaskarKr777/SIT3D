'use client';

import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown } from 'lucide-react';

export function CampusLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    { label: 'Engineering & Academic', color: '#3b82f6' },
    { label: 'Management (MBA/MCA)', color: '#f59e0b' },
    { label: 'Basic Science & Induction', color: '#ea580c' },
    { label: 'Workshops & Labs', color: '#64748b' },
    { label: 'Administration & Library', color: '#0ea5e9' },
    { label: 'Central Canteen & Food', color: '#f97316' },
    { label: 'Student Hostels', color: '#0284c7' },
    { label: 'Sports & Athletics', color: '#15803d' },
    { label: 'Tea Gardens & Lawns', color: '#166534' },
  ];

  return (
    <div className="absolute bottom-4 left-2.5 md:bottom-6 md:left-4 z-20 pointer-events-none">
      <div className={`pointer-events-auto bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-2.5 shadow-2xl transition-all ${isExpanded ? 'w-52' : 'w-auto md:w-52'}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label="Toggle Campus Legend"
          className="w-full flex items-center justify-between gap-2 text-[11px] font-bold text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className={isExpanded ? 'inline' : 'hidden sm:inline'}>Campus Legend</span>
            {!isExpanded && <span className="sm:hidden">Legend</span>}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 animate-sit-slide-up">
            {categories.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-[10px] text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-md flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
