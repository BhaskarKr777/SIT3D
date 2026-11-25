'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CampusData, Building, Amenity, RouteResult, TreeInstance } from '@/types/campus';
import { BuildingConfig } from '@/types/buildingEditor';
import { LightingState } from '@/lib/sunPosition';
import { CameraTarget } from './CameraController';
import { CampusScene } from './CampusScene';

interface CampusCanvasProps {
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
  onDeselect?: () => void;
  onCameraTransitionEnd?: () => void;
}

export function CampusCanvas(props: CampusCanvasProps) {
  const initialFov = typeof window !== 'undefined' && window.innerWidth < 640 ? 56 : 45;

  return (
    <div className="w-full h-full relative select-none overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        camera={{
          position: [62, 26, -78],
          fov: initialFov,
          near: 1,
          far: 800,
        }}
        onPointerMissed={(e) => {
          // Deselect building when clicking on empty space
          if (props.onDeselect) {
            props.onDeselect();
          }
        }}
      >
        <Suspense fallback={null}>
          <CampusScene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
