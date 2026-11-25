'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Building } from '@/types/campus';

interface BuildingFacadeDetailsProps {
  building: Building;
  isNight: boolean;
  windowGlowIntensity: number;
  isGhosted?: boolean;
}

/** Deterministic pseudo-random helper in [0, 1) */
function hash01(seedStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

interface WallSegmentInfo {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
  nx: number;
  nz: number;
}

/**
 * Appends a transformed box (center x,y,z, size w,h,d, rotated around Y by `rotY` inside a wall frame)
 * into a flat position/normal array pair for single-draw-call merged BufferGeometry.
 */
function pushBox(
  positions: number[],
  normals: number[],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  wallX: number,
  wallY: number,
  wallZ: number,
  wallAngle: number
) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const cos = Math.cos(wallAngle);
  const sin = Math.sin(wallAngle);

  const tx = (lx: number, ly: number, lz: number): [number, number, number] => {
    const rx = (cx + lx) * cos + (cz + lz) * sin;
    const rz = -(cx + lx) * sin + (cz + lz) * cos;
    return [wallX + rx, wallY + cy + ly, wallZ + rz];
  };

  const tn = (nx: number, ny: number, nz: number): [number, number, number] => {
    return [nx * cos + nz * sin, ny, -nx * sin + nz * cos];
  };

  const faces: { corners: [number, number, number][]; n: [number, number, number] }[] = [
    { n: [0, 0, 1], corners: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]] },   // +Z
    { n: [0, 0, -1], corners: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]] }, // -Z
    { n: [1, 0, 0], corners: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]] },   // +X
    { n: [-1, 0, 0], corners: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]] }, // -X
    { n: [0, 1, 0], corners: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]] },   // +Y
    { n: [0, -1, 0], corners: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]] }, // -Y
  ];

  for (const f of faces) {
    const wn = tn(f.n[0], f.n[1], f.n[2]);
    const p0 = tx(...f.corners[0]);
    const p1 = tx(...f.corners[1]);
    const p2 = tx(...f.corners[2]);
    const p3 = tx(...f.corners[3]);
    positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    for (let k = 0; k < 6; k++) normals.push(...wn);
  }
}

function buildBufferGeo(positions: number[], normals: number[]): THREE.BufferGeometry | null {
  if (positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

/**
 * High-performance batched architectural facade details for every campus building:
 * - Merged BufferGeometry for frames, mullions, pilasters, parapets & balconies
 * - Merged BufferGeometry for dark glass, warm-yellow lit windows, and soft-white lit windows
 * - Exterior wall sconces, balcony strip lights & rooftop accent beacons
 * - Zero PointLights per window (uses emissive materials for smooth 60 FPS Night Mode)
 */
export function BuildingFacadeDetails({
  building,
  isNight,
  windowGlowIntensity,
  isGhosted = false,
}: BuildingFacadeDetailsProps) {
  const [cx, cz] = building.center;

  const {
    framesGeo,
    trimGeo,
    darkGlassGeo,
    warmYellowGeo,
    softWhiteGeo,
    sconcesGeo,
    roofCenter,
    levels,
    isHostelOrAcademic,
  } = useMemo(() => {
    const pts = building.polygon;
    if (!pts || pts.length < 3) {
      return {
        framesGeo: null,
        trimGeo: null,
        darkGlassGeo: null,
        warmYellowGeo: null,
        softWhiteGeo: null,
        sconcesGeo: null,
        roofCenter: [0, 0] as [number, number],
        levels: 1,
        isHostelOrAcademic: false,
      };
    }

    let signedArea = 0;
    const count = pts.length - 1;
    let sumX = 0;
    let sumZ = 0;
    for (let i = 0; i < count; i++) {
      const [x1, z1] = [pts[i][0] - cx, pts[i][1] - cz];
      const [x2, z2] = [pts[(i + 1) % count][0] - cx, pts[(i + 1) % count][1] - cz];
      signedArea += x1 * z2 - x2 * z1;
      sumX += x1;
      sumZ += z1;
    }
    const windingSign = signedArea >= 0 ? 1 : -1;

    const walls: WallSegmentInfo[] = [];
    let maxLen = 0;
    let longestIdx = -1;

    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i][0] - cx;
      const z1 = pts[i][1] - cz;
      const x2 = pts[i + 1][0] - cx;
      const z2 = pts[i + 1][1] - cz;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 2.2) continue;

      let nx = (dz / len) * windingSign;
      let nz = (-dx / len) * windingSign;
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      if (midX * nx + midZ * nz < 0) {
        nx = -nx;
        nz = -nz;
      }

      const angle = Math.atan2(nx, nz);
      if (len > maxLen) {
        maxLen = len;
        longestIdx = walls.length;
      }
      walls.push({ midX, midZ, length: len, angle, nx, nz });
    }

    const lvls = Math.max(1, building.levels || 1);
    const floorHeight = building.height / lvls;
    const hostelOrAcad = building.category === 'hostel' || building.category === 'academic';
    const canteenOrUtil = building.category === 'canteen' || building.category === 'utility';

    const framePos: number[] = [], frameNorm: number[] = [];
    const trimPos: number[] = [], trimNorm: number[] = [];
    const darkPos: number[] = [], darkNorm: number[] = [];
    const yellowPos: number[] = [], yellowNorm: number[] = [];
    const whitePos: number[] = [], whiteNorm: number[] = [];
    const sconcePos: number[] = [], sconceNorm: number[] = [];

    walls.forEach((wall, wIdx) => {
      const wx = wall.midX + wall.nx * 0.22;
      const wy = 0.02;
      const wz = wall.midZ + wall.nz * 0.22;

      // Corner pilasters + rooftop parapet coping
      pushBox(trimPos, trimNorm, -wall.length / 2 + 0.15, building.height / 2, 0.05, 0.32, building.height, 0.16, wx, wy, wz, wall.angle);
      pushBox(trimPos, trimNorm, wall.length / 2 - 0.15, building.height / 2, 0.05, 0.32, building.height, 0.16, wx, wy, wz, wall.angle);
      pushBox(trimPos, trimNorm, 0, building.height + 0.35, 0, wall.length + 0.2, 0.45, 0.28, wx, wy, wz, wall.angle);

      // Ground-floor awning on canteens/admin
      if ((canteenOrUtil || building.category === 'administrative') && wIdx === longestIdx) {
        pushBox(framePos, frameNorm, 0, Math.min(3.1, floorHeight * 0.88), 0.55, Math.min(wall.length * 0.75, 16), 0.12, 1.1, wx, wy, wz, wall.angle);
      }

      const bayWidth = canteenOrUtil ? 3.2 : 2.7;
      const numBays = Math.max(1, Math.floor((wall.length - 1.4) / bayWidth));
      const startX = -((numBays - 1) * bayWidth) / 2;
      const hasBalcony = hostelOrAcad && lvls >= 2 && (wIdx === longestIdx || wall.length > 14);

      for (let fIdx = 0; fIdx < lvls; fIdx++) {
        const fy = fIdx * floorHeight + floorHeight * 0.52;
        const winW = canteenOrUtil ? 1.75 : 1.45;
        const winH = Math.min(floorHeight * 0.54, 1.65);

        // Balconies & railings
        if (hasBalcony && fIdx >= 1) {
          const by = fIdx * floorHeight + 0.08;
          pushBox(trimPos, trimNorm, 0, by, 0.48, wall.length - 1.2, 0.14, 0.95, wx, wy, wz, wall.angle);
          pushBox(framePos, frameNorm, 0, by + 0.65, 0.9, wall.length - 1.25, 0.06, 0.06, wx, wy, wz, wall.angle);
          const numPosts = Math.max(2, Math.floor((wall.length - 1.4) / 2.2));
          for (let pIdx = 0; pIdx < numPosts; pIdx++) {
            const px = -((wall.length - 1.6) / 2) + (pIdx / Math.max(1, numPosts - 1)) * (wall.length - 1.6);
            pushBox(framePos, frameNorm, px, by + 0.34, 0.9, 0.05, 0.62, 0.05, wx, wy, wz, wall.angle);
          }
          // Subtle warm under-balcony strip light
          pushBox(sconcePos, sconceNorm, 0, by - 0.09, 0.65, wall.length * 0.65, 0.04, 0.06, wx, wy, wz, wall.angle);
        }

        for (let bIdx = 0; bIdx < numBays; bIdx++) {
          const bx = startX + bIdx * bayWidth;
          // Frame + center mullion
          pushBox(framePos, frameNorm, bx, fy, 0.02, winW + 0.14, winH + 0.14, 0.08, wx, wy, wz, wall.angle);
          pushBox(framePos, frameNorm, bx, fy, 0.055, 0.045, winH, 0.03, wx, wy, wz, wall.angle);

          // Deterministic window lighting: ~40% warm yellow, ~25% soft neutral white, ~35% naturally dark
          const hVal = hash01(`${building.id}-${wIdx}-${fIdx}-${bIdx}`);
          if (hVal > 0.62) {
            pushBox(yellowPos, yellowNorm, bx, fy, 0.05, winW, winH, 0.02, wx, wy, wz, wall.angle);
          } else if (hVal > 0.36) {
            pushBox(whitePos, whiteNorm, bx, fy, 0.05, winW, winH, 0.02, wx, wy, wz, wall.angle);
          } else {
            pushBox(darkPos, darkNorm, bx, fy, 0.05, winW, winH, 0.02, wx, wy, wz, wall.angle);
          }
        }
      }

      // Exterior ground-floor wall sconces
      if (wall.length > 6) {
        const sy = Math.min(2.6, floorHeight * 0.78);
        pushBox(sconcePos, sconceNorm, -wall.length * 0.28, sy, 0.1, 0.18, 0.26, 0.12, wx, wy, wz, wall.angle);
        pushBox(sconcePos, sconceNorm, wall.length * 0.28, sy, 0.1, 0.18, 0.26, 0.12, wx, wy, wz, wall.angle);
      }
    });

    return {
      framesGeo: buildBufferGeo(framePos, frameNorm),
      trimGeo: buildBufferGeo(trimPos, trimNorm),
      darkGlassGeo: buildBufferGeo(darkPos, darkNorm),
      warmYellowGeo: buildBufferGeo(yellowPos, yellowNorm),
      softWhiteGeo: buildBufferGeo(whitePos, whiteNorm),
      sconcesGeo: buildBufferGeo(sconcePos, sconceNorm),
      roofCenter: [sumX / Math.max(1, count), sumZ / Math.max(1, count)] as [number, number],
      levels: lvls,
      isHostelOrAcademic: hostelOrAcad,
    };
  }, [building.id, building.polygon, building.height, building.levels, building.category, cx, cz]);

  const opacity = isGhosted ? 0.3 : 1.0;

  return (
    <group>
      {/* 1. Batched Window Frames, Mullions & Railings */}
      {framesGeo && (
        <mesh geometry={framesGeo}>
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} transparent={isGhosted} opacity={opacity} />
        </mesh>
      )}

      {/* 2. Batched Corner Pilasters, Parapets & Balcony Slabs */}
      {trimGeo && (
        <mesh geometry={trimGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.65} transparent={isGhosted} opacity={opacity} />
        </mesh>
      )}

      {/* 3. Unlit Reflective Dark Glass Windows */}
      {darkGlassGeo && (
        <mesh geometry={darkGlassGeo}>
          <meshStandardMaterial color="#0f172a" roughness={0.12} metalness={0.75} transparent={isGhosted} opacity={opacity} />
        </mesh>
      )}

      {/* 4. Warm Yellow Illuminated Windows at Night */}
      {warmYellowGeo && (
        <mesh geometry={warmYellowGeo}>
          <meshStandardMaterial
            color={isNight ? '#fde047' : '#0f172a'}
            roughness={0.12}
            metalness={isNight ? 0.1 : 0.75}
            emissive="#fde047"
            emissiveIntensity={isNight ? 1.5 * windowGlowIntensity : 0}
            transparent={isGhosted}
            opacity={opacity}
          />
        </mesh>
      )}

      {/* 5. Soft Neutral White Illuminated Windows at Night */}
      {softWhiteGeo && (
        <mesh geometry={softWhiteGeo}>
          <meshStandardMaterial
            color={isNight ? '#fef9c3' : '#0f172a'}
            roughness={0.12}
            metalness={isNight ? 0.1 : 0.75}
            emissive="#fef9c3"
            emissiveIntensity={isNight ? 1.35 * windowGlowIntensity : 0}
            transparent={isGhosted}
            opacity={opacity}
          />
        </mesh>
      )}

      {/* 6. Exterior Wall Sconces & Balcony Accent Strips */}
      {sconcesGeo && (
        <mesh geometry={sconcesGeo}>
          <meshStandardMaterial
            color={isNight ? '#fef08a' : '#334155'}
            emissive="#fde047"
            emissiveIntensity={isNight ? 2.6 : 0}
            transparent={isGhosted}
            opacity={opacity}
          />
        </mesh>
      )}

      {/* 7. Rooftop Mechanicals, Staircase Headhouse & Night Rooftop Beacon */}
      <group position={[roofCenter[0], building.height + 0.42, roofCenter[1]]}>
        {levels >= 2 && (
          <group position={[0, 0.75, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.4, 1.5, 2.8]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[3.7, 0.16, 3.1]} />
              <meshStandardMaterial color="#475569" roughness={0.6} />
            </mesh>
            {/* Subtle Rooftop Accent Strip at Night */}
            <mesh position={[0, 0.65, 1.42]}>
              <boxGeometry args={[2.6, 0.08, 0.06]} />
              <meshStandardMaterial
                color={isNight ? '#fef08a' : '#475569'}
                emissive="#fde047"
                emissiveIntensity={isNight ? 2.2 : 0}
              />
            </mesh>
          </group>
        )}

        <mesh position={[2.6, 0.35, -1.2]} castShadow>
          <boxGeometry args={[1.4, 0.7, 1.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>

        {isHostelOrAcademic && (
          <group position={[-2.6, 0.65, 1.2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.65, 0.65, 1.3, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.68, 0]}>
              <cylinderGeometry args={[0.68, 0.68, 0.08, 12]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}
