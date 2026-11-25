'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import { Building } from '@/types/campus';
import { BuildingConfig } from '@/types/buildingEditor';

interface MainBuildingDetailedProps {
  building: Building;
  isSelected: boolean;
  isHovered: boolean;
  isNight: boolean;
  windowGlowIntensity: number;
  config?: BuildingConfig;
  isEditMode?: boolean;
  transformMode?: 'translate' | 'rotate' | 'scale' | null;
  onChangeConfig?: (c: BuildingConfig) => void;
  onTransformDraggingChanged?: (isDragging: boolean) => void;
  onSelect: (b: Building) => void;
  onHover: (b: Building | null) => void;
}

// Lightweight stylized 3D Car for Campus Parking
function CampusParkedCar({
  position,
  rotation = [0, 0, 0],
  color = '#cbd5e1',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Chassis Body */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.52, 4.2]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Cabin Roof & Windows */}
      <mesh position={[0, 0.88, -0.2]} castShadow>
        <boxGeometry args={[1.65, 0.52, 2.3]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Windshields & Windows */}
      <mesh position={[0, 0.86, 0.98]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[1.52, 0.46, 0.04]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.86, -1.36]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.52, 0.46, 0.04]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* 4 Wheels */}
      {[-0.95, 0.95].map((wx, i) =>
        [-1.25, 1.25].map((wz, j) => (
          <mesh key={`wh_${i}_${j}`} position={[wx, 0.28, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.2, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.8} />
          </mesh>
        ))
      )}
      {/* Headlights */}
      {[-0.65, 0.65].map((hx, i) => (
        <mesh key={`hl_${i}`} position={[hx, 0.42, 2.11]}>
          <boxGeometry args={[0.35, 0.12, 0.04]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* Taillights */}
      {[-0.65, 0.65].map((tx, i) => (
        <mesh key={`tl_${tx}`} position={[tx, 0.42, -2.11]}>
          <boxGeometry args={[0.35, 0.12, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
        </mesh>
      ))}
    </group>
  );
}

// Lightweight stylized 3D Motorbike / Scooter for Campus Two-Wheeler Parking
function CampusMotorbike({
  position,
  rotation = [0, 0, 0],
  color = '#dc2626',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.32, 0.48, 1.45]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, -0.1]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.62]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.88, 0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <meshStandardMaterial color="#71717a" roughness={0.3} metalness={0.7} />
      </mesh>
      {[-0.52, 0.52].map((wz, i) => (
        <mesh key={`bw_${i}`} position={[0, 0.25, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.08, 10]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function MainBuildingDetailed({
  building,
  isSelected,
  isHovered,
  isNight,
  windowGlowIntensity,
  config,
  isEditMode = false,
  transformMode = null,
  onChangeConfig,
  onTransformDraggingChanged,
  onSelect,
  onHover,
}: MainBuildingDetailedProps) {
  const outerGroupRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [localHover, setLocalHover] = useState(false);
  const isHighlighted = isSelected || isHovered || localHover;

  // Real-world calibrated world position & orientation (driven by live config or defaults)
  const WORLD_X = config ? config.posX : 3.18;
  const WORLD_Y = config ? config.posY : 0;
  const WORLD_Z = config ? config.posZ : -4.25;
  const ROT_Y = config ? config.rotY : -0.637; // -36.5 degrees
  const SCALE = config ? config.scale : 1.0;

  // Architectural Parametric Dimensions
  const ATRIUM_Z = config ? config.atriumZ : 8.0;
  const ATRIUM_WIDTH = config ? config.atriumWidth : 23.5;
  const ATRIUM_DEPTH = config ? config.atriumDepth : 7.0;
  const ATRIUM_PITCH = config ? config.atriumPitch : 0.18;
  const ATRIUM_OPACITY = config ? config.atriumOpacity : 0.5;

  const PORTICO_Z = config ? config.porticoZ : -14.0;
  const DOME_SCALE = config ? config.domeScale : 1.0;
  const DOME_Y = config ? config.domeY : 0;
  const REAR_Z_CENTER = config ? config.rearZ : 18.0;
  const REAR_DEPTH = config ? config.rearDepth : 13.0;

  // Synchronize outerGroupRef with props when config changes externally
  useEffect(() => {
    if (outerGroupRef.current) {
      outerGroupRef.current.position.set(WORLD_X, WORLD_Y, WORLD_Z);
      outerGroupRef.current.rotation.set(0, ROT_Y, 0);
      outerGroupRef.current.scale.set(SCALE, SCALE, SCALE);
    }
  }, [WORLD_X, WORLD_Y, WORLD_Z, ROT_Y, SCALE]);

  // Materials & Colors matched to actual SIT photographs
  const mats = useMemo(() => {
    return {
      wallCream: '#cbb274',                             // warm golden-ochre / sandstone main exterior walls
      frameBeige: '#c2a766',                            // warm ochre-tan structural pilasters, ledges & towers
      borderWhite: '#ffffff',                           // crisp white architectural borders, columns & trims
      pillarWhite: '#ffffff',                           // pure white cylindrical pillars
      railingWhite: '#ffffff',                          // white balcony balustrades
      grilleDark: '#1f1b18',                            // dark brown / black wrought iron grill inserts
      domeSilver: '#646b78',                            // medium metallic slate-grey dome
      domeRib: '#828a99',                               // lighter metallic segmented ribs
      domeBase: '#cbb274',                              // golden-ochre supporting rotunda drum
      roofSlab: '#78716c',                              // natural grey concrete roof slabs
      windowGlass: '#18202c',                           // slightly reflective dark glass
      floorStone: '#f8fafc',                            // light stone / off-white entrance paving
      signBoard: '#ffffff',                             // crisp white architrave fascia signboard
      signText: '#0f172a',                              // dark charcoal/black bold lettering
      hedgeGreen: '#15803d',                            // trimmed green hedge
      lawnGreen: '#22c55e',                             // manicured green grass
      letteringGold: '#eab308',                         // SIT hedge lettering
      atriumGlass: '#475569',                           // neutral architectural smoky glass
      atriumTruss: '#262626',                           // dark charcoal industrial trusses
    };
  }, []);

  // Organic, Irregular Parking Lot Boundary Points (fitted strictly to available terrain between building & road)
  const parkingPerimeterPts = useMemo<[number, number][]>(() => [
    [-24.0, 25.2],
    [-24.0, 27.5],
    [-19.0, 32.0],
    [-13.0, 36.5],
    [-7.0, 40.0],
    [-1.0, 42.5],
    [2.0, 44.0],
    // Driveway neck connecting smoothly to road:
    [2.0, 46.8],
    [8.0, 46.8],
    [8.0, 44.5],
    [14.0, 44.8],
    [19.0, 43.8],
    [23.0, 41.5],
    [25.5, 37.5],
    [27.5, 30.0],
    [27.5, 25.2],
  ], []);

  const parkingGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(parkingPerimeterPts[0][0], -parkingPerimeterPts[0][1]);
    for (let i = 1; i < parkingPerimeterPts.length; i++) {
      s.lineTo(parkingPerimeterPts[i][0], -parkingPerimeterPts[i][1]);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [parkingPerimeterPts]);

  // Overall Dimensions
  const NUM_FLOORS = 4;
  const FLOOR_H = 4.0;
  const TOTAL_H = NUM_FLOORS * FLOOR_H; // 16.0m
  const WING_LEN = 38.0;
  const WING_DEPTH = 13.0;
  const WING_ANGLE = config ? (config.wingAngle ?? 0.0) : 0.0; // 0.0 = completely straight front wings matching rear
  const NUM_BAYS = 5;
  const BAY_W = WING_LEN / NUM_BAYS;

  const REAR_WING_LEN = 36.0;

  // Subtle floating bounce animation when selected
  useFrame(({ clock }) => {
    if (groupRef.current && isSelected) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = 0.3 + Math.sin(t * 3) * 0.15;
    } else if (groupRef.current) {
      groupRef.current.position.y = 0;
    }
  });

  return (
    <>
      <group
        ref={outerGroupRef}
        position={[WORLD_X, WORLD_Y, WORLD_Z]}
        rotation={[0, ROT_Y, 0]}
        scale={[SCALE, SCALE, SCALE]}
      >
        {/* Interactive Wrapper Group */}
        <group
          ref={groupRef}
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
          {/* ============================================================== */}
          {/* 1. CENTRAL ROTUNDA & METALLIC SILVER-GREY DOME (WITH RIBS)     */}
          {/* ============================================================== */}
          <group
            position={[0, TOTAL_H + DOME_Y, -2.0]}
            scale={[DOME_SCALE, DOME_SCALE, DOME_SCALE]}
          >
          {/* Base plinth ring */}
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[10.5, 10.8, 0.8, 32]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
          </mesh>

          {/* Rotunda Drum: Cream-coloured supporting structure */}
          <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[9.8, 9.8, 3.4, 32]} />
            <meshStandardMaterial color={mats.domeBase} roughness={0.5} />
          </mesh>

          {/* 16 White Colonnade Pillars around drum */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 16;
            const r = 9.85;
            return (
              <mesh
                key={`rot_col_${i}`}
                position={[Math.cos(angle) * r, 2.5, Math.sin(angle) * r]}
                castShadow
              >
                <cylinderGeometry args={[0.22, 0.22, 3.4, 10]} />
                <meshStandardMaterial color={mats.pillarWhite} roughness={0.3} />
              </mesh>
            );
          })}

          {/* 16 Arched Window Panes between columns */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = ((i + 0.5) * Math.PI * 2) / 16;
            const r = 9.7;
            const rotHash = i % 3;
            return (
              <mesh
                key={`rot_win_${i}`}
                position={[Math.cos(angle) * r, 2.6, Math.sin(angle) * r]}
                rotation={[0, -angle + Math.PI / 2, 0]}
              >
                <boxGeometry args={[1.5, 2.4, 0.1]} />
                <meshStandardMaterial
                  color={mats.windowGlass}
                  roughness={0.15}
                  metalness={0.7}
                  emissive={isNight ? (rotHash === 0 ? '#fef08a' : '#f59e0b') : '#000000'}
                  emissiveIntensity={isNight ? windowGlowIntensity * 1.4 : 0}
                />
              </mesh>
            );
          })}

          {/* Persistent Non-Shadow Hero Light for Circular Dome (0ms Day/Night toggle) */}
          <pointLight
            position={[0, 11.0, 0]}
            color="#fed7aa"
            intensity={isNight ? 4.8 : 0}
            distance={36}
            decay={2}
          />

          {/* Multiple Circular Horizontal Bands around dome base */}
          <mesh position={[0, 4.3, 0]} castShadow>
            <cylinderGeometry args={[10.2, 10.2, 0.35, 32]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
          </mesh>
          <mesh position={[0, 4.8, 0]} castShadow>
            <cylinderGeometry args={[9.4, 9.6, 0.65, 32]} />
            <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
          </mesh>
          <mesh position={[0, 5.3, 0]} castShadow>
            <cylinderGeometry args={[8.8, 9.1, 0.4, 32]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.3} metalness={0.3} />
          </mesh>

          {/* LARGE METALLIC SILVER-GREY HEMISPHERICAL DOME */}
          <mesh position={[0, 5.4, 0]} scale={[1, 0.75, 1]} castShadow>
            <sphereGeometry args={[8.5, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={mats.domeSilver}
              roughness={0.32}
              metalness={0.55}
            />
          </mesh>

          {/* 16 VISIBLE VERTICAL SEGMENTED RIBS running from top to bottom */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 16;
            const r = 8.52;
            return (
              <group key={`rib_${i}`} rotation={[0, angle, 0]}>
                {Array.from({ length: 8 }).map((_, j) => {
                  const theta1 = (j * (Math.PI / 2)) / 8;
                  const theta2 = ((j + 1) * (Math.PI / 2)) / 8;
                  const midTheta = (theta1 + theta2) / 2;
                  const px = Math.cos(midTheta) * r;
                  const py = 5.4 + Math.sin(midTheta) * r * 0.75;
                  const segLen = (r * Math.PI) / 16;
                  return (
                    <mesh
                      key={`rib_seg_${j}`}
                      position={[px, py, 0]}
                      rotation={[0, 0, -midTheta]}
                      castShadow
                    >
                      <boxGeometry args={[0.15, segLen, 0.22]} />
                      <meshStandardMaterial
                        color={mats.domeRib}
                        roughness={0.3}
                        metalness={0.55}
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          })}

          {/* Concentric Base Rib Ring */}
          <mesh position={[0, 5.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[8.52, 0.22, 12, 36]} />
            <meshStandardMaterial color={mats.domeRib} roughness={0.3} metalness={0.55} />
          </mesh>

          {/* Pinnacle Spire & Metallic Finial Ball */}
          <mesh position={[0, 11.9, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.18, 1.8, 8]} />
            <meshStandardMaterial color={mats.pillarWhite} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 12.9, 0]} castShadow>
            <sphereGeometry args={[0.42, 16, 12]} />
            <meshStandardMaterial
              color={mats.pillarWhite}
              metalness={0.9}
              roughness={0.2}
              emissive={isNight ? '#fef08a' : '#000000'}
              emissiveIntensity={isNight ? 1.4 : 0}
            />
          </mesh>

          {/* Elegant Circular Dome Base & Drum Accent Lighting */}
          {isNight && (
            <group position={[0, 5.2, 0]}>
              {/* Warm LED halo ring under dome cornice */}
              <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[8.95, 0.06, 8, 36]} />
                <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.2} />
              </mesh>
              {/* Radial warm architectural fixtures around circular drum base */}
              {Array.from({ length: 12 }).map((_, idx) => {
                const ang = (idx * Math.PI * 2) / 12;
                const rx = Math.sin(ang) * 9.35;
                const rz = Math.cos(ang) * 9.35;
                return (
                  <group key={`dome_lt_${idx}`} position={[rx, 0, rz]}>
                    <mesh position={[0, -0.1, 0]}>
                      <cylinderGeometry args={[0.18, 0.22, 0.12, 10]} />
                      <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.5} />
                    </mesh>
                  </group>
                );
              })}
            </group>
          )}
        </group>

        {/* ============================================================== */}
        {/* 2. GRAND 2-STORY ENTRANCE PORTICO & WHITE PILLARS              */}
        {/* ============================================================== */}
        <group position={[0, 0, PORTICO_Z]}>
          {/* Subterranean Plinth anchoring portico into terrain */}
          <mesh position={[0, -0.22, 0]} receiveShadow>
            <boxGeometry args={[22.4, 0.45, 12.4]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>

          {/* Stepped Stone Entrance Apron */}
          <mesh position={[0, 0.25, 0]} receiveShadow>
            <boxGeometry args={[22.0, 0.5, 12.0]} />
            <meshStandardMaterial color={mats.floorStone} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.6, 0.5]} receiveShadow>
            <boxGeometry args={[20.0, 0.3, 10.5]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.5} />
          </mesh>

          {/* 6 TALL WHITE CYLINDRICAL PILLARS (Ground to 2nd Floor, height 8m) */}
          {[-8.5, -2.8, 2.8, 8.5].map((px, idx) => (
            <group key={`p_front_${idx}`} position={[px, 4.0, -4.5]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.48, 0.52, 7.4, 20]} />
                <meshStandardMaterial color={mats.pillarWhite} roughness={0.25} metalness={0.05} />
              </mesh>
              <mesh position={[0, -3.5, 0]} castShadow>
                <boxGeometry args={[1.2, 0.5, 1.2]} />
                <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
              </mesh>
              <mesh position={[0, 3.5, 0]} castShadow>
                <boxGeometry args={[1.2, 0.4, 1.2]} />
                <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
              </mesh>
            </group>
          ))}
          {[-6.0, 6.0].map((px, idx) => (
            <group key={`p_rear_${idx}`} position={[px, 4.0, 3.5]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.45, 0.5, 7.4, 18]} />
                <meshStandardMaterial color={mats.pillarWhite} roughness={0.25} metalness={0.05} />
              </mesh>
              <mesh position={[0, -3.5, 0]} castShadow>
                <boxGeometry args={[1.1, 0.5, 1.1]} />
                <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
              </mesh>
              <mesh position={[0, 3.5, 0]} castShadow>
                <boxGeometry args={[1.1, 0.4, 1.1]} />
                <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
              </mesh>
            </group>
          ))}

          {/* 2nd-Floor Covered Portico Roof / Terrace Slab */}
          <mesh position={[0, 7.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[22.5, 0.6, 12.5]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
          </mesh>

          {/* ARCHITRAVE FASCIA with SILIGURI INSTITUTE OF TECHNOLOGY Name */}
          <mesh position={[0, 7.8, -6.32]} castShadow>
            <boxGeometry args={[20.0, 0.9, 0.15]} />
            <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
          </mesh>
          <mesh position={[0, 7.8, -6.42]} castShadow>
            <boxGeometry args={[18.5, 0.65, 0.05]} />
            <meshStandardMaterial
              color={mats.signBoard}
              roughness={0.5}
              emissive={isNight ? '#fef3c7' : '#000000'}
              emissiveIntensity={isNight ? 0.85 : 0}
            />
          </mesh>
          {isNight && (
            <mesh position={[0, 8.22, -6.42]}>
              <boxGeometry args={[19.2, 0.07, 0.12]} />
              <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.8} />
            </mesh>
          )}
          <Html position={[0, 7.8, -6.48]} rotation={[0, Math.PI, 0]} center distanceFactor={42} transform zIndexRange={[10, 0]}>
            <div
              className="bg-white/95 text-slate-900 px-3.5 py-0.5 rounded-sm font-bold text-[11px] tracking-wider border border-amber-500/40 shadow-sm pointer-events-none select-none whitespace-nowrap"
              style={{ backfaceVisibility: 'hidden' }}
            >
              SILIGURI INSTITUTE OF TECHNOLOGY
            </div>
          </Html>

          {/* 2nd-Floor Terrace White Balcony Railing */}
          <mesh position={[0, 8.4, -5.9]} castShadow>
            <boxGeometry args={[21.0, 0.7, 0.12]} />
            <meshStandardMaterial color={mats.railingWhite} roughness={0.3} />
          </mesh>
          <mesh position={[0, 8.85, -5.9]} castShadow>
            <boxGeometry args={[21.0, 0.15, 0.18]} />
            <meshStandardMaterial color={mats.grilleDark} roughness={0.4} metalness={0.4} />
          </mesh>

          {/* Upper Columns on 3rd & 4th floors (reaching up to roof) */}
          {[-7.5, -2.5, 2.5, 7.5].map((px, idx) => (
            <mesh key={`p_upper_${idx}`} position={[px, 12.0, -3.5]} castShadow>
              <cylinderGeometry args={[0.38, 0.4, 7.8, 16]} />
              <meshStandardMaterial color={mats.pillarWhite} roughness={0.3} />
            </mesh>
          ))}

          {/* Open Central Lobby & Glass Doors behind pillars */}
          <mesh position={[0, 2.2, 5.5]} castShadow>
            <boxGeometry args={[10.0, 4.0, 0.15]} />
            <meshStandardMaterial
              color="#020617"
              roughness={0.1}
              metalness={0.8}
              emissive={isNight ? '#fde68a' : '#000000'}
              emissiveIntensity={isNight ? windowGlowIntensity * 1.3 : 0}
            />
          </mesh>

          {/* Persistent Hero Entrance Light (no shadow cube map, instant toggle) */}
          <pointLight
            position={[0, 7.2, -5.0]}
            color="#fef08a"
            intensity={isNight ? 6.8 : 0}
            distance={38}
            decay={2}
          />
          {isNight && (
            <group>
              {/* Column Base Uplights at the foot of the 4 Front Pillars */}
              {[-8.5, -2.8, 2.8, 8.5].map((px, idx) => (
                <group key={`col_uplight_${idx}`} position={[px, 0.45, -4.5]}>
                  <mesh>
                    <cylinderGeometry args={[0.25, 0.3, 0.12, 12]} />
                    <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.8} />
                  </mesh>
                </group>
              ))}

              {/* Rear Portico Pillar Uplights */}
              {[-6.0, 6.0].map((px, idx) => (
                <mesh key={`rear_col_uplight_${idx}`} position={[px, 0.45, 3.5]}>
                  <cylinderGeometry args={[0.24, 0.28, 0.12, 12]} />
                  <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.4} />
                </mesh>
              ))}

              {/* Upper 3rd/4th Floor Portico Column Uplights */}
              {[-7.5, -2.5, 2.5, 7.5].map((px, idx) => (
                <mesh key={`upper_col_uplight_${idx}`} position={[px, 8.15, -3.5]}>
                  <cylinderGeometry args={[0.22, 0.26, 0.1, 10]} />
                  <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.2} />
                </mesh>
              ))}

              {/* Recessed ceiling light fixture meshes (warm emissive) */}
              {[-6, -2, 0, 2, 6].map((lx, i) => (
                <mesh key={`portico_light_${i}`} position={[lx, 7.45, -2.5]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.08, 16]} />
                  <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.8} />
                </mesh>
              ))}

              {/* Warm entrance floor glow pool */}
              <mesh position={[0, 0.77, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[7.5, 24]} />
                <meshBasicMaterial color="#fef08a" transparent opacity={0.18} depthWrite={false} />
              </mesh>
            </group>
          )}
        </group>

        {/* ============================================================== */}
        {/* 3. CENTRAL CONNECTING SPINE & TRANSVERSE ATRIUM                */}
        {/* ============================================================== */}
        <group position={[0, 0, 4.0]}>
          {/* Subterranean Spine Foundation Plinth */}
          <mesh position={[0, -0.22, 0]} receiveShadow>
            <boxGeometry args={[22.4, 0.45, 18.4]} />
            <meshStandardMaterial color="#475569" roughness={0.9} />
          </mesh>

          {/* Main central circulation spine connecting front and rear */}
          <mesh position={[0, TOTAL_H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[22.0, TOTAL_H, 18.0]} />
            <meshStandardMaterial color={mats.wallCream} roughness={0.65} />
          </mesh>

          {/* Roof Slab over spine */}
          <mesh position={[0, TOTAL_H + 0.2, 0]} castShadow>
            <boxGeometry args={[22.6, 0.4, 18.6]} />
            <meshStandardMaterial color={mats.roofSlab} roughness={0.5} />
          </mesh>

          {/* Horizontal floor dividing ledges */}
          {Array.from({ length: NUM_FLOORS + 1 }).map((_, fIdx) => (
            <mesh key={`spine_ledge_${fIdx}`} position={[0, fIdx * FLOOR_H, 0]} castShadow>
              <boxGeometry args={[22.4, 0.3, 18.4]} />
              <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
            </mesh>
          ))}

          {/* Large windows on east & west faces of central connecting spine */}
          {[-11.08, 11.08].map((sideX, sIdx) => (
            <group key={`spine_side_${sIdx}`}>
              {Array.from({ length: NUM_FLOORS }).map((_, fIdx) => (
                <mesh
                  key={`spine_win_${fIdx}`}
                  position={[sideX, (fIdx + 0.5) * FLOOR_H, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.1, FLOOR_H * 0.55, 12.0]} />
                  <meshStandardMaterial
                    color={mats.windowGlass}
                    roughness={0.15}
                    metalness={0.6}
                    emissive={isNight ? '#eab308' : '#000000'}
                    emissiveIntensity={isNight ? windowGlowIntensity * 1.1 : 0}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* ============================================================== */}
        {/* 4. ATRIUM COURTYARD GLASS SKYLIGHTS (Between Front & Rear)     */}
        {/*    (Pitched glass skylight spanning the courtyard gap)         */}
        {/* ============================================================== */}
        {[-23.5, 23.5].map((atriumX, aIdx) => (
          <group key={`atrium_${aIdx}`} position={[atriumX, TOTAL_H, ATRIUM_Z]}>
            {/* Front Pitched Glass Slope (slopes down towards front wing) */}
            <mesh
              position={[0, 0.35, -ATRIUM_DEPTH / 4]}
              rotation={[ATRIUM_PITCH, 0, 0]}
              castShadow
            >
              <boxGeometry args={[ATRIUM_WIDTH, 0.08, ATRIUM_DEPTH / 2]} />
              <meshStandardMaterial
                color="#475569"
                roughness={0.2}
                metalness={0.4}
                transparent
                opacity={ATRIUM_OPACITY}
                emissive={isNight ? '#fef08a' : '#000000'}
                emissiveIntensity={isNight ? 1.15 : 0}
              />
            </mesh>

            {/* Rear Pitched Glass Slope (slopes down towards rear wing) */}
            <mesh
              position={[0, 0.35, ATRIUM_DEPTH / 4]}
              rotation={[-ATRIUM_PITCH, 0, 0]}
              castShadow
            >
              <boxGeometry args={[ATRIUM_WIDTH, 0.08, ATRIUM_DEPTH / 2]} />
              <meshStandardMaterial
                color="#475569"
                roughness={0.2}
                metalness={0.4}
                transparent
                opacity={ATRIUM_OPACITY}
                emissive={isNight ? '#fef08a' : '#000000'}
                emissiveIntensity={isNight ? 1.15 : 0}
              />
            </mesh>

            {/* Structural Steel A-Frame Rafters */}
            {[-9.0, -4.5, 0, 4.5, 9.0].map((rx, rIdx) => (
              <group key={`rafter_${rIdx}`} position={[rx, 0.35, 0]}>
                <mesh position={[0, 0, -ATRIUM_DEPTH / 4]} rotation={[ATRIUM_PITCH, 0, 0]}>
                  <boxGeometry args={[0.2, 0.16, ATRIUM_DEPTH / 2 + 0.02]} />
                  <meshStandardMaterial color={mats.atriumTruss} roughness={0.4} metalness={0.7} />
                </mesh>
                <mesh position={[0, 0, ATRIUM_DEPTH / 4]} rotation={[-ATRIUM_PITCH, 0, 0]}>
                  <boxGeometry args={[0.2, 0.16, ATRIUM_DEPTH / 2 + 0.02]} />
                  <meshStandardMaterial color={mats.atriumTruss} roughness={0.4} metalness={0.7} />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* ============================================================== */}
        {/* 5. FRONT LEFT & FRONT RIGHT EXTENDED WINGS (WITH BALCONIES)    */}
        {/* ============================================================== */}
        {[
          { name: 'FrontLeftWing', dir: -1, angle: -WING_ANGLE },
          { name: 'FrontRightWing', dir: 1, angle: WING_ANGLE },
        ].map((wing) => {
          const pivotX = wing.dir * 11.0;
          const pivotZ = -2.0;

          return (
            <group
              key={wing.name}
              position={[pivotX, 0, pivotZ]}
              rotation={[0, wing.angle, 0]}
            >
              {/* Subterranean Front Wing Foundation Plinth */}
              <mesh
                position={[wing.dir * (WING_LEN / 2), -0.22, 0]}
                receiveShadow
              >
                <boxGeometry args={[WING_LEN + 0.4, 0.45, WING_DEPTH + 0.4]} />
                <meshStandardMaterial color="#475569" roughness={0.9} />
              </mesh>

              {/* Solid Wing Building Core */}
              <mesh
                position={[wing.dir * (WING_LEN / 2), TOTAL_H / 2, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[WING_LEN, TOTAL_H, WING_DEPTH]} />
                <meshStandardMaterial color={mats.wallCream} roughness={0.65} />
              </mesh>

              {/* Roof Slab */}
              <mesh
                position={[wing.dir * (WING_LEN / 2), TOTAL_H + 0.2, 0]}
                castShadow
              >
                <boxGeometry args={[WING_LEN + 0.6, 0.4, WING_DEPTH + 0.6]} />
                <meshStandardMaterial color={mats.roofSlab} roughness={0.5} />
              </mesh>

              {/* Continuous White Roof Balustrade */}
              <mesh
                position={[wing.dir * (WING_LEN / 2), TOTAL_H + 0.7, -WING_DEPTH / 2 - 0.1]}
                castShadow
              >
                <boxGeometry args={[WING_LEN + 0.4, 0.7, 0.15]} />
                <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
              </mesh>

              {/* REPEATED BALCONIES & CORRIDORS ACROSS ALL FLOORS */}
              {Array.from({ length: NUM_FLOORS }).map((_, fIdx) => {
                const floorY = fIdx * FLOOR_H;
                const isTopFloor = fIdx === NUM_FLOORS - 1;

                return (
                  <group key={`front_fl_${fIdx}`} position={[0, floorY, 0]}>
                    {/* Floor Slab Extension (Balcony Walkway) */}
                    <mesh
                      position={[wing.dir * (WING_LEN / 2), 0.15, -WING_DEPTH / 2 - 0.7]}
                      receiveShadow
                    >
                      <boxGeometry args={[WING_LEN, 0.35, 1.8]} />
                      <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                    </mesh>

                    {/* Recessed corridor back wall in white */}
                    <mesh
                      position={[wing.dir * (WING_LEN / 2), FLOOR_H / 2, -WING_DEPTH / 2 + 0.8]}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[WING_LEN - 0.4, FLOOR_H - 0.2, 0.2]} />
                      <meshStandardMaterial color={mats.borderWhite} roughness={0.7} />
                    </mesh>

                    {/* Balcony Bays with Windows, Doors, and Railings */}
                    {Array.from({ length: NUM_BAYS }).map((_, bIdx) => {
                      const bayX = wing.dir * (bIdx * BAY_W + BAY_W / 2);
                      const winHash = (fIdx * 7 + bIdx * 13 + (wing.dir > 0 ? 3 : 0)) % 10;
                      // ~70% occupied rooms with warm architectural window illumination, ~30% dark
                      const isWindowLit = isNight && winHash <= 6;
                      const palette = ['#fef08a', '#fffbeb', '#fef9c3', '#fde047', '#fef3c7', '#fed7aa', '#f59e0b'];
                      const winColor = palette[winHash % palette.length];
                      const winIntensity = isWindowLit
                        ? (winHash % 2 === 0 ? windowGlowIntensity * 2.2 : windowGlowIntensity * 1.5)
                        : 0;

                      return (
                        <group key={`front_bay_${bIdx}`}>
                          {/* Dark Glass Windows & Classroom Doors on recessed wall */}
                          <mesh position={[bayX, FLOOR_H / 2, -WING_DEPTH / 2 + 0.98]}>
                            <boxGeometry args={[BAY_W * 0.58, FLOOR_H * 0.58, 0.05]} />
                            <meshStandardMaterial
                              color={mats.windowGlass}
                              roughness={0.1}
                              metalness={0.7}
                              emissive={winColor}
                              emissiveIntensity={winIntensity}
                            />
                          </mesh>

                          {/* White Balcony Parapet Wall */}
                          <mesh position={[bayX, 0.55, -WING_DEPTH / 2 - 1.55]} castShadow>
                            <boxGeometry args={[BAY_W - 0.6, 0.8, 0.15]} />
                            <meshStandardMaterial color={mats.railingWhite} roughness={0.3} />
                          </mesh>
                          {/* Dark Iron Grille Railing Insert */}
                          <mesh position={[bayX, 1.05, -WING_DEPTH / 2 - 1.55]} castShadow>
                            <boxGeometry args={[BAY_W - 0.8, 0.2, 0.1]} />
                            <meshStandardMaterial color={mats.grilleDark} roughness={0.4} metalness={0.4} />
                          </mesh>

                          {/* REPEATED ARCHED OPENINGS ON UPPER FLOOR (Floor 3) */}
                          {isTopFloor && (
                            <group position={[bayX, FLOOR_H - 0.4, -WING_DEPTH / 2 - 1.55]}>
                              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                                <cylinderGeometry
                                  args={[BAY_W * 0.38, BAY_W * 0.38, 0.25, 16, 1, false, 0, Math.PI]}
                                />
                                <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                              </mesh>
                            </group>
                          )}
                        </group>
                      );
                    })}

                    {/* Horizontal Divider Ledge */}
                    <mesh
                      position={[wing.dir * (WING_LEN / 2), FLOOR_H - 0.1, -WING_DEPTH / 2 - 0.8]}
                      castShadow
                    >
                      <boxGeometry args={[WING_LEN + 0.4, 0.25, 2.0]} />
                      <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                    </mesh>

                    {/* Warm Balcony Soffit LED Strip along each floor at night */}
                    {isNight && (
                      <mesh position={[wing.dir * (WING_LEN / 2), FLOOR_H - 0.25, -WING_DEPTH / 2 - 1.35]}>
                        <boxGeometry args={[WING_LEN - 0.8, 0.05, 0.08]} />
                        <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.0} />
                      </mesh>
                    )}
                  </group>
                );
              })}

              {/* VERTICAL BEIGE/CREAM PILASTERS FRAMING EACH BAY */}
              {Array.from({ length: NUM_BAYS + 1 }).map((_, bIdx) => {
                const colX = wing.dir * (bIdx * BAY_W);
                return (
                  <group key={`front_col_${bIdx}`} position={[colX, TOTAL_H / 2, -WING_DEPTH / 2 - 1.6]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[0.7, TOTAL_H, 0.5]} />
                      <meshStandardMaterial color={mats.frameBeige} roughness={0.55} />
                    </mesh>
                    <mesh position={[0, TOTAL_H / 2 - 0.25, 0]} castShadow>
                      <boxGeometry args={[0.9, 0.4, 0.65]} />
                      <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, -TOTAL_H / 2 + 0.25, 0]} castShadow>
                      <boxGeometry args={[0.9, 0.4, 0.65]} />
                      <meshStandardMaterial color={mats.borderWhite} roughness={0.3} />
                    </mesh>

                    {/* Subtle warm architectural wall sconce fixtures on pilasters */}
                    {isNight && (
                      <group position={[0, 0, -0.28]}>
                        <mesh position={[0, 0, 0]}>
                          <boxGeometry args={[0.18, 0.32, 0.08]} />
                          <meshStandardMaterial color="#334155" roughness={0.4} />
                        </mesh>
                        <mesh position={[0, 0.12, 0.02]}>
                          <cylinderGeometry args={[0.06, 0.06, 0.06, 8]} />
                          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.0} />
                        </mesh>
                        <mesh position={[0, -0.12, 0.02]}>
                          <cylinderGeometry args={[0.06, 0.06, 0.06, 8]} />
                          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.0} />
                        </mesh>
                      </group>
                    )}
                  </group>
                );
              })}

              {/* Classical Corner Tower & Pediments on Outer Wing End */}
              <group position={[wing.dir * WING_LEN, 0, 0]}>
                <mesh position={[0, TOTAL_H / 2 + 1.0, 0]} castShadow receiveShadow>
                  <boxGeometry args={[3.5, TOTAL_H + 2.0, WING_DEPTH + 0.4]} />
                  <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                </mesh>
                <mesh position={[0, TOTAL_H + 2.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                  <coneGeometry args={[2.8, 2.2, 4]} />
                  <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                </mesh>
                {isNight && (
                  <>
                    <mesh position={[0, TOTAL_H + 1.55, -WING_DEPTH / 2 - 0.25]}>
                      <boxGeometry args={[3.2, 0.08, 0.08]} />
                      <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.5} />
                    </mesh>
                    <mesh position={[0, TOTAL_H + 3.75, 0]}>
                      <sphereGeometry args={[0.2, 10, 8]} />
                      <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.0} />
                    </mesh>
                  </>
                )}
              </group>

              {/* Mid-wing classical pediment */}
              <group position={[wing.dir * (WING_LEN / 2), TOTAL_H + 1.1, -WING_DEPTH / 2 - 1.5]}>
                <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
                  <coneGeometry args={[2.0, 2.2, 4]} />
                  <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                </mesh>
                {isNight && (
                  <mesh position={[0, -0.9, -0.35]}>
                    <boxGeometry args={[2.4, 0.08, 0.08]} />
                    <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.4} />
                  </mesh>
                )}
              </group>

              {/* Luminous Roofline & Architectural Edge Accent at Night */}
              {isNight && (
                <mesh position={[wing.dir * (WING_LEN / 2), TOTAL_H + 0.72, -WING_DEPTH / 2 - 1.6]}>
                  <boxGeometry args={[WING_LEN, 0.06, 0.06]} />
                  <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.4} />
                </mesh>
              )}

              {/* Single Persistent Wing Facade Wash Light (zero shader recompile) */}
              <pointLight
                position={[wing.dir * 20.0, 7.5, -WING_DEPTH / 2 - 4.0]}
                color="#fed7aa"
                intensity={isNight ? 5.6 : 0}
                distance={48}
                decay={2}
              />
            </group>
          );
        })}

        {/* ============================================================== */}
        {/* 6. COMPLETE REAR BUILDING COMPLEX (RESTORING FULL DEPTH!)       */}
        {/*    (The massive rear academic block from Reference Photo 3)    */}
        {/* ============================================================== */}
        <group position={[0, 0, REAR_Z_CENTER]}>
          {/* A. REAR CENTRAL BLOCK */}
          <group position={[0, 0, 0]}>
            <mesh position={[0, TOTAL_H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[26.0, TOTAL_H, REAR_DEPTH]} />
              <meshStandardMaterial color={mats.wallCream} roughness={0.65} />
            </mesh>
            <mesh position={[0, TOTAL_H + 0.2, 0]} castShadow>
              <boxGeometry args={[26.6, 0.4, REAR_DEPTH + 0.6]} />
              <meshStandardMaterial color={mats.roofSlab} roughness={0.5} />
            </mesh>

            {/* Rear Center Window Grid & Floor Ledges */}
            {Array.from({ length: NUM_FLOORS }).map((_, fIdx) => (
              <group key={`rear_cnt_fl_${fIdx}`} position={[0, (fIdx + 0.5) * FLOOR_H, REAR_DEPTH / 2 + 0.08]}>
                <mesh castShadow>
                  <boxGeometry args={[22.0, FLOOR_H * 0.5, 0.1]} />
                  <meshStandardMaterial
                    color={mats.windowGlass}
                    roughness={0.15}
                    metalness={0.6}
                    emissive={isNight ? '#eab308' : '#000000'}
                    emissiveIntensity={isNight ? windowGlowIntensity * 1.1 : 0}
                  />
                </mesh>
                <mesh position={[0, FLOOR_H * 0.5 - 0.1, 0.05]} castShadow>
                  <boxGeometry args={[26.2, 0.3, 0.25]} />
                  <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                </mesh>
              </group>
            ))}

            {/* ROOFTOP RECTANGULAR WATER TANK HOUSING (Seen in Reference 3!) */}
            <mesh position={[0, TOTAL_H + 1.8, 0]} castShadow receiveShadow>
              <boxGeometry args={[14.0, 3.2, 7.0]} />
              <meshStandardMaterial color={mats.borderWhite} roughness={0.5} />
            </mesh>
            <mesh position={[0, TOTAL_H + 3.6, 0]} castShadow>
              <boxGeometry args={[14.6, 0.4, 7.6]} />
              <meshStandardMaterial color={mats.roofSlab} roughness={0.5} />
            </mesh>
            {isNight && (
              <mesh position={[0, TOTAL_H + 0.45, REAR_DEPTH / 2 + 0.12]}>
                <boxGeometry args={[26.0, 0.06, 0.06]} />
                <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.0} />
              </mesh>
            )}
            {/* Persistent Non-Shadow Rear Facade Wash Light */}
            <pointLight
              position={[0, 9.5, REAR_DEPTH / 2 + 5.5]}
              color="#fed7aa"
              intensity={isNight ? 4.8 : 0}
              distance={52}
              decay={2}
            />
          </group>

          {/* B. REAR LEFT WING AND REAR RIGHT WING */}
          {[
            { name: 'RearLeftWing', dir: -1 },
            { name: 'RearRightWing', dir: 1 },
          ].map((rWing) => {
            const rx = rWing.dir * (13.0 + REAR_WING_LEN / 2);
            const NUM_REAR_BAYS = 6;
            const RBAY_W = REAR_WING_LEN / NUM_REAR_BAYS;

            return (
              <group key={rWing.name} position={[rx, 0, 0]}>
                {/* Subterranean Rear Wing Foundation Plinth */}
                <mesh position={[0, -0.22, 0]} receiveShadow>
                  <boxGeometry args={[REAR_WING_LEN + 0.4, 0.45, REAR_DEPTH + 0.4]} />
                  <meshStandardMaterial color="#475569" roughness={0.9} />
                </mesh>

                {/* Main Rear Wing Solid Body */}
                <mesh position={[0, TOTAL_H / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[REAR_WING_LEN, TOTAL_H, REAR_DEPTH]} />
                  <meshStandardMaterial color={mats.wallCream} roughness={0.65} />
                </mesh>

                {/* Roof Slab */}
                <mesh position={[0, TOTAL_H + 0.2, 0]} castShadow>
                  <boxGeometry args={[REAR_WING_LEN + 0.6, 0.4, REAR_DEPTH + 0.6]} />
                  <meshStandardMaterial color={mats.roofSlab} roughness={0.5} />
                </mesh>

                {/* Continuous Rear Roof Balustrade */}
                <mesh position={[0, TOTAL_H + 0.7, REAR_DEPTH / 2 + 0.1]} castShadow>
                  <boxGeometry args={[REAR_WING_LEN + 0.4, 0.7, 0.15]} />
                  <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                </mesh>
                <mesh position={[0, TOTAL_H + 0.7, -REAR_DEPTH / 2 - 0.1]} castShadow>
                  <boxGeometry args={[REAR_WING_LEN + 0.4, 0.7, 0.15]} />
                  <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                </mesh>

                {/* Rear Windows on all 4 floors (External back wall) */}
                {Array.from({ length: NUM_FLOORS }).map((_, fIdx) => (
                  <group key={`rfl_${fIdx}`} position={[0, (fIdx + 0.5) * FLOOR_H, 0]}>
                    {/* Horizontal dividing ledges */}
                    <mesh position={[0, FLOOR_H * 0.5 - 0.1, REAR_DEPTH / 2 + 0.1]} castShadow>
                      <boxGeometry args={[REAR_WING_LEN + 0.2, 0.28, 0.25]} />
                      <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                    </mesh>

                    {/* Window bays on rear facade */}
                    {Array.from({ length: NUM_REAR_BAYS }).map((_, bIdx) => {
                      const bx = (bIdx - NUM_REAR_BAYS / 2 + 0.5) * RBAY_W;
                      const rWinHash = (fIdx * 11 + bIdx * 17) % 10;
                      const isRWinLit = isNight && rWinHash >= 3;
                      const rWinColor = rWinHash >= 5 ? '#fef08a' : '#f59e0b';
                      const rWinIntensity = isRWinLit ? (rWinHash >= 5 ? windowGlowIntensity * 1.35 : windowGlowIntensity * 0.95) : 0;

                      return (
                        <mesh key={`rwin_${bIdx}`} position={[bx, 0, REAR_DEPTH / 2 + 0.08]} castShadow>
                          <boxGeometry args={[RBAY_W * 0.62, FLOOR_H * 0.52, 0.08]} />
                          <meshStandardMaterial
                            color={mats.windowGlass}
                            roughness={0.15}
                            metalness={0.6}
                            emissive={rWinColor}
                            emissiveIntensity={rWinIntensity}
                          />
                        </mesh>
                      );
                    })}
                  </group>
                ))}

                {/* Vertical Pilasters dividing rear facade bays */}
                {Array.from({ length: NUM_REAR_BAYS + 1 }).map((_, bIdx) => {
                  const px = (bIdx - NUM_REAR_BAYS / 2) * RBAY_W;
                  return (
                    <mesh key={`rpil_${bIdx}`} position={[px, TOTAL_H / 2, REAR_DEPTH / 2 + 0.12]} castShadow>
                      <boxGeometry args={[0.65, TOTAL_H, 0.25]} />
                      <meshStandardMaterial color={mats.frameBeige} roughness={0.55} />
                    </mesh>
                  );
                })}

                {/* STAIRWELL TOWER RISING ABOVE REAR ROOF (Visible in Reference 3!) */}
                <group position={[0, TOTAL_H + 1.6, 0]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[6.0, 3.2, 6.0]} />
                    <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                  </mesh>
                  <mesh position={[0, 1.8, 0]} castShadow>
                    <boxGeometry args={[6.6, 0.35, 6.6]} />
                    <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                  </mesh>
                </group>

                {/* Outer Wing End Cap matching the front corner towers */}
                <group position={[rWing.dir * (REAR_WING_LEN / 2), 0, 0]}>
                  <mesh position={[0, TOTAL_H / 2 + 0.8, 0]} castShadow receiveShadow>
                    <boxGeometry args={[3.2, TOTAL_H + 1.6, REAR_DEPTH + 0.4]} />
                    <meshStandardMaterial color={mats.frameBeige} roughness={0.5} />
                  </mesh>
                  <mesh position={[0, TOTAL_H + 2.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                    <coneGeometry args={[2.6, 2.0, 4]} />
                    <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
                  </mesh>
                </group>
                {isNight && (
                  <mesh position={[0, TOTAL_H + 0.45, REAR_DEPTH / 2 + 0.12]}>
                    <boxGeometry args={[REAR_WING_LEN, 0.06, 0.06]} />
                    <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={2.0} />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>

        {/* ============================================================== */}
        {/* 7. ORGANIC IRREGULAR REAR CAMPUS PARKING COMPLEX                */}
        {/*    (Fitted strictly within available space, ZERO road overlap) */}
        {/* ============================================================== */}
        <group>
          {/* Irregular Asphalt Parking Apron (Formed from organic perimeter shape) */}
          {parkingGeo && (
            <mesh geometry={parkingGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} receiveShadow>
              <meshStandardMaterial color="#1f242e" roughness={0.9} />
            </mesh>
          )}

          {/* Pedestrian Walkway along Rear Building Facade */}
          <mesh position={[1.5, 0.08, 24.8]} receiveShadow>
            <boxGeometry args={[54.0, 0.16, 1.2]} />
            <meshStandardMaterial color={mats.floorStone} roughness={0.7} />
          </mesh>

          {/* Rear Entrance Steps to Building Back Doors */}
          {[-14.0, 0, 14.0].map((stepX, idx) => (
            <mesh key={`rear_step_${idx}`} position={[stepX, 0.09, 25.2]} receiveShadow>
              <boxGeometry args={[3.8, 0.18, 0.8]} />
              <meshStandardMaterial color={mats.borderWhite} roughness={0.4} />
            </mesh>
          ))}

          {/* Perimeter Concrete Curbs along the Irregular Contour (open at driveway mouth) */}
          {parkingPerimeterPts.map((p1, idx) => {
            const p2 = parkingPerimeterPts[(idx + 1) % parkingPerimeterPts.length];
            // Skip the driveway throat connecting to the road ([2.0, 46.8] to [8.0, 46.8])
            const isDrivewayMouth = Math.abs(p1[1] - 46.8) < 0.1 && Math.abs(p2[1] - 46.8) < 0.1;
            if (isDrivewayMouth) return null;

            const mx = (p1[0] + p2[0]) / 2.0;
            const mz = (p1[1] + p2[1]) / 2.0;
            const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const segAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);

            return (
              <mesh
                key={`p_curb_${idx}`}
                position={[mx, 0.12, mz]}
                rotation={[0, -segAngle, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[segLen + 0.08, 0.22, 0.28]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
              </mesh>
            );
          })}

          {/* Central Driving Lane Curved Divider Dashes */}
          {[
            [-16.0, 31.0, -0.65],
            [-10.0, 33.5, -0.45],
            [-4.0, 35.5, -0.25],
            [1.5, 38.0, -0.1],
            [5.0, 42.0, 0.0],
            [5.0, 45.0, 0.0],
            [10.0, 36.5, 0.2],
            [16.0, 35.0, 0.35],
            [21.0, 33.0, 0.45],
          ].map((pt, i) => (
            <mesh key={`p_dash_${i}`} position={[pt[0], 0.088, pt[1]]} rotation={[0, -pt[2], 0]} receiveShadow>
              <boxGeometry args={[2.8, 0.01, 0.18]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </mesh>
          ))}

          {/* ROW 1: Building-Facing Parking Stalls (depth 4.8m, Z = 25.2 to 29.8) */}
          {/* Left Side: 6 Four-Wheeler Car Bays (width 2.8m, white lines) */}
          {Array.from({ length: 7 }).map((_, i) => {
            const lx = -23.5 + i * 2.8;
            return (
              <group key={`r1_line_${i}`}>
                <mesh position={[lx, 0.088, 27.5]} receiveShadow>
                  <boxGeometry args={[0.12, 0.01, 4.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                {i < 6 && (
                  <mesh position={[lx + 1.4, 0.11, 25.8]} castShadow>
                    <boxGeometry args={[1.8, 0.12, 0.16]} />
                    <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* Right Side: 14 Two-Wheeler / Motorbike Bays (width 1.35m, yellow lines) */}
          {Array.from({ length: 15 }).map((_, i) => {
            const bx = 4.5 + i * 1.35;
            return (
              <group key={`bike_line_${i}`}>
                <mesh position={[bx, 0.088, 26.8]} receiveShadow>
                  <boxGeometry args={[0.08, 0.01, 3.2]} />
                  <meshStandardMaterial color="#facc15" roughness={0.4} />
                </mesh>
                {i < 14 && (
                  <mesh position={[bx + 0.675, 0.1, 25.7]} castShadow>
                    <boxGeometry args={[0.85, 0.08, 0.10]} />
                    <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* ROW 2: Middle Pocket Stalls (Fitted well within the irregular curved boundary) */}
          {/* West Pocket: 4 Car Bays (Z = 35.8 to 40.4) */}
          {Array.from({ length: 5 }).map((_, i) => {
            const lx = -13.0 + i * 2.8;
            return (
              <group key={`r2w_line_${i}`}>
                <mesh position={[lx, 0.088, 38.1]} receiveShadow>
                  <boxGeometry args={[0.12, 0.01, 4.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                {i < 4 && (
                  <mesh position={[lx + 1.4, 0.11, 40.2]} castShadow>
                    <boxGeometry args={[1.8, 0.12, 0.16]} />
                    <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* East Pocket: 4 Car Bays (Z = 36.2 to 40.8) */}
          {Array.from({ length: 5 }).map((_, i) => {
            const lx = 8.5 + i * 2.8;
            return (
              <group key={`r2e_line_${i}`}>
                <mesh position={[lx, 0.088, 38.5]} receiveShadow>
                  <boxGeometry args={[0.12, 0.01, 4.6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.4} />
                </mesh>
                {i < 4 && (
                  <mesh position={[lx + 1.4, 0.11, 40.6]} castShadow>
                    <boxGeometry args={[1.8, 0.12, 0.16]} />
                    <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
                  </mesh>
                )}
              </group>
            );
          })}

          {/* PARKED 3D CARS (All strictly within marked bays) */}
          <CampusParkedCar position={[-20.7, 0, 27.6]} color="#cbd5e1" />
          <CampusParkedCar position={[-15.1, 0, 27.6]} color="#1e3a8a" />
          <CampusParkedCar position={[-9.5, 0, 27.6]} color="#ffffff" />
          <CampusParkedCar position={[-8.8, 0, 38.1]} rotation={[0, Math.PI, 0]} color="#991b1b" />
          <CampusParkedCar position={[11.3, 0, 38.5]} rotation={[0, Math.PI, 0]} color="#475569" />
          <CampusParkedCar position={[16.9, 0, 38.5]} rotation={[0, Math.PI, 0]} color="#0284c7" />

          {/* PARKED TWO-WHEELERS (SCOOTERS / MOTORBIKES) */}
          <CampusMotorbike position={[5.85, 0, 26.8]} color="#dc2626" />
          <CampusMotorbike position={[7.2, 0, 26.8]} color="#18181b" />
          <CampusMotorbike position={[9.9, 0, 26.8]} color="#2563eb" />
          <CampusMotorbike position={[12.6, 0, 26.8]} color="#eab308" />
          <CampusMotorbike position={[15.3, 0, 26.8]} color="#475569" />
          <CampusMotorbike position={[18.0, 0, 26.8]} color="#16a34a" />
          <CampusMotorbike position={[20.7, 0, 26.8]} color="#dc2626" />

          {/* MODERN ARCHITECTURAL LIGHT POLES & NIGHT DOWNLIGHTS */}
          {[-15.0, 0.0, 15.0].map((px, i) => (
            <group key={`pole_${i}`} position={[px, 0, 33.2]}>
              {/* Island Curb */}
              <mesh position={[0, 0.12, 0]} castShadow>
                <boxGeometry args={[0.9, 0.24, 0.9]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
              </mesh>
              {/* Pole Mast */}
              <mesh position={[0, 3.25, 0]} castShadow>
                <cylinderGeometry args={[0.07, 0.1, 6.2, 12]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
              </mesh>
              {/* Horizontal Cross Arm */}
              <mesh position={[0, 6.25, 0]} castShadow>
                <boxGeometry args={[1.6, 0.08, 0.08]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
              </mesh>
              {/* LED Fixture Heads */}
              {[-0.7, 0.7].map((fx, fi) => (
                <mesh key={`head_${fi}`} position={[fx, 6.2, 0]} castShadow>
                  <boxGeometry args={[0.32, 0.06, 0.22]} />
                  <meshStandardMaterial
                    color="#475569"
                    emissive={isNight ? '#fef08a' : '#000000'}
                    emissiveIntensity={isNight ? 2.5 : 0}
                  />
                </mesh>
              ))}
              {/* Baked-style Warm Parking Ground Glow Pool at Night (0 PointLights) */}
              <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={isNight}>
                <circleGeometry args={[6.2, 16]} />
                <meshBasicMaterial color="#fef08a" transparent opacity={0.26} depthWrite={false} />
              </mesh>
            </group>
          ))}

          {/* ENTRANCE SIGNPOST AT DRIVEWAY */}
          <group position={[1.2, 0, 46.5]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 2.2, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.4} />
            </mesh>
            <mesh position={[0, 2.0, 0]} castShadow>
              <boxGeometry args={[2.4, 0.7, 0.08]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <Html position={[0, 2.0, 0.05]} center distanceFactor={35} transform zIndexRange={[10, 0]}>
              <div
                className="bg-slate-900/90 text-amber-300 px-2.5 py-0.5 rounded font-bold text-[10px] tracking-wider border border-amber-400/40 shadow-sm pointer-events-none select-none whitespace-nowrap"
                style={{ backfaceVisibility: 'hidden' }}
              >
                CAMPUS PARKING • MAIN COMPLEX
              </div>
            </Html>
          </group>
        </group>

        {/* ============================================================== */}
        {/* 8. PAVED ENTRANCE APRON, COURTYARD & LANDSCAPE LIGHTING       */}
        {/* ============================================================== */}
        <group position={[0, 0, PORTICO_Z]}>
          {/* Paved Interlocking Stone Courtyard Apron connecting portico to driveway */}
          <mesh position={[0, 0.05, -3.0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[28.0, 14.0]} />
            <meshStandardMaterial color={mats.floorStone} roughness={0.7} />
          </mesh>

          {/* Semicircular pathway bollards around entrance plaza */}
          {[-16, -10, -5, 5, 10, 16].map((bx, idx) => (
            <group key={`pl_bollard_${idx}`} position={[bx, 0, -9.5]}>
              <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.07, 0.09, 0.9, 10]} />
                <meshStandardMaterial color="#334155" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.88, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.1, 10]} />
                <meshStandardMaterial
                  color={isNight ? '#fef08a' : '#94a3b8'}
                  emissive={isNight ? '#fef08a' : '#000000'}
                  emissiveIntensity={isNight ? 3.5 : 0}
                />
              </mesh>
            </group>
          ))}

          {/* Palm Trees along Front Entrance Approach with Night Uplights */}
          {[-22.0, -15.0, 15.0, 22.0].map((px, idx) => (
            <group key={`courtyard_palm_${idx}`} position={[px, 0, -10.5]}>
              {/* Trunk */}
              <mesh position={[0, 2.7, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.25, 5.4, 8]} />
                <meshStandardMaterial color="#78350f" roughness={0.85} />
              </mesh>
              {/* Leafy Crown */}
              <mesh position={[0, 5.8, 0]} castShadow>
                <sphereGeometry args={[1.9, 12, 8]} />
                <meshStandardMaterial color="#166534" roughness={0.75} />
              </mesh>
              {/* Palm Uplight at night */}
              {isNight && (
                <group position={[0, 0.4, 0.3]}>
                  <mesh>
                    <cylinderGeometry args={[0.12, 0.16, 0.1, 8]} />
                    <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.2} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>

        {/* ============================================================== */}
        {/* 9. 3D FLOATING NAME & STATS BADGE                              */}
        {/* ============================================================== */}
        <Html
          position={[0, TOTAL_H + 15.0, -2.0]}
          center
          distanceFactor={90}
          zIndexRange={[10, 0]}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(building);
            }}
            className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-xl transition-all duration-200 pointer-events-auto flex items-center gap-2 ${
              isSelected
                ? 'bg-blue-600 text-white ring-2 ring-white scale-110'
                : isHighlighted
                ? 'bg-slate-900/95 text-white ring-1 ring-blue-400'
                : 'bg-slate-900/85 text-slate-100 backdrop-blur-md border border-slate-700/60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <span className="font-bold tracking-tight">Main Academic & Technology Complex</span>
            <span className="text-[10px] text-amber-300 bg-slate-800/90 px-1.5 py-0.5 rounded font-mono font-medium">
              4 Floors • Full Complex
            </span>
          </div>
        </Html>
      </group>
    </group>

    {/* Live Interactive 3D Transform Gizmo (Move / Rotate / Scale) in Edit Mode */}
    {isEditMode && transformMode && outerGroupRef.current && (
      <TransformControls
        object={outerGroupRef.current}
        mode={transformMode}
        onMouseDown={() => onTransformDraggingChanged?.(true)}
        onMouseUp={() => onTransformDraggingChanged?.(false)}
        onObjectChange={() => {
          if (outerGroupRef.current && onChangeConfig && config) {
            onChangeConfig({
              ...config,
              posX: parseFloat(outerGroupRef.current.position.x.toFixed(2)),
              posY: parseFloat(outerGroupRef.current.position.y.toFixed(2)),
              posZ: parseFloat(outerGroupRef.current.position.z.toFixed(2)),
              rotY: parseFloat(outerGroupRef.current.rotation.y.toFixed(3)),
              scale: parseFloat(outerGroupRef.current.scale.x.toFixed(2)),
            });
          }
        }}
      />
    )}
  </>
  );
}
