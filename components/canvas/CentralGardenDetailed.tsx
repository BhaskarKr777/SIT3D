'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface CentralGardenDetailedProps {
  polygon: [number, number][];
  center: [number, number];
  isSelected?: boolean;
  isNight?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

/**
 * High-fidelity 3D representation of the SIT Main Central Garden,
 * modeled after the actual Siliguri Institute of Technology campus garden:
 * - Raised manicured green lawn following the exact road-loop footprint
 * - Continuous concrete curb & neatly trimmed perimeter boxwood hedge
 * - Deep burgundy ornamental shrub bed along the building-side arc
 * - Prominent 3D topiary grass-hedged "SIT" lettering centered on the lawn
 * - Front stone marker, flowering borders, and warm night bollards
 */
export function CentralGardenDetailed({
  polygon,
  center,
  isSelected = false,
  isNight = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: CentralGardenDetailedProps) {
  const [cx, cz] = center;

  // Convert polygon to local 2D points relative to center
  const localPts = useMemo(() => {
    if (!polygon || polygon.length < 3) return [];
    return polygon.map(([px, pz]) => [px - cx, pz - cz] as [number, number]);
  }, [polygon, cx, cz]);

  // Base lawn Shape & ExtrudeGeometry
  const { lawnShape, insetLawnShape, perimeterSegments } = useMemo(() => {
    if (localPts.length < 3) {
      return { lawnShape: null, insetLawnShape: null, perimeterSegments: [] };
    }

    const s = new THREE.Shape();
    s.moveTo(localPts[0][0], -localPts[0][1]);
    for (let i = 1; i < localPts.length; i++) {
      s.lineTo(localPts[i][0], -localPts[i][1]);
    }
    s.closePath();

    // Compute centroid of localPts for inset scaling
    let avgX = 0;
    let avgZ = 0;
    const uniqueCount = localPts.length - 1;
    for (let i = 0; i < uniqueCount; i++) {
      avgX += localPts[i][0];
      avgZ += localPts[i][1];
    }
    avgX /= uniqueCount;
    avgZ /= uniqueCount;

    // Inset shape (~84% towards centroid) for raised inner grass bed
    const insetPts = localPts.map(([x, z]) => [
      avgX + (x - avgX) * 0.84,
      avgZ + (z - avgZ) * 0.84,
    ] as [number, number]);

    const sInset = new THREE.Shape();
    sInset.moveTo(insetPts[0][0], -insetPts[0][1]);
    for (let i = 1; i < insetPts.length; i++) {
      sInset.lineTo(insetPts[i][0], -insetPts[i][1]);
    }
    sInset.closePath();

    // Perimeter hedge segments inset slightly inside the concrete curb (~92%)
    const hedgePts = localPts.map(([x, z]) => [
      avgX + (x - avgX) * 0.92,
      avgZ + (z - avgZ) * 0.92,
    ] as [number, number]);

    const segs: {
      midX: number;
      midZ: number;
      length: number;
      angle: number;
      isBackArc: boolean;
    }[] = [];

    for (let i = 0; i < hedgePts.length - 1; i++) {
      const [x1, z1] = hedgePts[i];
      const [x2, z2] = hedgePts[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      segs.push({
        midX: (x1 + x2) / 2,
        midZ: (z1 + z2) / 2,
        length: len,
        angle: Math.atan2(-dz, dx),
        // Segments 1..7 form the inner curved arc facing the Main Building
        isBackArc: i >= 1 && i <= 7,
      });
    }

    return { lawnShape: s, insetLawnShape: sInset, perimeterSegments: segs };
  }, [localPts]);

  // Decorative flowering plants along the front curb & inner border
  const ornamentalClusters = useMemo(() => {
    return [
      { pos: [1.5, 0.14, -2.5] as [number, number, number], color: '#eab308', scale: 0.28 },
      { pos: [3.2, 0.14, 0.2] as [number, number, number], color: '#ef4444', scale: 0.26 },
      { pos: [4.8, 0.14, 2.4] as [number, number, number], color: '#db2777', scale: 0.28 },
      { pos: [-0.2, 0.14, -5.2] as [number, number, number], color: '#f97316', scale: 0.25 },
      { pos: [6.2, 0.14, 4.6] as [number, number, number], color: '#eab308', scale: 0.26 },
    ];
  }, []);

  if (!lawnShape || !insetLawnShape) return null;

  // Rotation so "SIT" reads left-to-right from the front driveway looking towards the Main Building
  const sitGroupRotY = 122 * (Math.PI / 180);

  return (
    <group
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
      {/* 1. Concrete Perimeter Curb Base (grounded firmly on terrain) */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <extrudeGeometry
          args={[
            lawnShape,
            {
              depth: 0.14,
              bevelEnabled: true,
              bevelThickness: 0.04,
              bevelSize: 0.18,
              bevelSegments: 2,
            },
          ]}
        />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* 2. Fresh Manicured Green Lawn Surface */}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[lawnShape]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#22c55e'}
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>

      {/* 3. Gently Raised Inner Grass Bed (natural mounded campus lawn) */}
      <mesh position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <extrudeGeometry
          args={[
            insetLawnShape,
            {
              depth: 0.08,
              bevelEnabled: true,
              bevelThickness: 0.06,
              bevelSize: 0.35,
              bevelSegments: 2,
            },
          ]}
        />
        <meshStandardMaterial color="#4ade80" roughness={0.9} metalness={0.02} />
      </mesh>

      {/* 4. Continuous Neatly Trimmed Perimeter Boxwood Hedge */}
      {perimeterSegments.map((seg, idx) => (
        <group
          key={`garden_hedge_${idx}`}
          position={[seg.midX, 0.34, seg.midZ]}
          rotation={[0, seg.angle, 0]}
        >
          {/* Main Trimmed Hedge Wall */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[seg.length + 0.25, 0.48, 0.52]} />
            <meshStandardMaterial color="#15803d" roughness={0.92} />
          </mesh>
          {/* Upper Trimmed Crown */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[seg.length + 0.2, 0.08, 0.42]} />
            <meshStandardMaterial color="#16a34a" roughness={0.88} />
          </mesh>

          {/* Deep Burgundy Ornamental Shrubs along the building-side arc (matches photo) */}
          {seg.isBackArc && (
            <group position={[0, 0.18, 0.42]}>
              <mesh castShadow>
                <dodecahedronGeometry args={[0.36, 1]} />
                <meshStandardMaterial color="#6b1d3a" roughness={0.95} />
              </mesh>
              {seg.length > 2.2 && (
                <mesh position={[seg.length * 0.28, -0.04, 0.05]} castShadow>
                  <dodecahedronGeometry args={[0.3, 1]} />
                  <meshStandardMaterial color="#7e2245" roughness={0.95} />
                </mesh>
              )}
            </group>
          )}
        </group>
      ))}

      {/* 5. Iconic Front Stone Marker (centered at the front curb) */}
      <group position={[3.0, 0.25, -1.35]} rotation={[0, sitGroupRotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.85, 0.36, 0.65]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 0.08, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
        </mesh>
      </group>

      {/* 6. Colorful Ornamental Plants & Flowering Shrubs */}
      {ornamentalClusters.map((plant, idx) => (
        <group key={`ornamental_${idx}`} position={plant.pos}>
          {/* Green foliage base */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <dodecahedronGeometry args={[plant.scale, 1]} />
            <meshStandardMaterial color="#166534" roughness={0.9} />
          </mesh>
          {/* Flowering top */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <dodecahedronGeometry args={[plant.scale * 0.68, 0]} />
            <meshStandardMaterial color={plant.color} roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* 7. PROMINENT 3D TOPIARY GRASS-HEDGED "SIT" LETTERING (Centered in Garden) */}
      <group position={[1.47, 0.22, -0.41]} rotation={[0, sitGroupRotY, 0]} scale={[0.78, 1, 0.78]}>
        {/* Decorative Low Inner Framing Border */}
        <mesh position={[0, 0.03, 1.55]} receiveShadow>
          <boxGeometry args={[9.4, 0.1, 0.22]} />
          <meshStandardMaterial color="#15803d" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.03, -1.55]} receiveShadow>
          <boxGeometry args={[9.4, 0.1, 0.22]} />
          <meshStandardMaterial color="#15803d" roughness={0.9} />
        </mesh>

        {/* LETTER "S" (Left) */}
        <group position={[-3.0, 0.18, 0]}>
          {/* Top bar */}
          <HedgeStroke pos={[0, 0, -1.0]} size={[2.0, 0.36, 0.56]} />
          {/* Upper left vertical */}
          <HedgeStroke pos={[-0.72, 0, -0.5]} size={[0.56, 0.36, 1.0]} />
          {/* Middle bar */}
          <HedgeStroke pos={[0, 0, 0]} size={[2.0, 0.36, 0.56]} />
          {/* Lower right vertical */}
          <HedgeStroke pos={[0.72, 0, 0.5]} size={[0.56, 0.36, 1.0]} />
          {/* Bottom bar */}
          <HedgeStroke pos={[0, 0, 1.0]} size={[2.0, 0.36, 0.56]} />
        </group>

        {/* LETTER "I" (Center, with classic top & bottom serifs as in photo) */}
        <group position={[0, 0.18, 0]}>
          {/* Top serif */}
          <HedgeStroke pos={[0, 0, -1.0]} size={[1.5, 0.36, 0.52]} />
          {/* Center vertical stem */}
          <HedgeStroke pos={[0, 0, 0]} size={[0.62, 0.36, 2.2]} />
          {/* Bottom serif */}
          <HedgeStroke pos={[0, 0, 1.0]} size={[1.5, 0.36, 0.52]} />
        </group>

        {/* LETTER "T" (Right) */}
        <group position={[2.85, 0.18, 0]}>
          {/* Top horizontal bar */}
          <HedgeStroke pos={[0, 0, -1.0]} size={[2.2, 0.36, 0.56]} />
          {/* Center vertical stem */}
          <HedgeStroke pos={[0, 0, 0.15]} size={[0.62, 0.36, 2.2]} />
        </group>

        {/* Persistent warm uplight for SIT lettering at night */}
        <pointLight position={[0, 2.4, 0.5]} color="#fef08a" intensity={isNight ? 2.4 : 0} distance={16} decay={2} />
      </group>

      {/* 8. Night Landscape Bollard Lights around Garden Perimeter */}
      {isNight && (
        <group>
          {[
            [-2.4, 0.14, -4.5],
            [0.2, 0.14, -7.2],
            [2.4, 0.14, 1.8],
            [5.8, 0.14, 4.8],
            [-1.8, 0.14, 0.8],
          ].map((pos, bIdx) => (
            <group key={`garden_bollard_${bIdx}`} position={pos as [number, number, number]}>
              <mesh position={[0, 0.38, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 0.76, 10]} />
                <meshStandardMaterial color="#334155" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.78, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.1, 10]} />
                <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={3.5} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function HedgeStroke({
  pos,
  size,
}: {
  pos: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <group position={pos}>
      {/* Darker trimmed hedge base */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#15803d" roughness={0.92} />
      </mesh>
      {/* Brighter fresh-cut topiary grass crown */}
      <mesh position={[0, size[1] * 0.46, 0]} castShadow>
        <boxGeometry args={[size[0] * 0.94, 0.07, size[2] * 0.94]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>
    </group>
  );
}
