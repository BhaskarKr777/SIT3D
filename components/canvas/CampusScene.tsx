'use client';

import React, { useState, useEffect } from 'react';
import { CampusData, Building, Amenity, RouteResult, TreeInstance } from '@/types/campus';
import { BuildingConfig } from '@/types/buildingEditor';
import { LightingState } from '@/lib/sunPosition';
import { CameraTarget, CameraController } from './CameraController';
import { EnvironmentLighting } from './EnvironmentLighting';
import { CampusTerrain } from './CampusTerrain';
import { BuildingMesh } from './BuildingMesh';
import { AmenitiesMesh } from './AmenitiesMesh';
import { RoadsMesh } from './RoadsMesh';
import { FoliageInstanced } from './FoliageInstanced';
import { RouteRibbon } from './RouteRibbon';
import { BlenderCampusModel } from './BlenderCampusModel';
import { CampusStreetlights } from './CampusStreetlights';
import { RiverAndBridges } from './RiverAndBridges';
import { GreenBoundaryGarden } from './GreenBoundaryGarden';
import { TeaGardenSurround } from './TeaGardenSurround';
import { NeighborhoodBuildings } from './NeighborhoodBuildings';

interface CampusSceneProps {
  campusData: CampusData;
  selectedBuilding: Building | null;
  selectedAmenity: Amenity | null;
  selectedTreeId?: string | null;
  hoveredBuilding: Building | null;
  activeRoute: RouteResult | null;
  cameraTarget: CameraTarget | null;
  lighting: LightingState;
  useBlenderModel?: boolean;
  config?: BuildingConfig;
  isEditMode?: boolean;
  transformMode?: 'translate' | 'rotate' | 'scale' | null;
  onChangeConfig?: (c: BuildingConfig) => void;
  onChangeBuilding?: (b: Building) => void;
  onSelectBuilding: (b: Building) => void;
  onSelectAmenity: (a: Amenity) => void;
  onSelectTree?: (treeId: string) => void;
  onUpdateTree?: (treeId: string, updated: TreeInstance) => void;
  onHoverBuilding: (b: Building | null) => void;
  onCameraTransitionEnd?: () => void;
}

const MemoCampusTerrain = React.memo(CampusTerrain);
const MemoRoadsMesh = React.memo(RoadsMesh);
const MemoRiverAndBridges = React.memo(RiverAndBridges);
const MemoGreenBoundaryGarden = React.memo(GreenBoundaryGarden);
const MemoTeaGardenSurround = React.memo(TeaGardenSurround);
const MemoNeighborhoodBuildings = React.memo(NeighborhoodBuildings);
const MemoFoliageInstanced = React.memo(FoliageInstanced);
const MemoCampusStreetlights = React.memo(CampusStreetlights);
const MemoBuildingMesh = React.memo(BuildingMesh);

export function CampusScene({
  campusData,
  selectedBuilding,
  selectedAmenity,
  selectedTreeId = null,
  hoveredBuilding,
  activeRoute,
  cameraTarget,
  lighting,
  useBlenderModel = false,
  config,
  isEditMode = false,
  transformMode = null,
  onChangeConfig,
  onChangeBuilding,
  onSelectBuilding,
  onSelectAmenity,
  onSelectTree,
  onUpdateTree,
  onHoverBuilding,
  onCameraTransitionEnd,
}: CampusSceneProps) {
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  const [showSurroundLayers, setShowSurroundLayers] = useState(false);

  // Progressively mount distant surround layers after initial hero campus frame renders
  useEffect(() => {
    const id = window.setTimeout(() => setShowSurroundLayers(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  // In Edit Mode, always use the editable procedural model so the user sees their live changes
  const showBlender = useBlenderModel && !isEditMode;

  // Filter out any procedural trees that collide with the rear parking area or the basketball court & sitting bench area
  const filteredTrees = React.useMemo(() => {
    return campusData.trees.filter((t) => {
      const [x, , z] = t.position;
      if (t.id && t.id.startsWith('sg-border-tree-')) return true;
      const isInsideRearParking = x >= -32 && x <= 6 && z >= 18 && z <= 42;
      const isInsideBasketballCourt = x >= -64 && x <= -24 && z >= -87 && z <= -48;
      const isInsideVolleyballCourt = x >= 92 && x <= 117 && z >= -3 && z <= 12;
      const isInsideSportsGround = x >= 10 && x <= 102 && z >= 119 && z <= 243;
      return !isInsideRearParking && !isInsideBasketballCourt && !isInsideVolleyballCourt && !isInsideSportsGround;
    });
  }, [campusData.trees]);

  return (
    <>
      <EnvironmentLighting lighting={lighting} />
      <CameraController
        cameraTarget={cameraTarget}
        enabled={!isDraggingGizmo}
        onTransitionEnd={onCameraTransitionEnd}
      />

      {showBlender ? (
        /* Blender Modeled 3D Campus (Buildings, Roofs, Parapets, Terrain, Roads) */
        <BlenderCampusModel
          campusData={campusData}
          selectedBuilding={selectedBuilding}
          hoveredBuilding={hoveredBuilding}
          selectedAmenity={selectedAmenity}
          isNight={lighting.isNight}
          windowGlowIntensity={lighting.windowGlowIntensity}
          onSelectBuilding={onSelectBuilding}
          onHoverBuilding={onHoverBuilding}
          onSelectAmenity={onSelectAmenity}
        />
      ) : (
        /* Procedural Fallback / Live Editable Mesh Mode */
        <>
          <MemoCampusTerrain boundary={campusData.boundary} />
          <MemoRoadsMesh roads={campusData.roads} paths={campusData.paths} />
          <MemoRiverAndBridges isNight={lighting.isNight} />
          {showSurroundLayers && (
            <>
              <MemoGreenBoundaryGarden
                boundary={campusData.boundary}
                buildings={campusData.buildings}
                roads={campusData.roads}
                isNight={lighting.isNight}
              />
              <MemoTeaGardenSurround boundary={campusData.boundary} roads={campusData.roads} />
              <MemoNeighborhoodBuildings
                boundary={campusData.boundary}
                roads={campusData.roads}
                isNight={lighting.isNight}
                windowGlowIntensity={lighting.windowGlowIntensity}
              />
            </>
          )}
          <AmenitiesMesh
            amenities={campusData.amenities}
            selectedAmenityId={selectedAmenity?.id}
            isNight={lighting.isNight}
            onSelectAmenity={onSelectAmenity}
          />
          <group>
            {campusData.buildings.map((building) => (
              <MemoBuildingMesh
                key={building.id}
                building={building}
                isSelected={selectedBuilding?.id === building.id}
                isHovered={hoveredBuilding?.id === building.id}
                isNight={lighting.isNight}
                windowGlowIntensity={lighting.windowGlowIntensity}
                config={config}
                isEditMode={isEditMode}
                transformMode={transformMode}
                onChangeConfig={onChangeConfig}
                onChangeBuilding={onChangeBuilding}
                onTransformDraggingChanged={setIsDraggingGizmo}
                onSelect={onSelectBuilding}
                onHover={onHoverBuilding}
              />
            ))}
          </group>
          <MemoFoliageInstanced
            trees={filteredTrees}
            selectedTreeId={selectedTreeId}
            isEditMode={isEditMode}
            transformMode={transformMode}
            onSelectTree={onSelectTree}
            onUpdateTree={onUpdateTree}
            onTransformDraggingChanged={setIsDraggingGizmo}
          />
        </>
      )}

      {/* Campus-Wide Streetlights along All Internal Roads */}
      <MemoCampusStreetlights roads={campusData.roads} isNight={lighting.isNight} />

      {/* Walking Navigation Glowing Tube & Pins (Always Active) */}
      <RouteRibbon route={activeRoute} />
    </>
  );
}
