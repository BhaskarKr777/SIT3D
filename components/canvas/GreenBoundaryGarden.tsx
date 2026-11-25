'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Building, RoadSegment } from '@/types/campus';
import { getTerrainHeightAt } from '@/lib/terrainElevation';

interface GreenBoundaryGardenProps {
  boundary: [number, number][];
  buildings: Building[];
  roads: RoadSegment[];
  isNight?: boolean;
}

interface GardenTree {
  pos: [number, number, number];
  scale: number;
  variety: number;
  rotY: number;
}

interface GardenShrub {
  pos: [number, number, number];
  scale: number;
  color: string;
}

/** Point-in-polygon test in XZ plane */
function pointInPoly(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1];
    const xj = poly[j][0], zj = poly[j][1];
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distance from point to segment */
function distToSeg(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - a[0], pz - a[1]);
  let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}

/**
 * Creates a natural green tree garden along the right-hand and rear campus boundaries:
 * - Dense, naturally arranged multi-species trees (strictly inside boundary, clear of roads/buildings)
 * - Landscaped gravel/stone walking trails in open boundary corridors
 * - Park benches, flowering shrub beds, and subtle warm garden bollard lights at night
 */
export function GreenBoundaryGarden({
  boundary,
  buildings,
  roads,
  isNight = false,
}: GreenBoundaryGardenProps) {
  const assets = useMemo(() => {
    return {
      trunkGeo: new THREE.CylinderGeometry(0.14, 0.3, 2.7, 7),
      branchGeo: new THREE.CylinderGeometry(0.05, 0.1, 1.3, 6),
      canopyLarge: new THREE.IcosahedronGeometry(1.5, 1),
      canopyMed: new THREE.DodecahedronGeometry(1.05, 1),
      shrubGeo: new THREE.DodecahedronGeometry(0.65, 1),
      trunkMat: new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.92 }),
      deepGreen: new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.84 }),
      midGreen: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 }),
      lightGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.76 }),
      blossomMat: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7 }),
    };
  }, []);

  const { gardenTrees, gardenShrubs, trailSegments, gardenBenches, gardenLights } = useMemo(() => {
    if (!boundary || boundary.length < 3) {
      return {
        gardenTrees: [] as GardenTree[],
        gardenShrubs: [] as GardenShrub[],
        trailSegments: [] as { pos: [number, number, number]; rotY: number; len: number }[],
        gardenBenches: [] as { pos: [number, number, number]; rotY: number }[],
        gardenLights: [] as [number, number, number][],
      };
    }

    const isClearOfInfrastructure = (x: number, z: number, minRoadDist = 4.6, minBldgDist = 7.2) => {
      if (!pointInPoly(x, z, boundary)) return false;

      // Keep 2.5m inside boundary fence
      for (let i = 0; i < boundary.length; i++) {
        const p1 = boundary[i];
        const p2 = boundary[(i + 1) % boundary.length];
        if (distToSeg(x, z, p1, p2) < 2.6) return false;
      }

      // Avoid all buildings
      for (const b of buildings) {
        if (Math.hypot(x - b.center[0], z - b.center[1]) < minBldgDist) return false;
        if (b.polygon) {
          for (const pt of b.polygon) {
            if (Math.hypot(x - pt[0], z - pt[1]) < 4.5) return false;
          }
        }
      }

      // Avoid all roads
      for (const r of roads) {
        for (let i = 0; i < r.points.length - 1; i++) {
          if (distToSeg(x, z, r.points[i], r.points[i + 1]) < minRoadDist) return false;
        }
      }

      // Avoid river channel (8.5m clearance)
      const riverPts: [number, number][] = [
        [-32, 175],
        [6, 152],
        [34, 112],
        [46, 74],
        [57.6, 32.6],
        [67, 0],
        [75, -26],
        [81.84, -52.49],
        [88, -82],
        [96, -125],
      ];
      for (let i = 0; i < riverPts.length - 1; i++) {
        if (distToSeg(x, z, riverPts[i], riverPts[i + 1]) < 8.5) return false;
      }

      // Avoid landmark big trees & their circular rock sitting areas
      if (Math.hypot(x - 22, z - -52) < 6.0) return false;
      if (Math.hypot(x - 38, z - -58) < 6.0) return false;

      // Avoid Rear Parking, Basketball Court, Volleyball Court, Central Garden & SIT Sports Ground
      if (x >= -34 && x <= 8 && z >= 16 && z <= 44) return false;
      if (x >= -65 && x <= -24 && z >= -87 && z <= -46) return false;
      if (x >= 92 && x <= 117 && z >= -3 && z <= 12) return false;
      if (x >= 10 && x <= 102 && z >= 119 && z <= 243) return false;
      if (Math.hypot(x - 19, z + 19) < 12) return false;

      return true;
    };

    const trees: GardenTree[] = [];
    const shrubs: GardenShrub[] = [];

    // 1. Right-hand & Rear Boundary Corridors (natural deterministic scatter)
    // Right-hand corridor: behind Central Canteen & along eastern hostel edge
    // Rear corridor: behind Main Building, Workshop, Block 5, and northern green belt
    const zones = [
      { minX: -65, maxX: 130, minZ: -116, maxZ: -95, step: 7.5 },  // Right-side canteen/hostel rear border
      { minX: 126, maxX: 155, minZ: -95, maxZ: 25, step: 7.2 },    // Right-side eastern boundary
      { minX: -145, maxX: -68, minZ: -118, maxZ: -65, step: 8.0 }, // Rear-right behind Block 5 & Workshop
      { minX: -55, maxX: 48, minZ: 40, maxZ: 78, step: 7.5 },      // Rear behind Main Building
    ];

    let seed = 1;
    const nextRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (const z of zones) {
      for (let gx = z.minX; gx <= z.maxX; gx += z.step) {
        for (let gz = z.minZ; gz <= z.maxZ; gz += z.step) {
          const jx = gx + (nextRand() - 0.5) * (z.step * 0.65);
          const jz = gz + (nextRand() - 0.5) * (z.step * 0.65);

          if (!isClearOfInfrastructure(jx, jz)) continue;

          const gy = getTerrainHeightAt(jx, jz);
          trees.push({
            pos: [jx, gy, jz],
            scale: 0.85 + nextRand() * 0.5,
            variety: Math.floor(nextRand() * 4),
            rotY: nextRand() * Math.PI * 2,
          });

          // Add 1–2 complementary flowering shrubs or undergrowth bushes nearby
          if (nextRand() > 0.4) {
            const sx = jx + (nextRand() - 0.5) * 3.2;
            const sz = jz + (nextRand() - 0.5) * 3.2;
            if (isClearOfInfrastructure(sx, sz, 3.8, 5.5)) {
              const colors = ['#15803d', '#166534', '#eab308', '#ec4899', '#ef4444'];
              shrubs.push({
                pos: [sx, getTerrainHeightAt(sx, sz) + 0.12, sz],
                scale: 0.45 + nextRand() * 0.4,
                color: colors[Math.floor(nextRand() * colors.length)],
              });
            }
          }
        }
      }
    }

    // 2. Keep garden trails empty behind Coffee/Sports building to avoid white strip crossing boundary
    const rawTrails: { p1: [number, number]; p2: [number, number] }[] = [];

    const trails: { pos: [number, number, number]; rotY: number; len: number }[] = [];
    const benches: { pos: [number, number, number]; rotY: number }[] = [];
    const lights: [number, number, number][] = [];

    for (const tr of rawTrails) {
      const mx = (tr.p1[0] + tr.p2[0]) / 2;
      const mz = (tr.p1[1] + tr.p2[1]) / 2;
      const dx = tr.p2[0] - tr.p1[0];
      const dz = tr.p2[1] - tr.p1[1];
      const len = Math.hypot(dx, dz);
      const rotY = Math.atan2(-dz, dx);
      const gy = getTerrainHeightAt(mx, mz);

      trails.push({ pos: [mx, gy + 0.03, mz], rotY, len });
      benches.push({ pos: [mx, gy + 0.05, mz - 1.6], rotY });
      lights.push([tr.p1[0] + 2, gy + 0.05, tr.p1[1] + 1.2]);
      lights.push([tr.p2[0] - 2, gy + 0.05, tr.p2[1] + 1.2]);
    }

    return {
      gardenTrees: trees,
      gardenShrubs: shrubs,
      trailSegments: trails,
      gardenBenches: benches,
      gardenLights: lights,
    };
  }, [boundary, buildings, roads]);

  return (
    <group>
      {/* 1. Dense Natural Garden Trees */}
      {gardenTrees.map((t, idx) => {
        const matA = t.variety % 2 === 0 ? assets.deepGreen : assets.midGreen;
        const matB = t.variety === 2 ? assets.lightGreen : assets.midGreen;
        return (
          <group key={`gtree_${idx}`} position={t.pos} scale={[t.scale, t.scale, t.scale]} rotation={[0, t.rotY, 0]}>
            <mesh position={[0, 1.35, 0]} geometry={assets.trunkGeo} material={assets.trunkMat} castShadow receiveShadow />
            <mesh position={[0.35, 2.25, 0.1]} rotation={[0.1, 0, -0.5]} geometry={assets.branchGeo} material={assets.trunkMat} castShadow />
            <mesh position={[0, 3.55, 0]} scale={[1.15, 0.9, 1.15]} geometry={assets.canopyLarge} material={matA} castShadow receiveShadow />
            <mesh position={[0.85, 3.15, 0.35]} geometry={assets.canopyMed} material={matB} castShadow />
            <mesh position={[-0.85, 3.2, -0.35]} geometry={assets.canopyMed} material={assets.lightGreen} castShadow />
            {t.variety === 2 && (
              <mesh position={[0.45, 3.85, 0.65]} scale={[0.5, 0.5, 0.5]} geometry={assets.canopyMed} material={assets.blossomMat} />
            )}
          </group>
        );
      })}

      {/* 2. Garden Shrubs & Flowering Undergrowth */}
      {gardenShrubs.map((s, idx) => (
        <mesh
          key={`gshrub_${idx}`}
          position={s.pos}
          scale={[s.scale * 1.2, s.scale * 0.8, s.scale]}
          geometry={assets.shrubGeo}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={s.color} roughness={0.88} />
        </mesh>
      ))}

      {/* 3. Landscaped Walking Trails */}
      {trailSegments.map((tr, idx) => (
        <group key={`gtrail_${idx}`} position={tr.pos} rotation={[0, tr.rotY, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[tr.len, 0.05, 1.9]} />
            <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
          </mesh>
          {/* Stone edge curbs */}
          <mesh position={[0, 0.02, -0.95]}>
            <boxGeometry args={[tr.len, 0.07, 0.12]} />
            <meshStandardMaterial color="#78716c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.02, 0.95]}>
            <boxGeometry args={[tr.len, 0.07, 0.12]} />
            <meshStandardMaterial color="#78716c" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 4. Garden Park Benches */}
      {gardenBenches.map((b, idx) => (
        <group key={`gbench_${idx}`} position={b.pos} rotation={[0, b.rotY, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[2.1, 0.06, 0.45]} />
            <meshStandardMaterial color="#b45309" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.72, -0.2]} rotation={[-0.15, 0, 0]} castShadow>
            <boxGeometry args={[2.1, 0.3, 0.06]} />
            <meshStandardMaterial color="#b45309" roughness={0.65} />
          </mesh>
          <mesh position={[-0.85, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.44]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} />
          </mesh>
          <mesh position={[0.85, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.44, 0.44]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 5. Subtle Garden Pathway Lights */}
      {gardenLights.map((pos, idx) => (
        <group key={`glight_${idx}`} position={pos}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.9, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.12, 8]} />
            <meshStandardMaterial
              color={isNight ? '#fef08a' : '#cbd5e1'}
              emissive={isNight ? '#fde047' : '#000000'}
              emissiveIntensity={isNight ? 3.2 : 0}
            />
          </mesh>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={isNight}>
            <circleGeometry args={[1.6, 12]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

