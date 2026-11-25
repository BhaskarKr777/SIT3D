'use client';

import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CampusData, Building, Amenity } from '@/types/campus';

interface BlenderCampusModelProps {
  campusData: CampusData;
  selectedBuilding: Building | null;
  hoveredBuilding: Building | null;
  selectedAmenity: Amenity | null;
  isNight: boolean;
  windowGlowIntensity: number;
  onSelectBuilding: (b: Building) => void;
  onHoverBuilding: (b: Building | null) => void;
  onSelectAmenity: (a: Amenity) => void;
}

export function BlenderCampusModel({
  campusData,
  selectedBuilding,
  hoveredBuilding,
  selectedAmenity,
  isNight,
  windowGlowIntensity,
  onSelectBuilding,
  onHoverBuilding,
  onSelectAmenity,
}: BlenderCampusModelProps) {
  const gltf = useGLTF('/models/sit_campus.glb');
  const groupRef = useRef<THREE.Group>(null);
  const [localHoverId, setLocalHoverId] = useState<string | null>(null);

  // Map of building ID to Building object
  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    for (const b of campusData.buildings) {
      map.set(b.id, b);
      map.set(`Building_${b.id}`, b);
    }
    return map;
  }, [campusData.buildings]);

  // Clone GLTF scene to prevent mutating shared cache
  const clonedScene = useMemo(() => {
    return gltf.scene.clone(true);
  }, [gltf.scene]);

  // Apply materials, shadow casting, and custom properties
  useMemo(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Extract building ID from userData or object name
        const bId = (mesh.userData && mesh.userData.buildingId) || mesh.name.replace('Building_', '');
        const building = buildingMap.get(bId) || buildingMap.get(mesh.name);

        if (building && mesh.material) {
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;

          const isSelected = selectedBuilding?.id === building.id;
          const isHovered = hoveredBuilding?.id === building.id || localHoverId === building.id;

          if (isSelected) {
            mat.emissive = new THREE.Color('#2563eb');
            mat.emissiveIntensity = 0.5;
          } else if (isHovered) {
            mat.emissive = new THREE.Color('#38bdf8');
            mat.emissiveIntensity = 0.3;
          } else if (isNight) {
            mat.emissive = new THREE.Color('#ca8a04');
            mat.emissiveIntensity = windowGlowIntensity * 0.35;
          } else {
            mat.emissive = new THREE.Color('#000000');
            mat.emissiveIntensity = 0;
          }

          mesh.material = mat;
        }
      }
    });
  }, [clonedScene, buildingMap, selectedBuilding, hoveredBuilding, localHoverId, isNight, windowGlowIntensity]);

  // Subtle floating bounce animation for selected building
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    clonedScene.traverse((child) => {
      const bId = (child.userData && child.userData.buildingId) || child.name.replace('Building_', '');
      if (selectedBuilding && (bId === selectedBuilding.id || child.name === `Building_${selectedBuilding.id}`)) {
        child.position.y = 0.2 + Math.sin(t * 3) * 0.15;
      } else if (child.name.startsWith('Building_')) {
        child.position.y = 0;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        onClick={(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
          e.stopPropagation();
          let current: THREE.Object3D | null = e.object;
          while (current) {
            const bId =
              (current.userData && current.userData.buildingId) ||
              current.name.replace('Building_', '');
            const b = buildingMap.get(bId) || buildingMap.get(current.name);
            if (b) {
              onSelectBuilding(b);
              return;
            }
            if (current.name.startsWith('Amenity_')) {
              const aId = current.name.replace('Amenity_', '');
              const a = campusData.amenities.find((item) => item.id === aId || `amenity-${item.osmId}` === aId);
              if (a) {
                onSelectAmenity(a);
                return;
              }
            }
            current = current.parent;
          }
        }}
        onPointerOver={(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
          e.stopPropagation();
          let current: THREE.Object3D | null = e.object;
          while (current) {
            const bId =
              (current.userData && current.userData.buildingId) ||
              current.name.replace('Building_', '');
            const b = buildingMap.get(bId) || buildingMap.get(current.name);
            if (b) {
              setLocalHoverId(b.id);
              onHoverBuilding(b);
              return;
            }
            current = current.parent;
          }
        }}
        onPointerOut={() => {
          setLocalHoverId(null);
          onHoverBuilding(null);
        }}
      />

      {/* Floating 3D Labels for key campus buildings */}
      {campusData.buildings.map((building) => {
        const [cx, cz] = building.center;
        const isSelected = selectedBuilding?.id === building.id;
        const isHovered = hoveredBuilding?.id === building.id || localHoverId === building.id;

        if (
          !isSelected &&
          !isHovered &&
          building.category !== 'academic' &&
          building.category !== 'administrative'
        ) {
          return null;
        }

        return (
          <group key={building.id} position={[cx, building.height + 3, cz]}>
            <Html center distanceFactor={90} zIndexRange={[100, 0]}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBuilding(building);
                }}
                className={`cursor-pointer px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-md transition-all duration-200 pointer-events-auto flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white ring-2 ring-white scale-110'
                    : isHovered
                    ? 'bg-slate-900/90 text-white ring-1 ring-blue-400'
                    : 'bg-slate-900/75 text-slate-200 backdrop-blur-sm border border-slate-700/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: building.accentColor }}
                />
                <span>{building.shortName}</span>
                {building.levels > 1 && (
                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1 rounded">
                    {building.levels}F
                  </span>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload('/models/sit_campus.glb');
