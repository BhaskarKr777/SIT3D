'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoadSegment } from '@/types/campus';

interface NeighborhoodBuildingsProps {
  boundary: [number, number][];
  roads: RoadSegment[];
  isNight: boolean;
  windowGlowIntensity: number;
}

interface ExtBuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  levels: number;
  rotY: number;
  wallColor: string;
  roofColor: string;
}

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
 * Renders realistic Salbari neighborhood buildings (student hostels, residences,
 * and roadside commercial/academic annexes) along the external road network on the
 * south-east / east side of the SIT campus, with full night window illumination.
 */
export function NeighborhoodBuildings({
  boundary,
  roads,
  isNight,
  windowGlowIntensity,
}: NeighborhoodBuildingsProps) {
  const buildings = useMemo(() => {
    const candidates: ExtBuildingSpec[] = [
      // South-East Service & Highway Cluster (near Main Gate)
      { id: 'ext-1', x: 171, z: -90, w: 12, d: 9, levels: 3, rotY: 0.45, wallColor: '#f5ede0', roofColor: '#c2410c' },
      { id: 'ext-2', x: 194, z: -96, w: 13, d: 9, levels: 2, rotY: 0.3, wallColor: '#e2e8f0', roofColor: '#475569' },
      { id: 'ext-3', x: 215, z: -99, w: 10, d: 9, levels: 3, rotY: 0.32, wallColor: '#fef3c7', roofColor: '#b45309' },
      { id: 'ext-4', x: 234, z: -103, w: 12, d: 9, levels: 2, rotY: 0.25, wallColor: '#f1f5f9', roofColor: '#0284c7' },
      { id: 'ext-5', x: 192, z: -129, w: 15, d: 10, levels: 3, rotY: 0.2, wallColor: '#f5ede0', roofColor: '#c2410c' },
      { id: 'ext-6', x: 220, z: -125, w: 13, d: 9, levels: 2, rotY: 0.35, wallColor: '#e2e8f0', roofColor: '#334155' },

      // Mid-East Salbari Residential Strip
      { id: 'ext-7', x: 168, z: -32, w: 13, d: 9, levels: 3, rotY: -0.25, wallColor: '#fef3c7', roofColor: '#c2410c' },
      { id: 'ext-8', x: 174, z: -5, w: 12, d: 10, levels: 2, rotY: -0.22, wallColor: '#f5ede0', roofColor: '#0369a1' },
      { id: 'ext-9', x: 181, z: 20, w: 14, d: 9, levels: 4, rotY: -0.2, wallColor: '#f1f5f9', roofColor: '#334155' },
      { id: 'ext-10', x: 218, z: -22, w: 14, d: 10, levels: 3, rotY: 0.65, wallColor: '#f5ede0', roofColor: '#b45309' },
      { id: 'ext-11', x: 224, z: 10, w: 13, d: 9, levels: 2, rotY: 0.72, wallColor: '#e2e8f0', roofColor: '#c2410c' },
      { id: 'ext-12', x: 211, z: 58, w: 15, d: 10, levels: 3, rotY: 0.1, wallColor: '#fef3c7', roofColor: '#475569' },

      // North-East Residential Grid
      { id: 'ext-13', x: 168, z: 66, w: 14, d: 9, levels: 3, rotY: 0.12, wallColor: '#f5ede0', roofColor: '#0284c7' },
      { id: 'ext-14', x: 162, z: 98, w: 12, d: 9, levels: 2, rotY: 0.08, wallColor: '#f1f5f9', roofColor: '#c2410c' },
      { id: 'ext-15', x: 182, z: 98, w: 11, d: 9, levels: 3, rotY: 0.05, wallColor: '#fef3c7', roofColor: '#334155' },
      { id: 'ext-16', x: 164, z: 146, w: 14, d: 10, levels: 3, rotY: 0.04, wallColor: '#f5ede0', roofColor: '#b45309' },
      { id: 'ext-17', x: 185, z: 162, w: 13, d: 9, levels: 2, rotY: -0.05, wallColor: '#e2e8f0', roofColor: '#0369a1' },
      { id: 'ext-18', x: 176, z: 190, w: 15, d: 10, levels: 3, rotY: 0.02, wallColor: '#f1f5f9', roofColor: '#c2410c' },
    ];

    // Filter out any candidate that overlaps campus interior or any road
    return candidates.filter((b) => {
      if (boundary.length >= 3 && pointInPoly(b.x, b.z, boundary)) return false;
      const minClear = Math.max(b.w, b.d) * 0.45 + 2.8;
      for (const r of roads) {
        for (let i = 0; i < r.points.length - 1; i++) {
          if (distToSeg(b.x, b.z, r.points[i], r.points[i + 1]) < minClear) return false;
        }
      }
      return true;
    });
  }, [boundary, roads]);

  return (
    <group>
      {buildings.map((b, bIdx) => (
        <NeighborhoodBuildingItem
          key={b.id}
          spec={b}
          bIdx={bIdx}
          isNight={isNight}
          windowGlowIntensity={windowGlowIntensity}
        />
      ))}
    </group>
  );
}

function NeighborhoodBuildingItem({
  spec,
  bIdx,
  isNight,
  windowGlowIntensity,
}: {
  spec: ExtBuildingSpec;
  bIdx: number;
  isNight: boolean;
  windowGlowIntensity: number;
}) {
  const floorH = 3.4;
  const totalH = spec.levels * floorH;
  const hw = spec.w / 2;
  const hd = spec.d / 2;

  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotY, 0]}>
      {/* Ground Foundation Plinth */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[spec.w + 0.5, 0.36, spec.d + 0.5]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Main Building Volume */}
      <mesh position={[0, totalH / 2 + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.w, totalH, spec.d]} />
        <meshStandardMaterial color={spec.wallColor} roughness={0.75} />
      </mesh>

      {/* Rooftop Slab & Parapet */}
      <mesh position={[0, totalH + 0.4, 0]} castShadow>
        <boxGeometry args={[spec.w + 0.4, 0.32, spec.d + 0.4]} />
        <meshStandardMaterial color={spec.roofColor} roughness={0.5} />
      </mesh>

      {/* Rooftop Water Tank */}
      <mesh position={[hw * 0.45, totalH + 1.0, hd * 0.35]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 1.0, 10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      {/* Windows on Front (+Z) and Back (-Z) Facades */}
      {Array.from({ length: spec.levels }).map((_, fIdx) => {
        const fy = fIdx * floorH + floorH * 0.55 + 0.25;
        const cols = Math.max(2, Math.floor((spec.w - 1.5) / 2.8));
        const startX = -((cols - 1) * 2.6) / 2;

        return Array.from({ length: cols }).map((__, cIdx) => {
          const wx = startX + cIdx * 2.6;
          const isLitFront = isNight && ((bIdx + fIdx * 3 + cIdx * 7) % 5 >= 2);
          const isLitBack = isNight && ((bIdx + fIdx * 5 + cIdx * 3) % 5 >= 2);
          const winColor = (bIdx + cIdx) % 3 === 0 ? '#fef9c3' : '#fde047';

          return (
            <React.Fragment key={`w_${fIdx}_${cIdx}`}>
              {/* Front Window */}
              <mesh position={[wx, fy, hd + 0.03]}>
                <planeGeometry args={[1.35, 1.45]} />
                <meshStandardMaterial
                  color={isLitFront ? winColor : '#0f172a'}
                  roughness={0.15}
                  metalness={isLitFront ? 0.1 : 0.75}
                  emissive={winColor}
                  emissiveIntensity={isLitFront ? 1.45 * windowGlowIntensity : 0}
                />
              </mesh>
              {/* Back Window */}
              <mesh position={[wx, fy, -hd - 0.03]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[1.35, 1.45]} />
                <meshStandardMaterial
                  color={isLitBack ? winColor : '#0f172a'}
                  roughness={0.15}
                  metalness={isLitBack ? 0.1 : 0.75}
                  emissive={winColor}
                  emissiveIntensity={isLitBack ? 1.45 * windowGlowIntensity : 0}
                />
              </mesh>
            </React.Fragment>
          );
        });
      })}

      {/* Side Windows (+X and -X) */}
      {Array.from({ length: spec.levels }).map((_, fIdx) => {
        const fy = fIdx * floorH + floorH * 0.55 + 0.25;
        const isLitSide = isNight && ((bIdx + fIdx) % 2 === 0);
        return (
          <React.Fragment key={`sw_${fIdx}`}>
            <mesh position={[hw + 0.03, fy, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[1.6, 1.45]} />
              <meshStandardMaterial
                color={isLitSide ? '#fde047' : '#0f172a'}
                roughness={0.15}
                metalness={isLitSide ? 0.1 : 0.75}
                emissive="#fde047"
                emissiveIntensity={isLitSide ? 1.35 * windowGlowIntensity : 0}
              />
            </mesh>
            <mesh position={[-hw - 0.03, fy, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.6, 1.45]} />
              <meshStandardMaterial
                color={isLitSide ? '#fef9c3' : '#0f172a'}
                roughness={0.15}
                metalness={isLitSide ? 0.1 : 0.75}
                emissive="#fef9c3"
                emissiveIntensity={isLitSide ? 1.35 * windowGlowIntensity : 0}
              />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
}
