'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoadSegment } from '@/types/campus';

interface CampusStreetlightsProps {
  roads: RoadSegment[];
  isNight: boolean;
}

interface PoleData {
  pos: [number, number, number];
  armDir: [number, number]; // direction arm points towards road
  isIntersection: boolean;
}

export function CampusStreetlights({ roads, isNight }: CampusStreetlightsProps) {
  // Compute streetlight pole locations along the complete campus road network
  const { poles, keyLights } = useMemo(() => {
    const rawPoles: PoleData[] = [];
    const keyJunctions: [number, number, number][] = [];

    // Main campus junctions, gates, and key road curves for real dynamic point illumination
    const fixedJunctions: [number, number, number][] = [
      [155.0, 6.2, -111.2], // Main Highway Gate on Hill Cart Road
      [34.3, 6.2, 119.5],   // North Secondary Campus Gate
      [18.0, 6.2, -16.0],   // Central Garden & Main Building Front Approach
      [-16.0, 6.2, -18.0],  // West Approach Loop
      [-42.0, 6.2, -8.0],   // Admin Annex Road Junction
      [48.0, 6.2, 5.0],     // Workshop / East Lab Road Junction
      [5.0, 6.2, 48.0],     // Rear Parking Entrance Driveway
      [-22.0, 6.2, 46.0],   // Rear Loop West Bend
      [26.0, 6.2, 45.0],    // Rear Loop East Bend
      [-55.0, 6.2, 45.0],   // Hostels Junction
      [-30.0, 6.2, 85.0],   // North Hostels Road
      [58.0, 6.2, 160.0],   // Sports Ground Approach
      [75.0, 6.2, 80.0],    // East Perimeter Road
      [42.0, 6.2, -75.0],   // South Highway Access Road
      [-65.0, 6.2, -40.0],  // Basketball Court Road
      [-80.0, 6.2, 15.0],   // West Campus Boundary Road
      [0.0, 6.2, -32.0],    // Front Plaza Entry Loop
      [110.0, 6.2, -120.0], // Highway Approach Curve
      [-35.0, 6.2, 28.0],   // Main Complex Rear West Corner
      [35.0, 6.2, 28.0],    // Main Complex Rear East Corner
      [0.0, 6.2, 52.0],     // Rear Parking Center Road
    ];

    fixedJunctions.forEach((j) => keyJunctions.push(j));

    roads.forEach((rd, rIdx) => {
      const pts = rd.points;
      if (!pts || pts.length < 2) return;
      const roadW = 5.5 / 2 + 1.25; // 4.0m offset from road centerline (placed safely on verge)

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const segLen = Math.hypot(dx, dz);
        if (segLen < 0.01) continue;

        const nx = -dz / segLen;
        const nz = dx / segLen;

        // Alternate sides along road curves to provide bilateral street lighting
        const side = (i + rIdx) % 2 === 0 ? 1 : -1;
        const steps = Math.max(1, Math.round(segLen / 28.0));

        for (let s = 0; s < steps; s++) {
          const t = (s + 0.5) / steps;
          const px = p1[0] + t * dx + nx * roadW * side;
          const pz = p1[1] + t * dz + nz * roadW * side;

          // Exclude main building footprint and parking stalls
          if (px >= -38 && px <= 38 && pz >= -16 && pz <= 46) {
            continue;
          }

          // Overhang arm points perpendicularly back towards the road centerline
          const armX = -nx * side;
          const armZ = -nz * side;

          rawPoles.push({
            pos: [px, 0, pz],
            armDir: [armX, armZ],
            isIntersection: s === 0 && (i === 0 || i === pts.length - 2),
          });
        }
      }
    });

    // Deduplicate poles that are closer than 15m
    const filtered: PoleData[] = [];
    rawPoles.forEach((p) => {
      const isTooClose = filtered.some(
        (f) => Math.hypot(p.pos[0] - f.pos[0], p.pos[2] - f.pos[2]) < 15.0
      );
      if (!isTooClose) {
        filtered.push(p);
      }
    });

    return { poles: filtered, keyLights: keyJunctions };
  }, [roads]);

  // Combined geometry for metal pole masts, 3D luminaire heads, 3D glowing bulbs, light cones, and ground pools
  const { poleGeos, bulbGeos, coneGeos, groundPoolGeos } = useMemo(() => {
    const polePositions: number[] = [];
    const bulbPositions: number[] = [];
    const conePositions: number[] = [];
    const poolPositions: number[] = [];

    const POLE_H = 6.2;
    const ARM_LEN = 1.35;

    // Helper: Push a quad (2 triangles)
    const pushQuad = (
      arr: number[],
      x1: number, y1: number, z1: number,
      x2: number, y2: number, z2: number,
      x3: number, y3: number, z3: number,
      x4: number, y4: number, z4: number
    ) => {
      arr.push(
        x1, y1, z1, x2, y2, z2, x3, y3, z3,
        x1, y1, z1, x3, y3, z3, x4, y4, z4
      );
    };

    // Helper: Push a box
    const pushBox = (
      arr: number[],
      cx: number, cy: number, cz: number,
      hx: number, hy: number, hz: number, // half extents along local X, Y, Z
      ux: number, uz: number, // unit vector along local X (length)
      vx: number, vz: number  // unit vector along local Z (width)
    ) => {
      // 8 local corners
      const corners: [number, number, number][] = [];
      for (const dy of [-hy, hy]) {
        for (const s1 of [-1, 1]) {
          for (const s2 of [-1, 1]) {
            corners.push([
              cx + ux * (s1 * hx) + vx * (s2 * hz),
              cy + dy,
              cz + uz * (s1 * hx) + vz * (s2 * hz)
            ]);
          }
        }
      }
      // Indices for 6 faces
      // Bottom (-Y): 0, 1, 3, 2
      pushQuad(arr, ...corners[0], ...corners[1], ...corners[3], ...corners[2]);
      // Top (+Y): 4, 6, 7, 5
      pushQuad(arr, ...corners[4], ...corners[6], ...corners[7], ...corners[5]);
      // Side -X: 0, 2, 6, 4
      pushQuad(arr, ...corners[0], ...corners[2], ...corners[6], ...corners[4]);
      // Side +X: 1, 5, 7, 3
      pushQuad(arr, ...corners[1], ...corners[5], ...corners[7], ...corners[3]);
      // Side -Z: 0, 4, 5, 1
      pushQuad(arr, ...corners[0], ...corners[4], ...corners[5], ...corners[1]);
      // Side +Z: 2, 3, 7, 6
      pushQuad(arr, ...corners[2], ...corners[3], ...corners[7], ...corners[6]);
    };

    poles.forEach((pole) => {
      const [px, , pz] = pole.pos;
      const [ax, az] = pole.armDir;
      const armLen = Math.hypot(ax, az);
      const uax = armLen > 0.001 ? ax / armLen : 1;
      const uaz = armLen > 0.001 ? az / armLen : 0;
      // Normal perpendicular to arm
      const unx = -uaz;
      const unz = uax;

      // 1. Vertical Pole Mast (Square prism, 0.14m wide)
      const pw = 0.07;
      pushBox(polePositions, px, POLE_H * 0.5, pz, pw, POLE_H * 0.5, pw, 1, 0, 0, 1);

      // Base concrete plinth footing
      const bw = 0.22;
      pushBox(polePositions, px, 0.15, pz, bw, 0.15, bw, 1, 0, 0, 1);

      // 2. Overhang Arm angled out over road
      const headX = px + uax * ARM_LEN;
      const headZ = pz + uaz * ARM_LEN;
      const headY = POLE_H + 0.15;

      // Arm beam connecting mast top to luminaire head
      const armMidX = (px + headX) * 0.5;
      const armMidZ = (pz + headZ) * 0.5;
      const armMidY = (POLE_H + headY) * 0.5;
      pushBox(polePositions, armMidX, armMidY, armMidZ, ARM_LEN * 0.52, 0.045, 0.045, uax, uaz, unx, unz);

      // 3. Dark Architectural Steel Luminaire Housing (Top Cap)
      pushBox(polePositions, headX, headY + 0.04, headZ, 0.22, 0.05, 0.11, uax, uaz, unx, unz);

      // 4. 3D GLOWING LUMINAIRE BULB / LENS (Extends underneath the housing)
      // Height 0.08m, Length 0.36m, Width 0.18m
      // A true 3D solid enclosure so it radiantly glows from ANY camera view angle (top-down, side, oblique)
      const bulbY = headY - 0.04;
      pushBox(bulbPositions, headX, bulbY, headZ, 0.18, 0.04, 0.09, uax, uaz, unx, unz);

      // 5. VOLUMETRIC DOWNWARD LIGHT CONE (Frustum)
      // Extends from bulb at y=6.15 down to road at y=0.1
      const coneTopY = headY - 0.08;
      const coneBottomY = 0.10;
      const rTop = 0.26;
      const rBottom = 3.8;
      const CONE_SEGS = 12;

      for (let s = 0; s < CONE_SEGS; s++) {
        const a1 = (s * Math.PI * 2) / CONE_SEGS;
        const a2 = ((s + 1) * Math.PI * 2) / CONE_SEGS;

        const cos1 = Math.cos(a1);
        const sin1 = Math.sin(a1);
        const cos2 = Math.cos(a2);
        const sin2 = Math.sin(a2);

        // Quad forming cone surface
        pushQuad(
          conePositions,
          headX + cos1 * rTop, coneTopY, headZ + sin1 * rTop,
          headX + cos2 * rTop, coneTopY, headZ + sin2 * rTop,
          headX + cos2 * rBottom, coneBottomY, headZ + sin2 * rBottom,
          headX + cos1 * rBottom, coneBottomY, headZ + sin1 * rBottom
        );
      }

      // 6. ROAD SURFACE LIGHT POOLS (Bright warm decal discs on asphalt)
      // Inner bright core disc (radius 1.8m)
      const POOL_SEGS = 14;
      const rCore = 1.8;
      const rHalo = 4.6;
      const poolY = 0.055;

      for (let s = 0; s < POOL_SEGS; s++) {
        const a1 = (s * Math.PI * 2) / POOL_SEGS;
        const a2 = ((s + 1) * Math.PI * 2) / POOL_SEGS;

        const cos1 = Math.cos(a1);
        const sin1 = Math.sin(a1);
        const cos2 = Math.cos(a2);
        const sin2 = Math.sin(a2);

        // Inner bright core circle
        poolPositions.push(
          headX, poolY, headZ,
          headX + cos1 * rCore, poolY, headZ + sin1 * rCore,
          headX + cos2 * rCore, poolY, headZ + sin2 * rCore
        );

        // Outer soft falloff ring
        pushQuad(
          poolPositions,
          headX + cos1 * rCore, poolY, headZ + sin1 * rCore,
          headX + cos2 * rCore, poolY, headZ + sin2 * rCore,
          headX + cos2 * rHalo, poolY, headZ + sin2 * rHalo,
          headX + cos1 * rHalo, poolY, headZ + sin1 * rHalo
        );
      }
    });

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(polePositions, 3));
    pGeo.computeVertexNormals();

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbPositions, 3));
    bGeo.computeVertexNormals();

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.Float32BufferAttribute(conePositions, 3));
    cGeo.computeVertexNormals();

    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.Float32BufferAttribute(poolPositions, 3));
    gGeo.computeVertexNormals();

    return {
      poleGeos: pGeo,
      bulbGeos: bGeo,
      coneGeos: cGeo,
      groundPoolGeos: gGeo,
    };
  }, [poles]);

  return (
    <group>
      {/* 1. Streetlight Metal Poles, Masts & Luminaire Top Housings */}
      <mesh geometry={poleGeos} castShadow receiveShadow>
        <meshStandardMaterial
          color="#334155" // dark architectural graphite steel
          roughness={0.4}
          metalness={0.65}
        />
      </mesh>

      {/* 2. 3D Glowing Luminaire Bulbs (Radiantly unshaded & visible from all 3D camera angles at night) */}
      <mesh geometry={bulbGeos}>
        {isNight ? (
          <meshBasicMaterial
            color="#fffbeb" // luminous warm-white LED glow (3200K)
            toneMapped={false} // Prevents tone-mapping clamping so the lamp visibly gleams
          />
        ) : (
          <meshStandardMaterial
            color="#64748b" // unlit daytime glass/diffuser
            roughness={0.45}
            metalness={0.15}
          />
        )}
      </mesh>

      {/* 3. Volumetric Downward Streetlight Light Cones (Zero-recreation visible toggle) */}
      <mesh geometry={coneGeos} visible={isNight}>
        <meshBasicMaterial
          color="#fef3c7"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Warm Ground Light Pools along All Road Asphalt & Junctions (1 draw call, 0 PointLights) */}
      <mesh geometry={groundPoolGeos} visible={isNight}>
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
