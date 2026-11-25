'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Navigation,
  ArrowUpDown,
  Footprints,
  Clock,
  CheckCircle2,
  CornerDownRight,
  Route,
} from 'lucide-react';
import { Building, Amenity, NavGraph, RouteResult } from '@/types/campus';
import { calculateAStarRoute } from '@/lib/pathfinding';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  amenities: Amenity[];
  navGraph: NavGraph;
  activeRoute: RouteResult | null;
  onApplyRoute: (route: RouteResult | null) => void;
  preselectedOriginId?: string;
  preselectedDestId?: string;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  buildings,
  amenities,
  navGraph,
  activeRoute,
  onApplyRoute,
  preselectedOriginId,
  preselectedDestId,
}: NavigationDrawerProps) {
  // Combine all walkable locations
  const locations = [
    ...buildings.map((b) => ({
      id: b.id,
      name: b.name,
      shortName: b.shortName,
      navNodeId: b.navNodeId || `ent_${b.id}`,
      category: b.category,
      type: 'building' as const,
    })),
    ...amenities.map((a) => ({
      id: a.id,
      name: a.name,
      shortName: a.name,
      navNodeId: a.navNodeId || `ent_${a.id}`,
      category: a.category,
      type: 'amenity' as const,
    })),
  ];

  // Default origin to Main Entrance Gate, destination to Main Academic Block
  const defaultOrigin = locations.find((l) => l.id === 'main-gate-security') || locations[0];
  const defaultDest = locations.find((l) => l.id === 'main-academic-block') || locations[1];

  const [originId, setOriginId] = useState<string>(preselectedOriginId || defaultOrigin.id);
  const [destId, setDestId] = useState<string>(preselectedDestId || defaultDest.id);

  // Update when props change
  useEffect(() => {
    if (preselectedOriginId) setOriginId(preselectedOriginId);
  }, [preselectedOriginId]);

  useEffect(() => {
    if (preselectedDestId) setDestId(preselectedDestId);
  }, [preselectedDestId]);

  // Recalculate route whenever origin or destination changes
  useEffect(() => {
    if (!isOpen) return;

    const originLoc = locations.find((l) => l.id === originId);
    const destLoc = locations.find((l) => l.id === destId);

    if (originLoc && destLoc && originId !== destId) {
      const result = calculateAStarRoute(
        navGraph,
        originLoc.navNodeId,
        destLoc.navNodeId,
        originLoc.shortName,
        destLoc.shortName
      );
      onApplyRoute(result);
    }
  }, [originId, destId, isOpen]);

  const handleSwap = () => {
    const temp = originId;
    setOriginId(destId);
    setDestId(temp);
  };

  const handleClearRoute = () => {
    onApplyRoute(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-[66px] left-2.5 right-2.5 sm:top-20 sm:left-4 sm:right-auto z-40 sm:w-96 max-h-[calc(100dvh-82px)] sm:max-h-[82vh] flex flex-col pointer-events-none animate-sit-slide-right">
      <div className="pointer-events-auto bg-slate-950/92 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Campus Walking Navigation</h3>
              <p className="text-[11px] text-cyan-400/90">A* Graph Pathfinding Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs (Origin & Destination) */}
        <div className="p-4 space-y-3 bg-slate-950/40 border-b border-slate-800">
          <div className="space-y-2 relative">
            {/* Origin Select */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <div className="flex-1 bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-700/60">
                <label className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Starting Point
                </label>
                <select
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  aria-label="Starting point"
                  className="w-full bg-transparent text-sm sm:text-xs text-white outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={`orig_${loc.id}`} value={loc.id} className="bg-slate-900 text-white">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              title="Swap Locations"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            {/* Destination Select */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
              <div className="flex-1 bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-700/60">
                <label className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Destination
                </label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  aria-label="Destination"
                  className="w-full bg-transparent text-sm sm:text-xs text-white outline-none cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={`dest_${loc.id}`} value={loc.id} className="bg-slate-900 text-white">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Route Stats & Guidance */}
        {activeRoute && (
          <div className="p-4 space-y-3 overflow-y-auto max-h-[45vh]">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-blue-950/40 rounded-2xl border border-blue-900/50">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">TOTAL DISTANCE</span>
                  <span className="font-bold text-white text-sm">{activeRoute.totalDistance} m</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">EST. WALKING TIME</span>
                  <span className="font-bold text-white text-sm">
                    ~{activeRoute.estimatedMinutes} min
                  </span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Directions */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-blue-400" />
                <span>Turn-by-Turn Guidance</span>
              </h4>

              <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
                {activeRoute.steps.map((st, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 group-first:bg-emerald-500 group-last:bg-rose-500" />
                    <p className="text-xs text-slate-200 font-medium">{st.instruction}</p>
                    {st.distance > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <CornerDownRight className="w-3 h-3 text-slate-500" />
                        {st.distance} meters on verified path
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleClearRoute}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all"
          >
            Clear Route
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md"
          >
            Follow on Map
          </button>
        </div>
      </div>
    </div>
  );
}
