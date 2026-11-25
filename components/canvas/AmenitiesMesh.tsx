'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Amenity } from '@/types/campus';
import { CentralGardenDetailed } from './CentralGardenDetailed';

interface AmenitiesMeshProps {
  amenities: Amenity[];
  selectedAmenityId?: string;
  isNight?: boolean;
  onSelectAmenity: (amenity: Amenity) => void;
}

export function AmenitiesMesh({ amenities, selectedAmenityId, isNight = false, onSelectAmenity }: AmenitiesMeshProps) {
  return (
    <group>
      {amenities.map((amenity) => (
        <AmenityItem
          key={amenity.id}
          amenity={amenity}
          isSelected={selectedAmenityId === amenity.id}
          isNight={isNight}
          onSelect={onSelectAmenity}
        />
      ))}
    </group>
  );
}

function AmenityItem({
  amenity,
  isSelected,
  isNight = false,
  onSelect,
}: {
  amenity: Amenity;
  isSelected: boolean;
  isNight?: boolean;
  onSelect: (a: Amenity) => void;
}) {
  const { shape, cx, cz } = useMemo(() => {
    const s = new THREE.Shape();
    const pts = amenity.polygon;
    const [c_x, c_z] = amenity.center;

    if (!pts || pts.length < 3) return { shape: null, cx: c_x, cz: c_z };

    s.moveTo(pts[0][0] - c_x, -(pts[0][1] - c_z));
    for (let i = 1; i < pts.length; i++) {
      s.lineTo(pts[i][0] - c_x, -(pts[i][1] - c_z));
    }
    s.closePath();

    return { shape: s, cx: c_x, cz: c_z };
  }, [amenity.polygon, amenity.center]);

  const geometry = useMemo(() => {
    if (!shape) return null;
    return new THREE.ShapeGeometry(shape);
  }, [shape]);

  if (!geometry) return null;

  const isSportsGround = amenity.name.includes('Sports Ground');
  const isBasketball = amenity.name.includes('Basketball');
  const isCentralGarden = amenity.name.includes('Central');

  // Basketball Court & Central Garden are rendered as full editable Buildings via BuildingMesh
  if (isBasketball || isCentralGarden) return null;

  return (
    <group position={[cx, 0.08, cz]}>
      {isCentralGarden ? (
        <CentralGardenDetailed
          polygon={amenity.polygon}
          center={amenity.center}
          isSelected={isSelected}
          isNight={isNight}
          onClick={() => onSelect(amenity)}
        />
      ) : (
        <>
          {/* Standard Ground Decal Mesh for Other Amenities */}
          <mesh
            geometry={geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelect(amenity);
            }}
          >
            <meshStandardMaterial
              color={isSelected ? '#38bdf8' : amenity.color}
              roughness={0.8}
              metalness={0.05}
            />
          </mesh>

          {/* Cricket Pitch Strip & Two Football Goal Posts for Main Sports Ground */}
          {isSportsGround && (
            <group>
              {/* Cricket Pitch Strip */}
              <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[3.5, 20]} />
                <meshStandardMaterial color="#d4a373" roughness={0.9} />
              </mesh>

              {/* Two Regulation Football Goal Posts (North & South Ends) */}
              <FootballGoalPost position={[0, 0.08, -38]} rotationY={0} />
              <FootballGoalPost position={[0, 0.08, 38]} rotationY={Math.PI} />
            </group>
          )}
        </>
      )}

      {/* Floating Amenity Label */}
      <Html
        position={isCentralGarden ? [0.45, 3.0, -1.75] : [0, 2, 0]}
        center
        distanceFactor={100}
        zIndexRange={[10, 0]}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(amenity);
          }}
          className={`cursor-pointer px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shadow transition-all duration-200 flex items-center gap-1 ${
            isSelected
              ? 'bg-sky-500 text-white ring-2 ring-white scale-110'
              : 'bg-emerald-950/80 text-emerald-100 border border-emerald-600/40'
          }`}
        >
          <span>{isSportsGround ? '🏏 SIT Sports Ground' : '🌿 Central Garden'}</span>
        </div>
      </Html>
    </group>
  );
}

// ----------------------------------------------------------------------
// SITTING BENCH AREA (Along Roadside North-East of Basketball Court)
// ----------------------------------------------------------------------
export function CourtSittingBenchArea({
  isNight = false,
  position = [-50.0, 0.08, -83.5],
  rotationY = -4 * (Math.PI / 180),
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  isNight?: boolean;
  position?: [number, number, number];
  rotationY?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}) {
  const benchPositionsX = [-7.6, -3.8, 0, 3.8, 7.6];

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={() => {
        onPointerOut?.();
      }}
    >
      {/* Paved Concrete & Stone Seating Plaza Pad (20m x 3.8m) */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[20.4, 0.14, 3.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.055, 0]} receiveShadow>
        <boxGeometry args={[19.8, 0.03, 3.2]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.75} />
      </mesh>

      {/* Paver Joint Lines */}
      {[-6, -2, 2, 6].map((jx, idx) => (
        <mesh key={`plaza_joint_${idx}`} position={[jx, 0.072, 0]}>
          <boxGeometry args={[0.06, 0.005, 3.15]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}

      {/* Landscaped Green Shrub Border Behind Benches (Roadside) */}
      <mesh position={[0, 0.35, -1.55]} castShadow receiveShadow>
        <boxGeometry args={[19.6, 0.65, 0.55]} />
        <meshStandardMaterial color="#15803d" roughness={0.95} />
      </mesh>
      {/* End Planter Hedges */}
      <mesh position={[-9.85, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.65, 3.1]} />
        <meshStandardMaterial color="#15803d" roughness={0.95} />
      </mesh>
      <mesh position={[9.85, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.65, 3.1]} />
        <meshStandardMaterial color="#15803d" roughness={0.95} />
      </mesh>

      {/* 5 Campus Park Sitting Benches Facing the Basketball Court (+Z) */}
      {benchPositionsX.map((bx, idx) => (
        <group key={`park_bench_${idx}`} position={[bx, 0.07, -0.35]}>
          {/* Dark Steel Frame Legs */}
          {[-1.05, 1.05].map((lx, lIdx) => (
            <group key={`leg_${lIdx}`} position={[lx, 0, 0]}>
              <mesh position={[0, 0.22, 0]} castShadow>
                <boxGeometry args={[0.07, 0.44, 0.52]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Armrest */}
              <mesh position={[0, 0.54, 0.02]} castShadow>
                <boxGeometry args={[0.07, 0.05, 0.48]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          ))}

          {/* Timber Slatted Seat (3 slats) */}
          {[-0.14, 0, 0.14].map((sz, sIdx) => (
            <mesh key={`seat_slat_${sIdx}`} position={[0, 0.44, sz]} castShadow receiveShadow>
              <boxGeometry args={[2.35, 0.045, 0.11]} />
              <meshStandardMaterial color="#b45309" roughness={0.6} />
            </mesh>
          ))}

          {/* Angled Timber Backrest (2 slats) */}
          <group position={[0, 0.72, -0.24]} rotation={[-0.18, 0, 0]}>
            <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.35, 0.12, 0.045]} />
              <meshStandardMaterial color="#b45309" roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.07, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.35, 0.12, 0.045]} />
              <meshStandardMaterial color="#b45309" roughness={0.6} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Subtle Warm Pathway Bollards at Night */}
      {isNight &&
        [-8.8, 0, 8.8].map((lx, idx) => (
          <group key={`bench_bollard_${idx}`} position={[lx, 0.07, 1.35]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.8, 10]} />
              <meshStandardMaterial color="#334155" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.1, 10]} />
              <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.2} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

/**
 * Standard 11-a-side Football Goal Post (7.32m wide x 2.44m tall) with white net.
 */
function FootballGoalPost({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const w = 7.32;
  const h = 2.44;
  const d = 1.8;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Left & Right Vertical Goal Posts */}
      <mesh position={[-w / 2, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, h, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, h, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Top Crossbar */}
      <mesh position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, w + 0.14, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Rear Ground Frame & Back Support Stanchions */}
      <mesh position={[0, 0.04, -d]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, w, 8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[-w / 2, 0.04, -d / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, d, 8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[w / 2, 0.04, -d / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, d, 8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {/* White Nylon Goal Netting (Back & Sides & Top) */}
      <mesh position={[0, h / 2, -d]}>
        <planeGeometry args={[w, h, 14, 6]} />
        <meshStandardMaterial color="#e2e8f0" wireframe transparent opacity={0.75} />
      </mesh>
      <mesh position={[-w / 2, h / 2, -d / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h, 4, 6]} />
        <meshStandardMaterial color="#e2e8f0" wireframe transparent opacity={0.75} />
      </mesh>
      <mesh position={[w / 2, h / 2, -d / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h, 4, 6]} />
        <meshStandardMaterial color="#e2e8f0" wireframe transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, h, -d / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d, 14, 4]} />
        <meshStandardMaterial color="#e2e8f0" wireframe transparent opacity={0.75} />
      </mesh>
    </group>
  );
}
