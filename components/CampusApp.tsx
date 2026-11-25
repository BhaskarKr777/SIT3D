'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  CampusData,
  Building,
  Amenity,
  NavGraph,
  RouteResult,
  TreeInstance,
} from '@/types/campus';
import { getSiliguriLocalHour, getLightingForHour, LightingState } from '@/lib/sunPosition';
import { BuildingConfig, DEFAULT_BUILDING_CONFIG } from '@/types/buildingEditor';
import { CameraTarget } from '@/components/canvas/CameraController';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { MapControls } from '@/components/ui/MapControls';
import { CampusLoader } from '@/components/ui/CampusLoader';

const CampusCanvas = dynamic(
  () => import('@/components/canvas/CampusCanvas').then((m) => m.CampusCanvas),
  {
    ssr: false,
    loading: () => <CampusLoader status="Initializing 3D WebGL Campus..." />,
  }
);
const BuildingDetailSheet = dynamic(
  () => import('@/components/ui/BuildingDetailSheet').then((m) => m.BuildingDetailSheet),
  { ssr: false }
);
const NavigationDrawer = dynamic(
  () => import('@/components/ui/NavigationDrawer').then((m) => m.NavigationDrawer),
  { ssr: false }
);
const TourPlayer = dynamic(
  () => import('@/components/ui/TourPlayer').then((m) => m.TourPlayer),
  { ssr: false }
);
const CampusLegend = dynamic(
  () => import('@/components/ui/CampusLegend').then((m) => m.CampusLegend),
  { ssr: false }
);

export default function CampusPage() {
  // Raw and processed campus data
  const [campusData, setCampusData] = useState<CampusData | null>(null);
  const [navGraph, setNavGraph] = useState<NavGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(12);
  const [loadStatus, setLoadStatus] = useState('Preparing SIT Digital Campus...');

  // Buildings state (supports editing, duplicating, deleting, moving every building)
  const [buildings, setBuildings] = useState<Building[]>([]);
  const originalBuildingsRef = useRef<Building[]>([]);
  const savedBuildingsRef = useRef<Building[]>([]);

  // Trees state (supports selecting, moving, scaling, and deleting individual campus trees)
  const [trees, setTrees] = useState<TreeInstance[]>([]);
  const originalTreesRef = useRef<TreeInstance[]>([]);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);

  // Undo / Redo history stack (capped at 30 snapshots)
  const [history, setHistory] = useState<Building[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Active selections
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);

  // UI Panels
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [navOriginId, setNavOriginId] = useState<string | undefined>(undefined);
  const [navDestId, setNavDestId] = useState<string | undefined>(undefined);

  // Fresher Tour
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentTourIndex, setCurrentTourIndex] = useState(0);

  // Lighting & Day/Night
  const [simulatedHour, setSimulatedHour] = useState<number>(12); // Default midday
  const [isNightMode, setIsNightMode] = useState(false);
  const [lighting, setLighting] = useState<LightingState>(() => getLightingForHour(12));
  const [useBlenderModel, setUseBlenderModel] = useState(false);

  // Camera Targets
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [is2DView, setIs2DView] = useState(false);

  // 3D Building Calibration & Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale' | null>('translate');
  const [buildingConfig, setBuildingConfig] = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);

  // Helper: Push buildings snapshot to history
  const pushToHistory = useCallback((newBuildings: Building[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      const next = [...upToCurrent, newBuildings];
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  // Load saved building configuration on mount (static JSON + optional localStorage override)
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('sit_building_config');
      if (savedConfig) {
        setBuildingConfig(JSON.parse(savedConfig));
      } else {
        fetch('/data/building_config.json')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.posX === 'number') {
              setBuildingConfig(data);
            }
          })
          .catch(() => {});
      }
    } catch (_) {}
  }, []);

  // Keyboard shortcuts for Edit Mode & Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!isEditMode) return;
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'Escape') setIsEditMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, historyIndex, history]);

  // Load campus data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoadProgress(20);
        setLoadStatus('Loading campus geometry & buildings...');
        const campusPromise = fetch('/data/sit_campus_processed.json').then((res) => res.json());
        const navPromise = fetch('/data/nav_graph.json').then((res) => res.json());

        const cData: CampusData = await campusPromise;
        setLoadProgress(60);
        setLoadStatus('Loading campus walking network...');

        const nData = await navPromise;
        setLoadProgress(85);
        setLoadStatus('Configuring lighting & 3D scene...');

        let initialBuildings = cData.buildings || [];
        originalBuildingsRef.current = JSON.parse(JSON.stringify(initialBuildings));

        // 2. Try localStorage overrides (client takes priority)
        try {
          const localSaved = localStorage.getItem('sit_campus_buildings_overrides');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              initialBuildings = parsed;
            }
          }
        } catch (_) {}

        // Ensure newly added default structures and updated building metadata are synced
        const existingIds = new Set(initialBuildings.map((b) => b.id));
        const missingDefaults = (cData.buildings || []).filter((b) => !existingIds.has(b.id));
        if (missingDefaults.length > 0) {
          initialBuildings = [...initialBuildings, ...missingDefaults];
        }
        // Sync Indoor Sports & Gym Building (canteen-pavilion-c) if cached under old name/1-story
        initialBuildings = initialBuildings.map((b) => {
          if (b.id === 'canteen-pavilion-c' && b.levels === 1) {
            const updatedDef = (cData.buildings || []).find((def) => def.id === 'canteen-pavilion-c');
            if (updatedDef) return { ...b, ...updatedDef, transform: b.transform };
          }
          return b;
        });

        setCampusData(cData);
        setBuildings(initialBuildings);
        savedBuildingsRef.current = JSON.parse(JSON.stringify(initialBuildings));
        setHistory([initialBuildings]);
        setHistoryIndex(0);

        // Initialize interactive campus trees with stable IDs and localStorage overrides
        let initialTrees: TreeInstance[] = (cData.trees || []).map((t, idx) => ({
          ...t,
          id: t.id || `tree-${idx}`,
        }));
        originalTreesRef.current = JSON.parse(JSON.stringify(initialTrees));
        try {
          const savedTrees = localStorage.getItem('sit_campus_trees_overrides');
          if (savedTrees) {
            const parsedTrees = JSON.parse(savedTrees);
            if (Array.isArray(parsedTrees)) {
              initialTrees = parsedTrees;
              const existingTreeIds = new Set(initialTrees.map((t, i) => t.id || `tree-${i}`));
              const missingTrees = (cData.trees || []).filter((t) => t.id && !existingTreeIds.has(t.id));
              if (missingTrees.length > 0) {
                initialTrees = [...initialTrees, ...missingTrees];
              }
            }
          }
        } catch (_) {}
        setTrees(initialTrees);

        setNavGraph(nData);

        // Check local time in Siliguri
        const localH = getSiliguriLocalHour();
        setSimulatedHour(localH);
        const lState = getLightingForHour(localH);
        setLighting(lState);
        setIsNightMode(lState.isNight);

        setLoadProgress(100);
        setLoadStatus('Welcome to SIT 3D Campus');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load campus data:', err);
        setLoadStatus('Unable to load campus data. Please refresh.');
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Update lighting when simulated hour or night toggle changes
  useEffect(() => {
    const lState = getLightingForHour(isNightMode ? 22 : 13);
    setLighting(lState);
  }, [isNightMode]);

  // Handle building selection
  const handleSelectBuilding = useCallback((building: Building) => {
    setSelectedBuilding(building);
    setSelectedAmenity(null);
    setIsTourOpen(false); // pause tour if active

    // Smooth camera pan to selected building
    const [bx, bz] = building.transform?.position
      ? [building.transform.position[0], building.transform.position[2]]
      : building.center;

    setCameraTarget({
      position: [bx + 35, (building.height || 15) + 25, bz + 40],
      target: [bx, (building.height || 15) * 0.4, bz],
    });
  }, []);

  // Handle amenity selection
  const handleSelectAmenity = useCallback((amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setSelectedBuilding(null);
    setIsTourOpen(false);

    const [ax, az] = amenity.center;
    setCameraTarget({
      position: [ax + 40, 30, az + 45],
      target: [ax, 0, az],
    });
  }, []);

  // Toggle Edit Mode
  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (next) {
        // If a building is already selected, focus on it; otherwise default to main academic block
        const targetBldg = selectedBuilding || buildings.find((b) => b.id === 'main-academic-block') || buildings[0];
        if (targetBldg) {
          setSelectedBuilding(targetBldg);
          const [bx, bz] = targetBldg.transform?.position
            ? [targetBldg.transform.position[0], targetBldg.transform.position[2]]
            : targetBldg.center;
          setCameraTarget({
            position: [bx + 35, (targetBldg.height || 16) + 30, bz + 45],
            target: [bx, (targetBldg.height || 16) * 0.4, bz],
          });
        }
      }
      return next;
    });
  }, [buildings, selectedBuilding]);

  // Handle building modification
  const handleChangeBuilding = useCallback(
    (updated: Building) => {
      setBuildings((prev) => {
        const next = prev.map((b) => (b.id === updated.id ? updated : b));
        return next;
      });

      setSelectedBuilding((prev) => (prev?.id === updated.id ? updated : prev));

      // If main academic block was moved or scaled, also sync buildingConfig
      if (updated.id === 'main-academic-block' && updated.transform?.position) {
        setBuildingConfig((prevConfig) => ({
          ...prevConfig,
          posX: updated.transform!.position![0],
          posY: updated.transform!.position![1],
          posZ: updated.transform!.position![2],
          rotY: updated.transform?.rotation ? updated.transform.rotation[1] : prevConfig.rotY,
          scale: updated.transform?.scale ? updated.transform.scale[0] : prevConfig.scale,
        }));
      }

      pushToHistory(
        buildings.map((b) => (b.id === updated.id ? updated : b))
      );
    },
    [buildings, pushToHistory]
  );

  // Handle Duplicate Building
  const handleDuplicateBuilding = useCallback(
    (source: Building) => {
      const newId = `${source.id}-copy-${Date.now()}`;
      const [origX, origZ] = source.transform?.position
        ? [source.transform.position[0], source.transform.position[2]]
        : source.center;

      const duplicated: Building = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        shortName: `${source.shortName || source.name} (Copy)`.slice(0, 16),
        isCustom: true,
        transform: {
          position: [origX + 15, source.transform?.position?.[1] || 0, origZ + 15],
          rotation: source.transform?.rotation ? [...source.transform.rotation] : [0, 0, 0],
          scale: source.transform?.scale ? [...source.transform.scale] : [1, 1, 1],
        },
      };

      const nextBuildings = [...buildings, duplicated];
      setBuildings(nextBuildings);
      setSelectedBuilding(duplicated);
      pushToHistory(nextBuildings);

      // Pan camera to duplicate
      setCameraTarget({
        position: [origX + 50, (duplicated.height || 15) + 30, origZ + 55],
        target: [origX + 15, (duplicated.height || 15) * 0.4, origZ + 15],
      });
    },
    [buildings, pushToHistory]
  );

  // Handle Delete Building
  const handleDeleteBuilding = useCallback(
    (bldg: Building) => {
      const nextBuildings = buildings.filter((b) => b.id !== bldg.id);
      setBuildings(nextBuildings);
      setSelectedBuilding(nextBuildings[0] || null);
      pushToHistory(nextBuildings);
    },
    [buildings, pushToHistory]
  );

  // Handle Add New Campus Building
  const handleAddBuilding = useCallback(() => {
    const timestamp = Date.now();
    const newId = `campus-block-${timestamp}`;
    const cx = selectedBuilding?.center[0] || 0;
    const cz = (selectedBuilding?.center[1] || 0) + 20;

    // Default rectangular footprint: 22m x 14m
    const hw = 11;
    const hd = 7;
    const newBuilding: Building = {
      id: newId,
      osmId: timestamp,
      name: `New Technology & Academic Block`,
      shortName: `Tech Block ${buildings.length + 1}`,
      category: 'academic',
      levels: 3,
      height: 12.0,
      color: '#f5ede0',
      accentColor: '#3b82f6',
      description: 'Newly constructed modular technology block for academic laboratories and computer facilities.',
      floors: [
        { level: 0, name: 'Ground Floor', rooms: [{ code: 'GF-01', name: 'Computer Lab A', type: 'lab' }] },
        { level: 1, name: 'First Floor', rooms: [{ code: 'FF-01', name: 'Software Lab B', type: 'lab' }] },
        { level: 2, name: 'Second Floor', rooms: [{ code: 'SF-01', name: 'Seminar Hall', type: 'hall' }] },
      ],
      center: [cx, cz],
      centerGeo: [26.769, 88.376],
      polygon: [
        [cx - hw, cz - hd],
        [cx + hw, cz - hd],
        [cx + hw, cz + hd],
        [cx - hw, cz + hd],
      ],
      entrance: [cx, cz - hd],
      elevation: 0,
      visible: true,
      isCustom: true,
      transform: {
        position: [cx, 0, cz],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    };

    const nextBuildings = [...buildings, newBuilding];
    setBuildings(nextBuildings);
    setSelectedBuilding(newBuilding);
    pushToHistory(nextBuildings);

    setCameraTarget({
      position: [cx + 35, 30, cz + 40],
      target: [cx, 6, cz],
    });
  }, [buildings, selectedBuilding, pushToHistory]);

  // Handle Reset Single Building Transform
  const handleResetBuildingTransform = useCallback(
    (bldg: Building) => {
      const orig = originalBuildingsRef.current.find((b) => b.id === bldg.id);
      if (!orig) return;

      const [cx, cz] = orig.center;
      const resetBldg: Building = {
        ...bldg,
        height: orig.height,
        levels: orig.levels,
        color: orig.color,
        accentColor: orig.accentColor,
        visible: true,
        transform: {
          position: [cx, orig.elevation || 0, cz],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      };

      if (bldg.id === 'main-academic-block') {
        setBuildingConfig(DEFAULT_BUILDING_CONFIG);
      }

      const nextBuildings = buildings.map((b) => (b.id === bldg.id ? resetBldg : b));
      setBuildings(nextBuildings);
      setSelectedBuilding(resetBldg);
      pushToHistory(nextBuildings);
    },
    [buildings, pushToHistory]
  );

  // Handle Reset All Buildings to Factory Defaults
  const handleResetAllBuildings = useCallback(() => {
    const defaults = JSON.parse(JSON.stringify(originalBuildingsRef.current));
    setBuildings(defaults);
    savedBuildingsRef.current = JSON.parse(JSON.stringify(defaults));
    setSelectedBuilding(defaults[0] || null);
    setBuildingConfig(DEFAULT_BUILDING_CONFIG);
    setHistory([defaults]);
    setHistoryIndex(0);

    try {
      localStorage.removeItem('sit_campus_buildings_overrides');
      localStorage.removeItem('sit_building_config');
    } catch (_) {}

    // Also persist defaults to server API
    fetch('/api/save-buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buildings: defaults, config: DEFAULT_BUILDING_CONFIG }),
    }).catch(() => {});
  }, []);

  // Handle Save All Changes Permanently
  const handleSaveAll = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Save to localStorage for instant local persistence
      localStorage.setItem('sit_campus_buildings_overrides', JSON.stringify(buildings));
      localStorage.setItem('sit_building_config', JSON.stringify(buildingConfig));

      // 2. Persist to API route
      const res = await fetch('/api/save-buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildings,
          config: buildingConfig,
        }),
      });

      const data = await res.json();
      if (data.success) {
        savedBuildingsRef.current = JSON.parse(JSON.stringify(buildings));
        return true;
      } else {
        alert(data.error || 'Failed to save campus buildings to disk');
        return false;
      }
    } catch (err: any) {
      console.error('Error saving buildings:', err);
      alert('Error saving buildings: ' + err.message);
      return false;
    }
  }, [buildings, buildingConfig]);

  // Handle Cancel / Revert
  const handleCancelChanges = useCallback(() => {
    const reverted = JSON.parse(JSON.stringify(savedBuildingsRef.current));
    setBuildings(reverted);
    if (selectedBuilding) {
      const match = reverted.find((b: Building) => b.id === selectedBuilding.id);
      setSelectedBuilding(match || reverted[0] || null);
    }
  }, [selectedBuilding]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const targetState = history[prevIdx];
      setBuildings(targetState);
      setHistoryIndex(prevIdx);
      if (selectedBuilding) {
        const match = targetState.find((b) => b.id === selectedBuilding.id);
        setSelectedBuilding(match || targetState[0] || null);
      }
    }
  }, [history, historyIndex, selectedBuilding]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetState = history[nextIdx];
      setBuildings(targetState);
      setHistoryIndex(nextIdx);
      if (selectedBuilding) {
        const match = targetState.find((b) => b.id === selectedBuilding.id);
        setSelectedBuilding(match || targetState[0] || null);
      }
    }
  }, [history, historyIndex, selectedBuilding]);

  // Navigation handlers
  const handleNavigateToBuilding = useCallback((building: Building) => {
    setNavDestId(building.id);
    setIsNavDrawerOpen(true);
  }, []);

  const handleStartRouteFromBuilding = useCallback((building: Building) => {
    setNavOriginId(building.id);
    setIsNavDrawerOpen(true);
  }, []);

  // Fresher Tour handlers
  const handleSelectTourStop = useCallback(
    (index: number) => {
      if (!campusData || !campusData.tourStops[index]) return;
      setCurrentTourIndex(index);
      const stop = campusData.tourStops[index];

      setSelectedBuilding(null);
      setSelectedAmenity(null);
      setIs2DView(false);

      setCameraTarget({
        position: [...stop.cameraPosition] as [number, number, number],
        target: [...stop.targetPosition] as [number, number, number],
      });
    },
    [campusData]
  );

  const handleStartTour = useCallback(() => {
    setIsTourOpen(true);
    setIsNavDrawerOpen(false);
    handleSelectTourStop(0);
  }, [handleSelectTourStop]);

  const handleNextTourStop = useCallback(() => {
    if (!campusData) return;
    if (currentTourIndex < campusData.tourStops.length - 1) {
      handleSelectTourStop(currentTourIndex + 1);
    }
  }, [campusData, currentTourIndex, handleSelectTourStop]);

  const handlePrevTourStop = useCallback(() => {
    if (currentTourIndex > 0) {
      handleSelectTourStop(currentTourIndex - 1);
    }
  }, [currentTourIndex, handleSelectTourStop]);

  // Map Controls
  const handleZoomIn = () => {
    setCameraTarget((prev) => {
      const cur = prev?.position || [70, 75, 110];
      return {
        position: [cur[0] * 0.82, cur[1] * 0.82, cur[2] * 0.82],
        target: prev?.target || [0, 0, 0],
      };
    });
  };

  const handleZoomOut = () => {
    setCameraTarget((prev) => {
      const cur = prev?.position || [70, 75, 110];
      return {
        position: [cur[0] * 1.22, cur[1] * 1.22, cur[2] * 1.22],
        target: prev?.target || [0, 0, 0],
      };
    });
  };

  const handleResetNorth = () => {
    setCameraTarget((prev) => ({
      position: [0, 95, 130],
      target: [0, 0, 0],
    }));
  };

  const handleToggle2D3D = () => {
    setIs2DView((prev) => {
      const next = !prev;
      if (next) {
        setCameraTarget({
          position: [0, 220, 0.1],
          target: [0, 0, 0],
        });
      } else {
        setCameraTarget({
          position: [62, 26, -78],
          target: [8, 7, -8],
        });
      }
      return next;
    });
  };

  const handleCampusOverview = () => {
    setSelectedBuilding(null);
    setSelectedAmenity(null);
    setIs2DView(false);
    setCameraTarget({
      position: [62, 26, -78],
      target: [8, 7, -8],
    });
  };

  // Tree Selection & Editing Handlers
  const handleSelectTree = useCallback((treeId: string) => {
    setSelectedTreeId(treeId);
    setSelectedBuilding(null);
    setSelectedAmenity(null);
  }, []);

  const handleUpdateTree = useCallback((treeId: string, updated: TreeInstance) => {
    setTrees((prev) => {
      const next = prev.map((t, i) => ((t.id || `tree-${i}`) === treeId ? updated : t));
      try {
        localStorage.setItem('sit_campus_trees_overrides', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const handleDeleteTree = useCallback((treeId: string) => {
    setTrees((prev) => {
      const next = prev.filter((t, i) => (t.id || `tree-${i}`) !== treeId);
      try {
        localStorage.setItem('sit_campus_trees_overrides', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    setSelectedTreeId(null);
  }, []);

  const handleResetTrees = useCallback(() => {
    const restored = JSON.parse(JSON.stringify(originalTreesRef.current));
    setTrees(restored);
    setSelectedTreeId(null);
    try {
      localStorage.removeItem('sit_campus_trees_overrides');
    } catch (_) {}
  }, []);

  const selectedTree = useMemo(
    () => trees.find((t, i) => (t.id || `tree-${i}`) === selectedTreeId) || null,
    [trees, selectedTreeId]
  );

  // Active combined campus data including live edited buildings & trees
  const activeCampusData: CampusData | null = useMemo(() => {
    if (!campusData) return null;
    return {
      ...campusData,
      buildings,
      trees,
    };
  }, [campusData, buildings, trees]);

  const handleDeselect = useCallback(() => {
    setSelectedBuilding(null);
    setSelectedAmenity(null);
  }, []);

  const handleCameraTransitionEnd = useCallback(() => {
    setCameraTarget(null);
  }, []);

  const handleNoopHover = useCallback((_b: Building | null) => {}, []);

  const handleCanvasSelectBuilding = useCallback(
    (b: Building) => {
      setIsTourOpen(false);
      handleSelectBuilding(b);
    },
    [handleSelectBuilding]
  );

  const handleCanvasSelectAmenity = useCallback(
    (a: Amenity) => {
      setIsTourOpen(false);
      handleSelectAmenity(a);
    },
    [handleSelectAmenity]
  );

  if (isLoading || !activeCampusData || !navGraph) {
    return (
      <div className="w-screen h-[100dvh]">
        <CampusLoader progress={loadProgress} status={loadStatus} />
      </div>
    );
  }

  return (
    <main className="w-screen h-[100dvh] relative overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas */}
      <CampusCanvas
        campusData={activeCampusData}
        selectedBuilding={selectedBuilding}
        selectedAmenity={selectedAmenity}
        hoveredBuilding={null}
        activeRoute={activeRoute}
        cameraTarget={cameraTarget}
        lighting={lighting}
        useBlenderModel={false}
        config={buildingConfig}
        isEditMode={false}
        transformMode={null}
        onSelectBuilding={handleCanvasSelectBuilding}
        onSelectAmenity={handleCanvasSelectAmenity}
        onHoverBuilding={handleNoopHover}
        onDeselect={handleDeselect}
        onCameraTransitionEnd={handleCameraTransitionEnd}
      />

      {/* Top Application Header */}
      <Header
        isNight={isNightMode}
        onToggleDayNight={() => setIsNightMode(!isNightMode)}
        onStartTour={() => {
          setIsNavDrawerOpen(false);
          setSelectedBuilding(null);
          handleStartTour();
        }}
        onOpenNavDrawer={() => {
          setIsTourOpen(false);
          setIsNavDrawerOpen(true);
        }}
        onResetView={() => {
          setIsTourOpen(false);
          setIsNavDrawerOpen(false);
          handleCampusOverview();
        }}
        isTourActive={isTourOpen}
      />

      {/* Search Bar & Autocomplete */}
      <SearchBar
        buildings={buildings}
        amenities={activeCampusData.amenities}
        onSelectBuilding={handleSelectBuilding}
        onSelectAmenity={handleSelectAmenity}
        onFocusSearchTarget={setCameraTarget}
      />

      {/* Building & Floor Explorer Details Sheet (Lazy-loaded on selection) */}
      {selectedBuilding && (
        <BuildingDetailSheet
          key={selectedBuilding.id}
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          onNavigateToBuilding={handleNavigateToBuilding}
          onStartRouteFromBuilding={handleStartRouteFromBuilding}
        />
      )}

      {/* Walking Navigation Drawer (Lazy-loaded on open) */}
      {isNavDrawerOpen && (
        <NavigationDrawer
          isOpen={isNavDrawerOpen}
          onClose={() => setIsNavDrawerOpen(false)}
          buildings={buildings}
          amenities={activeCampusData.amenities}
          navGraph={navGraph}
          activeRoute={activeRoute}
          onApplyRoute={setActiveRoute}
          preselectedOriginId={navOriginId}
          preselectedDestId={navDestId}
        />
      )}

      {/* Fresher Orientation Guided Tour Controller (Lazy-loaded on start) */}
      {isTourOpen && (
        <TourPlayer
          stops={activeCampusData.tourStops}
          currentStopIndex={currentTourIndex}
          isOpen={isTourOpen}
          onNextStop={handleNextTourStop}
          onPrevStop={handlePrevTourStop}
          onSelectStop={handleSelectTourStop}
          onClose={() => setIsTourOpen(false)}
        />
      )}

      {/* Map Navigation Controls (Zoom, Compass, 2D/3D, Overview) */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetNorth={handleResetNorth}
        onToggle2D3D={handleToggle2D3D}
        onOverview={handleCampusOverview}
        is2DView={is2DView}
      />

      {/* Campus Facility Color Legend */}
      <CampusLegend />
    </main>
  );
}
