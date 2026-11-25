'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Navigation,
  MapPin,
  Building as BuildingIcon,
  BookOpen,
  FlaskConical,
  GraduationCap,
  Briefcase,
  Users,
  Wrench,
} from 'lucide-react';
import { Building, Room } from '@/types/campus';

interface BuildingDetailSheetProps {
  building: Building | null;
  onClose: () => void;
  onNavigateToBuilding: (building: Building) => void;
  onStartRouteFromBuilding: (building: Building) => void;
  onEditBuilding?: (building: Building) => void;
}

export function BuildingDetailSheet({
  building,
  onClose,
  onNavigateToBuilding,
  onStartRouteFromBuilding,
  onEditBuilding,
}: BuildingDetailSheetProps) {
  const [selectedFloorLevel, setSelectedFloorLevel] = useState<number>(0);

  // Reset selected floor whenever a new building is opened
  useEffect(() => {
    if (building && building.floors.length > 0) {
      setSelectedFloorLevel(building.floors[0].level);
    }
  }, [building]);

  useEffect(() => {
    if (!building) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [building, onClose]);

  if (!building) return null;

  const currentFloor =
    building.floors.find((f) => f.level === selectedFloorLevel) || building.floors[0];

  const getRoomIcon = (type: Room['type']) => {
    switch (type) {
      case 'lab':
      case 'workshop':
        return <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />;
      case 'classroom':
        return <GraduationCap className="w-3.5 h-3.5 text-blue-400" />;
      case 'department':
      case 'office':
        return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
      case 'faculty':
        return <Users className="w-3.5 h-3.5 text-purple-400" />;
      case 'library':
        return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto z-30 w-full sm:w-[420px] max-h-[54dvh] sm:max-h-[85vh] flex flex-col pointer-events-none animate-sit-slide-up">
      <div className="pointer-events-auto bg-slate-950/98 backdrop-blur-md border border-slate-800/90 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Mobile Sheet Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5">
          <span className="w-10 h-1 rounded-full bg-slate-700" />
        </div>
        {/* Header Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-br from-slate-900/70 to-slate-950/70 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close building details"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: building.accentColor }}
            >
              {building.category}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              {building.levels} {building.levels === 1 ? 'Level' : 'Levels'} ({building.height}m)
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {building.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span>SIT Campus • {building.shortName}</span>
          </p>
        </div>

        {/* Action Buttons: Navigate Here / Depart */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2">
          <button
            onClick={() => onNavigateToBuilding(building)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Navigate</span>
          </button>
          <button
            onClick={() => onStartRouteFromBuilding(building)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-all border border-slate-700"
          >
            Depart
          </button>
        </div>

        {/* Body Content with Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[30dvh] sm:max-h-[50vh]">
          {/* Description */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              About Facility
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{building.description}</p>
          </div>

          {/* Interactive Floor Selector */}
          {building.floors.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Floor
                </h4>
                <span className="text-[10px] text-blue-400 font-medium">
                  {building.floors.length} Floors Verified
                </span>
              </div>

              {/* Floor Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {building.floors.map((fl) => (
                  <button
                    key={fl.level}
                    onClick={() => setSelectedFloorLevel(fl.level)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedFloorLevel === fl.level
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>

              {/* Rooms on this Floor */}
              {currentFloor && (
                <div className="mt-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-1.5 border-b border-slate-800">
                    <span>{currentFloor.name} Directory</span>
                    <span>{currentFloor.rooms.length} Rooms / Units</span>
                  </div>

                  <div className="space-y-1.5">
                    {currentFloor.rooms.map((room) => (
                      <div
                        key={room.code}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/50 flex-shrink-0">
                            {getRoomIcon(room.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">
                              {room.name}
                            </p>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {room.type}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-md flex-shrink-0 font-semibold">
                          {room.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] p-3 bg-slate-800/40 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">COORDINATES</span>
              <span className="text-slate-300 font-mono">
                {building.centerGeo[0].toFixed(5)}°N, {building.centerGeo[1].toFixed(5)}°E
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">GROUND ELEVATION</span>
              <span className="text-slate-300 font-mono">{building.elevation} m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
