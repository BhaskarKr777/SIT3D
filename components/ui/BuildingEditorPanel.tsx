'use client';

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Move,
  RotateCw,
  Maximize2,
  Sliders,
  Save,
  RotateCcw,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Plus,
  Search,
  Eye,
  EyeOff,
  Layers,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Building as BuildingIcon,
  FolderTree,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { Building, BuildingCategory } from '@/types/campus';
import { BuildingConfig, DEFAULT_BUILDING_CONFIG } from '@/types/buildingEditor';
import { getBuildingGroundHeight } from '@/lib/terrainElevation';

interface BuildingEditorPanelProps {
  buildings: Building[];
  selectedBuilding: Building | null;
  onSelectBuilding: (b: Building) => void;
  onChangeBuilding: (updated: Building) => void;
  onDuplicateBuilding: (b: Building) => void;
  onDeleteBuilding: (b: Building) => void;
  onAddBuilding: () => void;
  onResetBuildingTransform: (b: Building) => void;
  onResetAllBuildings: () => void;
  onSaveAll: () => Promise<boolean>;
  onCancelChanges: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  config: BuildingConfig;
  onChangeConfig: (newConfig: BuildingConfig) => void;
  transformMode: 'translate' | 'rotate' | 'scale' | null;
  onChangeTransformMode: (mode: 'translate' | 'rotate' | 'scale' | null) => void;
  onClose: () => void;
}

const CATEGORIES: { id: BuildingCategory; label: string; color: string }[] = [
  { id: 'academic', label: 'Academic', color: '#3b82f6' },
  { id: 'administrative', label: 'Admin', color: '#8b5cf6' },
  { id: 'canteen', label: 'Canteen', color: '#f59e0b' },
  { id: 'hostel', label: 'Hostel', color: '#10b981' },
  { id: 'sports', label: 'Sports', color: '#ef4444' },
  { id: 'utility', label: 'Utility', color: '#64748b' },
  { id: 'entrance', label: 'Entrance', color: '#06b6d4' },
];

const PRESET_COLORS = [
  '#f5ede0', // Warm cream (Authentic SIT wall)
  '#ffffff', // Crisp white (Columns & trim)
  '#e2e8f0', // Off-white stone
  '#cbd5e1', // Light slate
  '#94a3b8', // Medium slate
  '#64748b', // Dark slate
  '#334155', // Graphite roof
  '#1e293b', // Deep charcoal
  '#3b82f6', // SIT Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red terracotta
];

export function BuildingEditorPanel({
  buildings,
  selectedBuilding,
  onSelectBuilding,
  onChangeBuilding,
  onDuplicateBuilding,
  onDeleteBuilding,
  onAddBuilding,
  onResetBuildingTransform,
  onResetAllBuildings,
  onSaveAll,
  onCancelChanges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  config,
  onChangeConfig,
  transformMode,
  onChangeTransformMode,
  onClose,
}: BuildingEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'transform' | 'properties' | 'architecture' | 'list'>('transform');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // If no building is selected, default to the first building (usually main-academic-block)
  const currentBuilding = selectedBuilding || buildings[0] || null;

  // Filtered buildings for directory list
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.shortName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'all' || b.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [buildings, searchQuery, categoryFilter]);

  // Read current building coordinates and orientation
  const [curX, curY, curZ] = useMemo(() => {
    if (!currentBuilding) return [0, 0, 0];
    if (currentBuilding.id === 'main-academic-block') {
      return [config.posX, config.posY, config.posZ];
    }
    const [cx, cz] = currentBuilding.center;
    const px = currentBuilding.transform?.position ? currentBuilding.transform.position[0] : cx;
    const py = currentBuilding.transform?.position && typeof currentBuilding.transform.position[1] === 'number' && currentBuilding.transform.position[1] < 20
      ? currentBuilding.transform.position[1]
      : (typeof currentBuilding.elevation === 'number' && currentBuilding.elevation < 20 ? currentBuilding.elevation : getBuildingGroundHeight(currentBuilding));
    const pz = currentBuilding.transform?.position ? currentBuilding.transform.position[2] : cz;
    return [px, py, pz];
  }, [currentBuilding, config]);

  const curRotY = useMemo(() => {
    if (!currentBuilding) return 0;
    if (currentBuilding.id === 'main-academic-block') {
      return config.rotY;
    }
    return currentBuilding.transform?.rotation ? currentBuilding.transform.rotation[1] : 0;
  }, [currentBuilding, config]);

  const curScale = useMemo(() => {
    if (!currentBuilding) return 1;
    if (currentBuilding.id === 'main-academic-block') {
      return config.scale;
    }
    return currentBuilding.transform?.scale ? currentBuilding.transform.scale[0] : 1;
  }, [currentBuilding, config]);

  const rotDeg = Math.round((curRotY * 180) / Math.PI);

  // Handlers for updating current building transform
  const handleUpdatePosition = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!currentBuilding) return;
    if (currentBuilding.id === 'main-academic-block') {
      const key = axis === 'x' ? 'posX' : axis === 'y' ? 'posY' : 'posZ';
      onChangeConfig({ ...config, [key]: value });
    }
    const [cx, cz] = currentBuilding.center;
    const prevPos: [number, number, number] = currentBuilding.transform?.position || [cx, currentBuilding.elevation || 0, cz];
    const newPos: [number, number, number] = [
      axis === 'x' ? value : prevPos[0],
      axis === 'y' ? value : prevPos[1],
      axis === 'z' ? value : prevPos[2],
    ];
    onChangeBuilding({
      ...currentBuilding,
      transform: {
        ...currentBuilding.transform,
        position: newPos,
      },
    });
  };

  const handleUpdateRotationY = (rad: number) => {
    if (!currentBuilding) return;
    if (currentBuilding.id === 'main-academic-block') {
      onChangeConfig({ ...config, rotY: rad });
    }
    const prevRot: [number, number, number] = currentBuilding.transform?.rotation || [0, 0, 0];
    onChangeBuilding({
      ...currentBuilding,
      transform: {
        ...currentBuilding.transform,
        rotation: [prevRot[0], rad, prevRot[2]],
      },
    });
  };

  const handleUpdateScale = (scaleVal: number) => {
    if (!currentBuilding) return;
    if (currentBuilding.id === 'main-academic-block') {
      onChangeConfig({ ...config, scale: scaleVal });
    }
    onChangeBuilding({
      ...currentBuilding,
      transform: {
        ...currentBuilding.transform,
        scale: [scaleVal, scaleVal, scaleVal],
      },
    });
  };

  // Handlers for building properties
  const handleUpdateProperty = <K extends keyof Building>(key: K, value: Building[K]) => {
    if (!currentBuilding) return;
    onChangeBuilding({
      ...currentBuilding,
      [key]: value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await onSaveAll();
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-3 sm:bottom-4 right-3 sm:right-4 z-40 w-96 max-w-[calc(100vw-1.5rem)] select-none">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[88vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-800/90 to-slate-900/90 px-4 py-3 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30 flex-shrink-0">
              <Wrench className="w-4 h-4 animate-spin-slow" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-xs tracking-wide text-white flex items-center gap-1.5 truncate">
                <span>Campus Building Studio</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0">
                  Live 3D
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {currentBuilding?.shortName || currentBuilding?.name} • {curX.toFixed(1)}m, {curZ.toFixed(1)}m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Undo / Redo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo [Ctrl+Z]"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo [Ctrl+Y]"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Building Quick Switcher */}
            <div className="p-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
              <BuildingIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <select
                value={currentBuilding?.id || ''}
                onChange={(e) => {
                  const target = buildings.find((b) => b.id === e.target.value);
                  if (target) onSelectBuilding(target);
                }}
                className="flex-1 bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-blue-500 font-medium truncate"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName || b.name} ({b.category}) {b.levels ? `• ${b.levels}F` : ''}
                  </option>
                ))}
              </select>

              {/* Visibility toggle button */}
              {currentBuilding && (
                <button
                  onClick={() => handleUpdateProperty('visible', currentBuilding.visible === false ? true : false)}
                  title={currentBuilding.visible === false ? 'Show Building in 3D' : 'Hide Building in 3D'}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    currentBuilding.visible === false
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  {currentBuilding.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900/60 border-b border-slate-800/80 text-[11px] font-semibold flex-shrink-0">
              <button
                onClick={() => setActiveTab('transform')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'transform'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Move className="w-3 h-3" />
                <span>Move</span>
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'properties'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Palette className="w-3 h-3" />
                <span>Design</span>
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'architecture'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Specs</span>
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'list'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FolderTree className="w-3 h-3" />
                <span>Campus</span>
              </button>
            </div>

            {/* Tab Body with Scroll */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh] text-xs">
              {/* TAB 1: TRANSFORMS & GIZMOS */}
              {activeTab === 'transform' && currentBuilding && (
                <div className="space-y-4">
                  {/* Gizmo Tool Selection */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      3D Transform Gizmo Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => onChangeTransformMode('translate')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                          transformMode === 'translate'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Move className="w-3.5 h-3.5" />
                        <span>Move [W]</span>
                      </button>
                      <button
                        onClick={() => onChangeTransformMode('rotate')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                          transformMode === 'rotate'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate [E]</span>
                      </button>
                      <button
                        onClick={() => onChangeTransformMode('scale')}
                        className={`py-2 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                          transformMode === 'scale'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Scale [R]</span>
                      </button>
                    </div>
                  </div>

                  {/* Position X (East-West) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>World X (East-West):</span>
                      <span className="font-mono text-blue-400 font-bold">{curX.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min={curX - 50}
                      max={curX + 50}
                      step={0.1}
                      value={curX}
                      onChange={(e) => handleUpdatePosition('x', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Position Z (North-South) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>World Z (North-South):</span>
                      <span className="font-mono text-blue-400 font-bold">{curZ.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min={curZ - 50}
                      max={curZ + 50}
                      step={0.1}
                      value={curZ}
                      onChange={(e) => handleUpdatePosition('z', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Elevation Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Elevation Y (Ground level):</span>
                      <span className="font-mono text-blue-400 font-bold">{curY.toFixed(2)}m</span>
                    </div>
                    <input
                      type="range"
                      min={-2}
                      max={15}
                      step={0.1}
                      value={curY}
                      onChange={(e) => handleUpdatePosition('y', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Orientation Angle */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Orientation (Rotate Y):</span>
                      <span className="font-mono text-amber-400 font-bold">{rotDeg}° ({curRotY.toFixed(2)} rad)</span>
                    </div>
                    <input
                      type="range"
                      min={-Math.PI}
                      max={Math.PI}
                      step={0.01}
                      value={curRotY}
                      onChange={(e) => handleUpdateRotationY(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Overall Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Scale Multiplier:</span>
                      <span className="font-mono text-emerald-400 font-bold">{curScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.5}
                      step={0.02}
                      value={curScale}
                      onChange={(e) => handleUpdateScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Reset Transform Button */}
                  <button
                    onClick={() => onResetBuildingTransform(currentBuilding)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset This Building Transform</span>
                  </button>
                </div>
              )}

              {/* TAB 2: PROPERTIES & MATERIALS */}
              {activeTab === 'properties' && currentBuilding && (
                <div className="space-y-3.5">
                  {/* Building Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Building Full Name
                    </label>
                    <input
                      type="text"
                      value={currentBuilding.name}
                      onChange={(e) => handleUpdateProperty('name', e.target.value)}
                      className="w-full bg-slate-950 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Short Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Short Label (3D Map Tag)
                    </label>
                    <input
                      type="text"
                      value={currentBuilding.shortName}
                      onChange={(e) => handleUpdateProperty('shortName', e.target.value)}
                      className="w-full bg-slate-950 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Building Category
                    </label>
                    <select
                      value={currentBuilding.category}
                      onChange={(e) => handleUpdateProperty('category', e.target.value as BuildingCategory)}
                      className="w-full bg-slate-950 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500 capitalize"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} Block
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Levels & Height */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Floors:</span>
                        <span className="font-mono text-blue-400 font-bold">{currentBuilding.levels}F</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        step={1}
                        value={currentBuilding.levels}
                        onChange={(e) => handleUpdateProperty('levels', parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Height:</span>
                        <span className="font-mono text-blue-400 font-bold">{currentBuilding.height}m</span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={35}
                        step={0.5}
                        value={currentBuilding.height}
                        onChange={(e) => handleUpdateProperty('height', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Exterior Body Color
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={currentBuilding.color || '#cbd5e1'}
                          onChange={(e) => handleUpdateProperty('color', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-slate-400">{currentBuilding.color}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateProperty('color', c)}
                          className="w-5 h-5 rounded-md border border-slate-700/80 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Roof & Accent Color
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={currentBuilding.accentColor || '#334155'}
                          onChange={(e) => handleUpdateProperty('accentColor', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-slate-400">{currentBuilding.accentColor}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateProperty('accentColor', c)}
                          className="w-5 h-5 rounded-md border border-slate-700/80 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1 pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Building Description
                    </label>
                    <textarea
                      rows={2}
                      value={currentBuilding.description || ''}
                      onChange={(e) => handleUpdateProperty('description', e.target.value)}
                      className="w-full bg-slate-950 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: ARCHITECTURE SPECS (Main Academic Block Specialized Controls) */}
              {activeTab === 'architecture' && (
                <div className="space-y-4">
                  {currentBuilding?.id === 'main-academic-block' ? (
                    <>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] leading-relaxed">
                        Fine-tune the specialized architectural elements of the Main Academic Complex:
                      </div>

                      {/* Skylights */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Central Glass Atrium Skylights
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Width:</span>
                            <span className="font-mono text-blue-400 font-bold">{config.atriumWidth.toFixed(1)}m</span>
                          </div>
                          <input
                            type="range"
                            min={15}
                            max={32}
                            step={0.5}
                            value={config.atriumWidth}
                            onChange={(e) => onChangeConfig({ ...config, atriumWidth: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Depth:</span>
                            <span className="font-mono text-blue-400 font-bold">{config.atriumDepth.toFixed(1)}m</span>
                          </div>
                          <input
                            type="range"
                            min={4}
                            max={12}
                            step={0.5}
                            value={config.atriumDepth}
                            onChange={(e) => onChangeConfig({ ...config, atriumDepth: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>

                      {/* Portico & Dome */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Rotunda Silver Dome & Portico
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Dome Scale:</span>
                            <span className="font-mono text-blue-400 font-bold">{config.domeScale.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.4}
                            step={0.02}
                            value={config.domeScale}
                            onChange={(e) => onChangeConfig({ ...config, domeScale: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Portico Width:</span>
                            <span className="font-mono text-blue-400 font-bold">{config.porticoWidth.toFixed(1)}m</span>
                          </div>
                          <input
                            type="range"
                            min={14}
                            max={28}
                            step={0.5}
                            value={config.porticoWidth}
                            onChange={(e) => onChangeConfig({ ...config, porticoWidth: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>

                      {/* Facade Straightness */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Front Facade Alignment (Straightened)
                        </h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Wing Angle:</span>
                            <span className="font-mono text-emerald-400 font-bold">{config.wingAngle.toFixed(2)} rad</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.25}
                            step={0.01}
                            value={config.wingAngle}
                            onChange={(e) => onChangeConfig({ ...config, wingAngle: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400">
                      <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-medium text-slate-300 mb-1">Standard Campus Building</p>
                      <p className="text-[11px] text-slate-500">
                        Custom dimensions, heights, and levels are configured in the <strong>Design</strong> tab. Select the Main Academic Complex to access rotunda and skylight calibration.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CAMPUS BUILDINGS DIRECTORY */}
              {activeTab === 'list' && (
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search campus buildings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded-full font-semibold transition-colors ${
                        categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      All ({buildings.length})
                    </button>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
                          categoryFilter === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Buildings List */}
                  <div className="space-y-1.5 max-h-[32vh] overflow-y-auto pr-1">
                    {filteredBuildings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => onSelectBuilding(b)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          currentBuilding?.id === b.id
                            ? 'bg-blue-950/70 border-blue-500/80 shadow-md ring-1 ring-blue-400'
                            : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: b.accentColor || '#38bdf8' }}
                          />
                          <div className="min-w-0">
                            <h5 className="font-semibold text-slate-200 text-xs truncate">
                              {b.shortName || b.name}
                            </h5>
                            <p className="text-[10px] text-slate-500 capitalize truncate">
                              {b.category} • {b.levels} Floors • {b.height}m
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {b.visible === false && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">
                              Hidden
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">
                            {b.levels}F
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Building Button */}
                  <button
                    onClick={onAddBuilding}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Campus Building Block</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions & Persistence Bar */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800/90 space-y-2 flex-shrink-0">
              {/* Secondary Actions: Duplicate / Delete / Cancel */}
              <div className="flex items-center gap-1.5">
                {currentBuilding && (
                  <button
                    onClick={() => onDuplicateBuilding(currentBuilding)}
                    title="Duplicate selected building"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center justify-center gap-1 transition-colors border border-slate-700"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Duplicate</span>
                  </button>
                )}

                {currentBuilding && currentBuilding.id !== 'main-academic-block' && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete selected building"
                    className="py-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-[11px] flex items-center justify-center gap-1 transition-colors border border-red-500/30"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  onClick={onCancelChanges}
                  title="Discard unsaved changes"
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium text-[11px] transition-colors"
                >
                  Revert
                </button>
              </div>

              {/* Primary Save Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving to Campus Twin...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Saved & Persisted Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Campus Changes</span>
                    </>
                  )}
                </button>
              </div>

              {/* Factory Defaults Reset Link */}
              <div className="flex justify-center pt-0.5">
                <button
                  onClick={() => {
                    if (confirm('Reset entire SIT campus to factory default layout? All building movements and custom settings will be restored to defaults.')) {
                      onResetAllBuildings();
                    }
                  }}
                  className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Restore Factory Campus Defaults</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && currentBuilding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-red-400 font-bold">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h4>Delete Campus Building?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{currentBuilding.name}</strong> from the SIT 3D Campus? This will remove its 3D geometry and markers.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBuilding(currentBuilding);
                  setShowDeleteConfirm(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
