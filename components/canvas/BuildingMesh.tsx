'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { Building } from '@/types/campus';
import { BuildingConfig } from '@/types/buildingEditor';
import { getBuildingGroundHeight, getRecommendedFoundationDepth } from '@/lib/terrainElevation';
import { MainBuildingDetailed } from './MainBuildingDetailed';
import { BasketballCourtFacility } from './BasketballCourtFacility';
import { CentralGardenDetailed } from './CentralGardenDetailed';
import { CourtSittingBenchArea } from './AmenitiesMesh';
import { BuildingFacadeDetails } from './BuildingFacadeDetails';

interface BuildingMeshProps {
  building: Building;
  isSelected: boolean;
  isHovered: boolean;
  isNight: boolean;
  windowGlowIntensity: number;
  config?: BuildingConfig;
  isEditMode?: boolean;
  transformMode?: 'translate' | 'rotate' | 'scale' | null;
  onChangeConfig?: (c: BuildingConfig) => void;
  onChangeBuilding?: (b: Building) => void;
  onTransformDraggingChanged?: (isDragging: boolean) => void;
  onSelect: (building: Building) => void;
  onHover: (building: Building | null) => void;
}

export function BuildingMesh({
  building,
  isSelected,
  isHovered,
  isNight,
  windowGlowIntensity,
  config,
  isEditMode = false,
  transformMode = null,
  onChangeConfig,
  onChangeBuilding,
  onTransformDraggingChanged,
  onSelect,
  onHover,
}: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [localHover, setLocalHover] = useState(false);

  // Generate 2D Three.js Shape from building polygon contour
  const { shape, centerOffset } = useMemo(() => {
    const s = new THREE.Shape();
    const pts = building.polygon;
    if (!pts || pts.length < 3) {
      return { shape: null, centerOffset: [0, 0] as [number, number] };
    }

    // Centroid of building
    const [cx, cz] = building.center;

    // Shift coordinates relative to building centroid so mesh rotation/scaling works around center
    s.moveTo(pts[0][0] - cx, -(pts[0][1] - cz));
    for (let i = 1; i < pts.length; i++) {
      s.lineTo(pts[i][0] - cx, -(pts[i][1] - cz));
    }
    s.closePath();

    return { shape: s, centerOffset: [cx, cz] as [number, number] };
  }, [building.polygon, building.center]);

  // Main Building Body Extrusion Geometry
  const geometry = useMemo(() => {
    if (!shape) return null;
    return new THREE.ExtrudeGeometry(shape, {
      depth: building.height,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelSegments: 2,
    });
  }, [shape, building.height]);

  // Subterranean Concrete Foundation Plinth (anchors building 0.45m into terrain)
  const foundationDepth = useMemo(() => getRecommendedFoundationDepth(building), [building]);

  const foundationGeometry = useMemo(() => {
    if (!shape) return null;
    return new THREE.ExtrudeGeometry(shape, {
      depth: foundationDepth,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.18,
      bevelSegments: 1,
    });
  }, [shape, foundationDepth]);

  // Roof geometry for contrasting architectural roof cap
  const roofGeometry = useMemo(() => {
    if (!shape) return null;
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.35,
      bevelSegments: 1,
    });
  }, [shape]);

  // Compute terrain-grounded Y coordinate (guaranteed zero floating)
  const groundedY = useMemo(() => getBuildingGroundHeight(building), [building]);

  // Resolved 3D coordinates based on transform overrides or terrain-aware positioning
  const [cx, cz] = centerOffset;
  const posX = building.transform?.position ? building.transform.position[0] : cx;
  const posY = building.transform?.position && typeof building.transform.position[1] === 'number' && building.transform.position[1] < 20
    ? building.transform.position[1]
    : groundedY;
  const posZ = building.transform?.position ? building.transform.position[2] : cz;

  const rotX = building.transform?.rotation ? building.transform.rotation[0] : 0;
  const rotY = building.transform?.rotation ? building.transform.rotation[1] : 0;
  const rotZ = building.transform?.rotation ? building.transform.rotation[2] : 0;

  const scaleX = building.transform?.scale ? building.transform.scale[0] : 1;
  const scaleY = building.transform?.scale ? building.transform.scale[1] : 1;
  const scaleZ = building.transform?.scale ? building.transform.scale[2] : 1;

  // Local entrance offset relative to building center
  const entranceOffset = useMemo(() => {
    if (!building.entrance) return null;
    return [building.entrance[0] - cx, building.entrance[1] - cz] as [number, number];
  }, [building.entrance, cx, cz]);

  // Sync transform onto groupRef when building transform changes externally
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(posX, posY, posZ);
      groupRef.current.rotation.set(rotX, rotY, rotZ);
      groupRef.current.scale.set(scaleX, scaleY, scaleZ);
    }
  }, [posX, posY, posZ, rotX, rotY, rotZ, scaleX, scaleY, scaleZ]);

  // Materials
  const baseColor = useMemo(() => {
    if (isSelected) return '#3b82f6';
    if (isHovered || localHover) return '#60a5fa';
    return building.color || '#cbd5e1';
  }, [isSelected, isHovered, localHover, building.color]);

  // Keep selected building firmly grounded without bobbing detached from its facade
  useFrame(() => {
    if (meshRef.current && meshRef.current.position.y !== 0) {
      meshRef.current.position.y = 0;
    }
  });

  // Skip old academic porch as its portico is fully integrated into MainBuildingDetailed
  if (building.id === 'academic-porch') {
    return null;
  }

  // Hidden buildings: if hidden and not in edit mode, don't render
  if (building.visible === false && !isEditMode) {
    return null;
  }

  if (building.id === 'main-academic-block') {
    return (
      <MainBuildingDetailed
        building={building}
        isSelected={isSelected}
        isHovered={isHovered}
        isNight={isNight}
        windowGlowIntensity={windowGlowIntensity}
        config={config}
        isEditMode={isEditMode}
        transformMode={transformMode}
        onChangeConfig={onChangeConfig}
        onTransformDraggingChanged={onTransformDraggingChanged}
        onSelect={onSelect}
        onHover={onHover}
      />
    );
  }

  const isBasketballCourt = building.id.startsWith('basketball-court');
  const isCentralGarden = building.id.startsWith('central-garden');
  const isEntranceGate = building.id.startsWith('entrance-gate-arch');
  const isSittingBenchArea = building.id.startsWith('sitting-bench-area');
  const isVolleyballCourt = building.id.startsWith('volleyball-court');

  if (!isBasketballCourt && !isCentralGarden && !isEntranceGate && !isSittingBenchArea && !isVolleyballCourt && (!geometry || !shape)) return null;

  const isHighlighted = isSelected || isHovered || localHover;
  const isGhosted = building.visible === false;

  return (
    <>
      <group
        ref={groupRef}
        position={[posX, posY, posZ]}
        rotation={[rotX, rotY, rotZ]}
        scale={[scaleX, scaleY, scaleZ]}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          onSelect(building);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setLocalHover(true);
          onHover(building);
        }}
        onPointerOut={() => {
          setLocalHover(false);
          onHover(null);
        }}
      >
        {isBasketballCourt ? (
          <BasketballCourtFacility
            position={[0, 0, 0]}
            rotationY={0}
            isNight={isNight}
            isSelected={isSelected}
            courtColor={building.color}
            accentColor={building.accentColor}
            onClick={() => onSelect(building)}
            onPointerOver={() => {
              setLocalHover(true);
              onHover(building);
            }}
            onPointerOut={() => {
              setLocalHover(false);
              onHover(null);
            }}
          />
        ) : isCentralGarden ? (
          <CentralGardenDetailed
            polygon={building.polygon}
            center={building.center}
            isSelected={isSelected}
            isNight={isNight}
            onClick={() => onSelect(building)}
            onPointerOver={() => {
              setLocalHover(true);
              onHover(building);
            }}
            onPointerOut={() => {
              setLocalHover(false);
              onHover(null);
            }}
          />
        ) : isEntranceGate ? (
          <group
            onClick={(e) => {
              e.stopPropagation();
              onSelect(building);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setLocalHover(true);
              onHover(building);
            }}
            onPointerOut={() => {
              setLocalHover(false);
              onHover(null);
            }}
          >
            {/* Gate Pillars */}
            <mesh position={[-3.5, 2.5, 0]} castShadow>
              <boxGeometry args={[0.8, 5, 0.8]} />
              <meshStandardMaterial color={isSelected ? '#3b82f6' : (building.color || '#1e293b')} />
            </mesh>
            <mesh position={[3.5, 2.5, 0]} castShadow>
              <boxGeometry args={[0.8, 5, 0.8]} />
              <meshStandardMaterial color={isSelected ? '#3b82f6' : (building.color || '#1e293b')} />
            </mesh>
            {/* Arch Beam */}
            <mesh position={[0, 4.8, 0]} castShadow>
              <boxGeometry args={[7.8, 0.6, 0.8]} />
              <meshStandardMaterial color={isSelected ? '#60a5fa' : (building.accentColor || '#0284c7')} />
            </mesh>
          </group>
        ) : isSittingBenchArea ? (
          <CourtSittingBenchArea
            position={[0, 0, 0]}
            rotationY={0}
            isNight={isNight}
            onClick={() => onSelect(building)}
            onPointerOver={() => {
              setLocalHover(true);
              onHover(building);
            }}
            onPointerOut={() => {
              setLocalHover(false);
              onHover(null);
            }}
          />
        ) : isVolleyballCourt ? (
          <group
            onClick={(e) => {
              e.stopPropagation();
              onSelect(building);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setLocalHover(true);
              onHover(building);
            }}
            onPointerOut={() => {
              setLocalHover(false);
              onHover(null);
            }}
          >
            {/* Simple Grounded Base Pad (20m x 11m) */}
            <mesh position={[0, -0.02, 0]} receiveShadow>
              <boxGeometry args={[20.4, 0.12, 11.4]} />
              <meshStandardMaterial color="#64748b" roughness={0.88} />
            </mesh>
            {/* Playing Surface (18m x 9m regulation court + 1m apron) */}
            <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[20.0, 11.0]} />
              <meshStandardMaterial color={isSelected ? '#38bdf8' : (building.color || '#c2410c')} roughness={0.75} />
            </mesh>
            {/* Crisp White Boundary, Center & 3m Attack Lines */}
            <group position={[0, 0.052, 0]}>
              <mesh position={[0, 0, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[18.08, 0.08]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[18.08, 0.08]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[-9.0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[9.08, 0.08]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[9.0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[9.08, 0.08]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* Center Line */}
              <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[9.0, 0.08]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              {/* 3m Attack Lines */}
              <mesh position={[-3.0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[9.0, 0.07]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[3.0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[9.0, 0.07]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            {/* Two Simple Steel Net Poles */}
            <mesh position={[0, 1.25, -5.0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} />
            </mesh>
            <mesh position={[0, 1.25, 5.0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} />
            </mesh>
            {/* Simple Volleyball Net & White Top Tape */}
            <mesh position={[0, 1.92, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[9.6, 1.0, 16, 4]} />
              <meshStandardMaterial color="#e2e8f0" wireframe transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, 2.43, 0]}>
              <boxGeometry args={[0.06, 0.07, 9.8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          </group>
        ) : (
          <>
        {/* 1. Subterranean Heavy Masonry / Concrete Foundation Plinth (Anchors firmly into terrain) */}
        {foundationGeometry && (
          <mesh
            geometry={foundationGeometry}
            position={[0, -foundationDepth + 0.08, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            castShadow
          >
            <meshStandardMaterial
              color="#475569" // architectural dressed slate foundation
              roughness={0.92}
              metalness={0.05}
              transparent={isGhosted}
              opacity={isGhosted ? 0.35 : 1.0}
            />
          </mesh>
        )}

        {/* 2. Main Extruded Building Body (Firmly seated on foundation plinth at Y = 0) */}
        <mesh
          ref={meshRef}
          geometry={geometry || undefined}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={baseColor}
            roughness={0.75}
            metalness={0.05}
            transparent={isGhosted}
            opacity={isGhosted ? 0.35 : 1.0}
            emissive={
              isSelected
                ? '#1d4ed8'
                : isHovered
                ? '#2563eb'
                : '#000000'
            }
            emissiveIntensity={
              isSelected
                ? 0.5
                : isHovered
                ? 0.3
                : 0
            }
          />
        </mesh>

        {/* 2b. Realistic Architectural Facade Details (Windows, Balconies, Parapets, Rooftop Units) */}
        <BuildingFacadeDetails
          building={building}
          isNight={isNight}
          windowGlowIntensity={windowGlowIntensity}
          isGhosted={isGhosted}
        />

        {/* 3. Architectural Roof Cap */}
        {roofGeometry && (
          <mesh
            geometry={roofGeometry}
            position={[0, building.height + 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
          >
            <meshStandardMaterial
              color={building.accentColor || '#334155'}
              roughness={0.4}
              metalness={0.2}
              transparent={isGhosted}
              opacity={isGhosted ? 0.35 : 1.0}
            />
          </mesh>
        )}

        {/* 4. Floor Dividing Architectural Ledges */}
        {roofGeometry &&
          building.levels > 1 &&
          Array.from({ length: building.levels - 1 }).map((_, idx) => {
            const floorY = ((idx + 1) * building.height) / building.levels;
            return (
              <mesh
                key={idx}
                geometry={roofGeometry}
                position={[0, floorY + 0.02, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <meshStandardMaterial
                  color="#475569"
                  roughness={0.7}
                  transparent
                  opacity={isGhosted ? 0.2 : 0.35}
                />
              </mesh>
            );
          })}

        {/* 5. Stepped Ground Entrance Apron & Paved Entry Threshold */}
        {entranceOffset && building.id !== 'canteen-pavilion-b' && (
          <group position={[entranceOffset[0], 0, entranceOffset[1]]}>
            {/* Ground apron terrace */}
            <mesh position={[0, -0.05, 0]} receiveShadow>
              <boxGeometry args={[4.2, 0.28, 2.6]} />
              <meshStandardMaterial color="#64748b" roughness={0.8} />
            </mesh>
            {/* Mid step */}
            <mesh position={[0, 0.06, 0.2]} receiveShadow>
              <boxGeometry args={[3.6, 0.14, 1.8]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.7} />
            </mesh>
            {/* Upper landing threshold */}
            <mesh position={[0, 0.16, 0.4]} receiveShadow>
              <boxGeometry args={[3.0, 0.12, 1.2]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
            {/* Entrance Glass Double Doors & Canopy */}
            <mesh position={[0, 1.35, 0.25]} castShadow>
              <boxGeometry args={[2.2, 2.3, 0.12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.35, 0.32]}>
              <planeGeometry args={[1.9, 2.05]} />
              <meshStandardMaterial
                color={isNight ? '#fef08a' : '#0f172a'}
                roughness={0.12}
                metalness={0.7}
                emissive={isNight ? '#fde047' : '#000000'}
                emissiveIntensity={isNight ? 0.9 : 0}
              />
            </mesh>
            <mesh position={[0, 2.65, 0.85]} castShadow>
              <boxGeometry args={[3.2, 0.14, 1.4]} />
              <meshStandardMaterial color="#334155" roughness={0.4} />
            </mesh>
            {/* Baked-style Warm Entrance Ground Glow Pool at Night (0 PointLights) */}
            <mesh position={[0, 0.11, 1.35]} rotation={[-Math.PI / 2, 0, 0]} visible={isNight}>
              <circleGeometry args={[2.8, 16]} />
              <meshBasicMaterial color="#fde047" transparent opacity={0.24} depthWrite={false} />
            </mesh>
          </group>
        )}
          </>
        )}

        {/* 6. Floating 3D Label & Selection Marker */}
        {(isHighlighted || isEditMode || isBasketballCourt || isCentralGarden || isVolleyballCourt || building.category === 'academic' || building.category === 'administrative') && (
          <Html
            position={
              isCentralGarden
                ? [1.47, 3.0, -0.41]
                : [0, isBasketballCourt ? 4.8 : building.height + 3.2, 0]
            }
            center
            distanceFactor={90}
            zIndexRange={[10, 0]}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect(building);
              }}
              className={`cursor-pointer px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-md transition-all duration-200 pointer-events-auto flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-white scale-110 shadow-blue-500/50 shadow-lg'
                  : isHighlighted
                  ? 'bg-slate-900/90 text-white ring-1 ring-blue-400'
                  : 'bg-slate-900/70 text-slate-200 backdrop-blur-sm border border-slate-700/50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: building.accentColor || '#38bdf8' }}
              />
              <span>{building.shortName || building.name}</span>
              {building.levels > 1 && (
                <span className="text-[10px] text-slate-300 bg-slate-800/90 px-1 rounded">
                  {building.levels}F
                </span>
              )}
              {isSelected && isEditMode && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-mono">
                  EDIT
                </span>
              )}
            </div>
          </Html>
        )}

        {/* 7. Ground Highlight Ring for Selected Building */}
        {isSelected && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[
                isBasketballCourt ? 17.5 : isCentralGarden ? 10.5 : building.height * 0.7,
                (isBasketballCourt ? 17.5 : isCentralGarden ? 10.5 : building.height * 0.7) + 1.8,
                32,
              ]}
            />
            <meshBasicMaterial
              color={isEditMode ? '#f59e0b' : '#3b82f6'}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>

      {/* Live Interactive 3D Transform Gizmo (Move / Rotate / Scale) in Edit Mode */}
      {isEditMode && isSelected && transformMode && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onMouseDown={() => onTransformDraggingChanged?.(true)}
          onMouseUp={() => onTransformDraggingChanged?.(false)}
          onObjectChange={() => {
            if (groupRef.current && onChangeBuilding) {
              const p = groupRef.current.position;
              const r = groupRef.current.rotation;
              const s = groupRef.current.scale;
              onChangeBuilding({
                ...building,
                transform: {
                  position: [
                    parseFloat(p.x.toFixed(2)),
                    parseFloat(p.y.toFixed(2)),
                    parseFloat(p.z.toFixed(2)),
                  ],
                  rotation: [
                    parseFloat(r.x.toFixed(3)),
                    parseFloat(r.y.toFixed(3)),
                    parseFloat(r.z.toFixed(3)),
                  ],
                  scale: [
                    parseFloat(s.x.toFixed(2)),
                    parseFloat(s.y.toFixed(2)),
                    parseFloat(s.z.toFixed(2)),
                  ],
                },
              });
            }
          }}
        />
      )}
    </>
  );
}
