'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { RoadSegment } from '@/types/campus';

interface RoadsMeshProps {
  roads: RoadSegment[];
  paths: RoadSegment[];
}

export function RoadsMesh({ roads, paths }: RoadsMeshProps) {
  // Build road asphalt + concrete curb shoulder + pedestrian path geometries
  const { roadGeometry, roadCurbGeometry, pathGeometry, asphaltTexture } = useMemo(() => {
    let tex: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 650; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.16)';
          ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
        }
      }
      tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(60, 60);
    }

    return {
      roadGeometry: buildRibbonGeometry(roads, 4.4),
      roadCurbGeometry: buildRibbonGeometry(roads, 5.1),
      pathGeometry: buildRibbonGeometry(paths, 2.2),
      asphaltTexture: tex,
    };
  }, [roads, paths]);

  useEffect(() => {
    return () => {
      roadGeometry?.dispose();
      roadCurbGeometry?.dispose();
      pathGeometry?.dispose();
      asphaltTexture?.dispose();
    };
  }, [roadGeometry, roadCurbGeometry, pathGeometry, asphaltTexture]);

  return (
    <group>
      {/* Concrete Road Curb / Shoulder Borders */}
      {roadCurbGeometry && (
        <mesh geometry={roadCurbGeometry} position={[0, 0.032, 0]} receiveShadow>
          <meshStandardMaterial color="#64748b" roughness={0.88} />
        </mesh>
      )}

      {/* Vehicular Asphalt Roads & Driveways */}
      {roadGeometry && (
        <mesh geometry={roadGeometry} position={[0, 0.042, 0]} receiveShadow>
          <meshStandardMaterial
            map={asphaltTexture || undefined}
            color="#27272a" // dark asphalt
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* Pedestrian Paved Pathways */}
      {pathGeometry && (
        <mesh geometry={pathGeometry} position={[0, 0.036, 0]} receiveShadow>
          <meshStandardMaterial
            color="#e2e8f0" // light stone pavers
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* Trimmed Boxwood Bush Fence Border along Central Lawn Roadside */}
      <RoadsideBushFence />

      {/* Roadside Security Fence on Both Sides of Main Campus Road (Main Gate -> Sports Ground) */}
      <MainRoadSideFences roads={roads} />
    </group>
  );
}

function RoadsideBushFence() {
  const segments = useMemo(() => {
    const offset = 2.95; // Flush along outer road curb on the big-trees lawn side
    const out: { midX: number; midZ: number; length: number; angle: number }[] = [];

    // Chain A: Central Garden outer loop -> Cafeteria Pavilion B road (starts cleanly after T-junction)
    const chainA: [number, number][] = [
      [33.59, -20.87],
      [31.66, -24.6],
      [28.98, -27.84],
      [25.69, -30.46],
      [21.94, -32.34],
      [17.87, -33.4],
      [13.68, -33.59],
      [9.53, -32.89],
      [-8.8, -60.61],
      [-14.52, -69.29],
      [-32.0, -85.45],
    ];

    // Chain B: Central Garden junction -> Bridge #2 approach (starts cleanly after T-junction)
    const chainB: [number, number][] = [
      [38.8, -18.55],
      [41.5, -19.47],
      [48.12, -22.36],
      [54.38, -25.77],
      [60.31, -29.7],
      [65.88, -34.13],
      [71.05, -39.03],
    ];

    // Chain C: Bridge #1 approach -> Central Garden outer loop (stops cleanly before T-junction)
    const chainC: [number, number][] = [
      [50.0, 27.5],
      [44.92, 23.12],
      [43.48, 21.47],
      [41.4, 19.09],
      [29.2, 0.62],
      [31.64, -2.37],
      [33.45, -5.78],
      [34.59, -9.47],
      [34.99, -13.31],
    ];

    const buildChain = (pts: [number, number][], normalSign: 1 | -1, skipNearWalkway = false) => {
      const offsetPts: [number, number][] = [];
      for (let i = 0; i < pts.length; i++) {
        const pPrev = pts[Math.max(0, i - 1)];
        const pNext = pts[Math.min(pts.length - 1, i + 1)];
        const dx = pNext[0] - pPrev[0];
        const dz = pNext[1] - pPrev[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = (-dz / len) * normalSign;
        const nz = (dx / len) * normalSign;
        offsetPts.push([pts[i][0] + nx * offset, pts[i][1] + nz * offset]);
      }

      for (let i = 0; i < offsetPts.length - 1; i++) {
        const [x1, z1] = offsetPts[i];
        const [x2, z2] = offsetPts[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 0.2) continue;

        // Subdivide long segments (~4m) and leave opening for Cafeteria Pavilion B walkway at [-12.4, -71.3]
        const steps = Math.max(1, Math.ceil(segLen / 4.0));
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps;
          const t2 = (s + 1) / steps;
          const sx1 = x1 + dx * t1;
          const sz1 = z1 + dz * t1;
          const sx2 = x1 + dx * t2;
          const sz2 = z1 + dz * t2;
          const mx = (sx1 + sx2) / 2;
          const mz = (sz1 + sz2) / 2;
          if (skipNearWalkway && Math.hypot(mx - -12.4, mz - -71.3) < 2.4) continue;
          out.push({
            midX: mx,
            midZ: mz,
            length: Math.hypot(sx2 - sx1, sz2 - sz1) + 0.18,
            angle: Math.atan2(-(sz2 - sz1), sx2 - sx1),
          });
        }
      }
    };

    buildChain(chainA, 1, true);
    buildChain(chainB, -1, false);
    buildChain(chainC, 1, false);
    buildChain(chainB, 1, false);
    return out;
  }, []);

  return (
    <group>
      {segments.map((seg, idx) => (
        <group key={`road_bush_${idx}`} position={[seg.midX, 0.26, seg.midZ]} rotation={[0, seg.angle, 0]}>
          {/* Main Trimmed Boxwood Hedge Wall */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[seg.length, 0.46, 0.5]} />
            <meshStandardMaterial color="#15803d" roughness={0.92} />
          </mesh>
          {/* Fresh-Cut Upper Hedge Crown */}
          <mesh position={[0, 0.23, 0]} castShadow>
            <boxGeometry args={[seg.length, 0.08, 0.4]} />
            <meshStandardMaterial color="#16a34a" roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Appends an oriented 3D box (center, length along (ux, uz), thickness along (nx, nz), y0..y1)
 * into a flat triangle position array.
 */
function pushOrientedBox(
  out: number[],
  cx: number,
  cz: number,
  ux: number,
  uz: number,
  nx: number,
  nz: number,
  halfLen: number,
  halfThick: number,
  y0: number,
  y1: number
) {
  const flx = cx + ux * halfLen + nx * halfThick;
  const flz = cz + uz * halfLen + nz * halfThick;
  const frx = cx + ux * halfLen - nx * halfThick;
  const frz = cz + uz * halfLen - nz * halfThick;
  const blx = cx - ux * halfLen + nx * halfThick;
  const blz = cz - uz * halfLen + nz * halfThick;
  const brx = cx - ux * halfLen - nx * halfThick;
  const brz = cz - uz * halfLen - nz * halfThick;

  // Left, Right, Top, Front, Back faces
  out.push(
    blx, y0, blz, blx, y1, blz, flx, y0, flz,
    flx, y0, flz, blx, y1, blz, flx, y1, flz,
    frx, y0, frz, frx, y1, frz, brx, y0, brz,
    brx, y0, brz, frx, y1, frz, brx, y1, brz,
    blx, y1, blz, brx, y1, brz, flx, y1, flz,
    flx, y1, flz, brx, y1, brz, frx, y1, frz,
    flx, y0, flz, flx, y1, flz, frx, y0, frz,
    frx, y0, frz, flx, y1, flz, frx, y1, frz,
    brx, y0, brz, brx, y1, brz, blx, y0, blz,
    blx, y0, blz, brx, y1, brz, blx, y1, blz
  );
}

/**
 * Builds merged BufferGeometry fences on both sides of the main campus road
 * running from the Main Gate past the hostels & Admin/Library up to the Sports Ground.
 */
function MainRoadSideFences({ roads }: { roads: RoadSegment[] }) {
  const { plinthGeo, fenceGeo } = useMemo(() => {
    const mainRoad = roads.find((r) => String(r.id) === '1469221627');
    if (!mainRoad || mainRoad.points.length < 22) {
      return { plinthGeo: null, fenceGeo: null };
    }

    // Slice from Main Gate entry (index 4) to Sports Ground / North Gate approach (index 21)
    const pts = mainRoad.points.slice(4, 22);
    const offset = 2.75; // Just outside the 5.1m-wide road curb
    const mainGateCenter: [number, number] = [149.69, -110.07];
    const riverBridgeJunctions: [number, number][] = [
      [103.5, -64.55], // Bridge #2
      [67.36, 36.87],  // Bridge #1
    ];

    const plinthPositions: number[] = [];
    const fencePositions: number[] = [];

    for (const normalSign of [1, -1] as const) {
      const offsetPts: [number, number][] = pts.map((p, i) => {
        const pPrev = pts[Math.max(0, i - 1)];
        const pNext = pts[Math.min(pts.length - 1, i + 1)];
        const dx = pNext[0] - pPrev[0];
        const dz = pNext[1] - pPrev[1];
        const len = Math.hypot(dx, dz) || 1;
        return [
          p[0] + (-dz / len) * normalSign * offset,
          p[1] + (dx / len) * normalSign * offset,
        ];
      });

      for (let i = 0; i < offsetPts.length - 1; i++) {
        const [x1, z1] = offsetPts[i];
        const [x2, z2] = offsetPts[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const totalLen = Math.hypot(dx, dz);
        if (totalLen < 0.2) continue;

        const steps = Math.max(1, Math.ceil(totalLen / 3.2));
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps;
          const t2 = (s + 1) / steps;
          const sx1 = x1 + dx * t1;
          const sz1 = z1 + dz * t1;
          const sx2 = x1 + dx * t2;
          const sz2 = z1 + dz * t2;
          const mx = (sx1 + sx2) / 2;
          const mz = (sz1 + sz2) / 2;

          // Keep Main Gate entrance open
          if (Math.hypot(mx - mainGateCenter[0], mz - mainGateCenter[1]) < 6.5) continue;

          // Keep Bridge #1 & Bridge #2 turn-offs open on the river side (normalSign === 1)
          if (
            normalSign === 1 &&
            riverBridgeJunctions.some(([bx, bz]) => Math.hypot(mx - bx, mz - bz) < 4.8)
          ) {
            continue;
          }

          const sdx = sx2 - sx1;
          const sdz = sz2 - sz1;
          const segLen = Math.hypot(sdx, sdz);
          if (segLen < 0.15) continue;
          const ux = sdx / segLen;
          const uz = sdz / segLen;
          const nx = -uz;
          const nz = ux;

          // 1. Concrete plinth base
          pushOrientedBox(plinthPositions, mx, mz, ux, uz, nx, nz, segLen / 2 + 0.04, 0.11, 0, 0.24);

          // 2. Top & mid horizontal steel rails
          pushOrientedBox(fencePositions, mx, mz, ux, uz, nx, nz, segLen / 2 + 0.03, 0.035, 1.06, 1.13);
          pushOrientedBox(fencePositions, mx, mz, ux, uz, nx, nz, segLen / 2 + 0.03, 0.03, 0.60, 0.66);

          // 3. End post + intermediate pickets
          pushOrientedBox(fencePositions, sx1, sz1, ux, uz, nx, nz, 0.055, 0.055, 0.24, 1.20);
          const picketCount = Math.max(2, Math.floor(segLen / 0.65));
          for (let k = 1; k < picketCount; k++) {
            const pt = k / picketCount;
            pushOrientedBox(
              fencePositions,
              sx1 + sdx * pt,
              sz1 + sdz * pt,
              ux,
              uz,
              nx,
              nz,
              0.02,
              0.02,
              0.24,
              1.12
            );
          }
        }
      }
    }

    if (plinthPositions.length === 0) return { plinthGeo: null, fenceGeo: null };

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(plinthPositions, 3));
    pGeo.computeVertexNormals();

    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fencePositions, 3));
    fGeo.computeVertexNormals();

    return { plinthGeo: pGeo, fenceGeo: fGeo };
  }, [roads]);

  return (
    <group>
      {plinthGeo && (
        <mesh geometry={plinthGeo} receiveShadow castShadow>
          <meshStandardMaterial color="#94a3b8" roughness={0.78} />
        </mesh>
      )}
      {fenceGeo && (
        <mesh geometry={fenceGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.55} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Constructs a 2D ribbon along a series of waypoints
 */
function buildRibbonGeometry(segments: RoadSegment[], width: number): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const halfWidth = width / 2;

  for (const seg of segments) {
    const pts = seg.points;
    if (pts.length < 2) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;

      // Normal vector perpendicular to path in 2D (x, z)
      const nx = -dz / len;
      const nz = dx / len;

      const v1L = [p1[0] + nx * halfWidth, 0, p1[1] + nz * halfWidth];
      const v1R = [p1[0] - nx * halfWidth, 0, p1[1] - nz * halfWidth];
      const v2L = [p2[0] + nx * halfWidth, 0, p2[1] + nz * halfWidth];
      const v2R = [p2[0] - nx * halfWidth, 0, p2[1] - nz * halfWidth];

      // Triangle 1: v1L, v2L, v1R
      positions.push(...v1L, ...v2L, ...v1R);
      // Triangle 2: v1R, v2L, v2R
      positions.push(...v1R, ...v2L, ...v2R);
    }
  }

  if (positions.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
