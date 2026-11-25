'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoadSegment } from '@/types/campus';

interface TeaGardenSurroundProps {
  boundary: [number, number][];
  roads: RoadSegment[];
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
 * Renders the lush Chamtaguri Tea Garden surrounding the rear, west, and right-hand
 * exterior of the SIT campus using InstancedMesh (3 total draw calls for 60 FPS):
 * - Contoured, closely-packed rows of pruned tea bushes
 * - Scattered tall shade trees growing between the tea garden rows
 */
export function TeaGardenSurround({ boundary, roads }: TeaGardenSurroundProps) {
  const bushMeshRef = useRef<THREE.InstancedMesh>(null);
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const canopyMeshRef = useRef<THREE.InstancedMesh>(null);

  const { bushGeo, trunkGeo, canopyGeo } = useMemo(() => {
    // Slightly rounded flat-topped pruned tea bush
    const bGeo = new THREE.BoxGeometry(2.6, 0.95, 1.35);
    const tGeo = new THREE.CylinderGeometry(0.16, 0.3, 4.4, 7);
    const cGeo = new THREE.IcosahedronGeometry(2.6, 1);
    cGeo.scale(1.35, 0.52, 1.35); // Classic wide, flat-topped tea-estate shade tree crown
    return { bushGeo: bGeo, trunkGeo: tGeo, canopyGeo: cGeo };
  }, []);

  const { bushes, shadeTrees } = useMemo(() => {
    if (!boundary || boundary.length < 3) {
      return {
        bushes: [] as { pos: [number, number, number]; rotY: number; scale: [number, number, number]; color: string }[],
        shadeTrees: [] as { pos: [number, number, number]; scale: number; rotY: number }[],
      };
    }

    // River polyline to keep tea bushes clear of water channel
    const riverPts: [number, number][] = [
      [-32, 175], [6, 152], [34, 112], [46, 74], [57.6, 32.6],
      [67, 0], [75, -26], [81.84, -52.49], [88, -82], [93, -112], [99, -148],
    ];

    const isValidTeaSpot = (x: number, z: number): boolean => {
      // Must be strictly OUTSIDE the campus interior boundary
      if (pointInPoly(x, z, boundary)) return false;

      // Stay >= 3.2m outside the boundary fence
      for (let i = 0; i < boundary.length; i++) {
        const p1 = boundary[i];
        const p2 = boundary[(i + 1) % boundary.length];
        if (distToSeg(x, z, p1, p2) < 3.2) return false;
      }

      // Exclude Sports Ground & lower-left external residential road sector (x > 70 && z > -20)
      if (x >= 8 && x <= 106 && z >= 116 && z <= 246) return false;
      if (x > 55 && z > -25 && z < 130) return false;

      // Keep clear of river channel (8.5m)
      for (let i = 0; i < riverPts.length - 1; i++) {
        if (distToSeg(x, z, riverPts[i], riverPts[i + 1]) < 8.5) return false;
      }

      // Keep clear of Main Gate entrance approach ([155, -111])
      if (Math.hypot(x - 155, z + 111) < 14) return false;

      // Keep clear of external roads (5.5m)
      for (const r of roads) {
        for (let i = 0; i < r.points.length - 1; i++) {
          if (distToSeg(x, z, r.points[i], r.points[i + 1]) < 5.5) return false;
        }
      }

      return true;
    };

    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const bushList: { pos: [number, number, number]; rotY: number; scale: [number, number, number]; color: string }[] = [];
    const treeList: { pos: [number, number, number]; scale: number; rotY: number }[] = [];

    // Crescent tea garden bounds matching the highlighted area:
    // Rear/West (x in [-195, 55], z in [-160, 175]) & North-East/Right (x in [-195, 115], z in [-210, -100])
    const rowAngle = -0.32; // Gentle contour angle following campus foothill terrain
    const cos = Math.cos(rowAngle);
    const sin = Math.sin(rowAngle);

    const rowStepZ = 3.2;  // Plucking aisle spacing between tea rows
    const bushStepX = 2.7; // Continuous pruned tea hedge row

    const teaShades = ['#15803d', '#16a34a', '#166534', '#22c55e'];

    for (let u = -210; u <= 190; u += bushStepX) {
      for (let v = -215; v <= 165; v += rowStepZ) {
        const wx = u * cos - v * sin;
        const wz = u * sin + v * cos;

        // Limit to the highlighted crescent around rear, west, and right side
        const distFromCenter = Math.hypot(wx + 25, wz + 20);
        if (distFromCenter > 210) continue;
        if (wx > 110 && wz > -95) continue;

        if (!isValidTeaSpot(wx, wz)) continue;

        // Occasional natural plucking break or shade tree gap
        const rVal = rand();
        if (rVal < 0.055) {
          // Place a tall shade tree between the tea garden rows!
          const tooCloseToTree = treeList.some((t) => Math.hypot(t.pos[0] - wx, t.pos[2] - wz) < 16);
          if (!tooCloseToTree) {
            treeList.push({
              pos: [wx, -0.05, wz],
              scale: 0.95 + rand() * 0.45,
              rotY: rand() * Math.PI * 2,
            });
          }
          continue;
        }

        bushList.push({
          pos: [wx + (rand() - 0.5) * 0.25, 0.36, wz + (rand() - 0.5) * 0.2],
          rotY: -rowAngle + (rand() - 0.5) * 0.08,
          scale: [0.95 + rand() * 0.2, 0.85 + rand() * 0.25, 0.95 + rand() * 0.15],
          color: teaShades[Math.floor(rand() * teaShades.length)],
        });
      }
    }

    return { bushes: bushList, shadeTrees: treeList };
  }, [boundary, roads]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();

    if (bushMeshRef.current && bushes.length > 0) {
      bushes.forEach((b, i) => {
        dummy.position.set(b.pos[0], b.pos[1], b.pos[2]);
        dummy.rotation.set(0, b.rotY, 0);
        dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
        dummy.updateMatrix();
        bushMeshRef.current!.setMatrixAt(i, dummy.matrix);
        c.set(b.color);
        bushMeshRef.current!.setColorAt(i, c);
      });
      bushMeshRef.current.instanceMatrix.needsUpdate = true;
      if (bushMeshRef.current.instanceColor) bushMeshRef.current.instanceColor.needsUpdate = true;
    }

    if (trunkMeshRef.current && canopyMeshRef.current && shadeTrees.length > 0) {
      shadeTrees.forEach((t, i) => {
        dummy.position.set(t.pos[0], t.pos[1] + 2.2 * t.scale, t.pos[2]);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.set(t.scale, t.scale, t.scale);
        dummy.updateMatrix();
        trunkMeshRef.current!.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.pos[0], t.pos[1] + 4.7 * t.scale, t.pos[2]);
        dummy.updateMatrix();
        canopyMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      trunkMeshRef.current.instanceMatrix.needsUpdate = true;
      canopyMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [bushes, shadeTrees]);

  if (!bushes.length) return null;

  return (
    <group>
      {/* Instanced Pruned Tea Garden Bush Rows (1 draw call) */}
      <instancedMesh
        ref={bushMeshRef}
        args={[bushGeo, undefined, bushes.length]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial roughness={0.9} metalness={0.02} />
      </instancedMesh>

      {/* Instanced Tea-Estate Shade Tree Trunks (1 draw call) */}
      {shadeTrees.length > 0 && (
        <instancedMesh
          ref={trunkMeshRef}
          args={[trunkGeo, undefined, shadeTrees.length]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#5c3a21" roughness={0.92} />
        </instancedMesh>
      )}

      {/* Instanced Tea-Estate Shade Tree Canopies (1 draw call) */}
      {shadeTrees.length > 0 && (
        <instancedMesh
          ref={canopyMeshRef}
          args={[canopyGeo, undefined, shadeTrees.length]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#14532d" roughness={0.82} />
        </instancedMesh>
      )}
    </group>
  );
}
