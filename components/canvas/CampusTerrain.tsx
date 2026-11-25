'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface CampusTerrainProps {
  boundary: [number, number][];
}

export function CampusTerrain({ boundary }: CampusTerrainProps) {
  // Procedural natural grass texture for realistic lawn & tea garden ground
  const { lawnTexture, teaGardenTexture } = useMemo(() => {
    if (typeof document === 'undefined') return { lawnTexture: null, teaGardenTexture: null };
    const makeGrassTex = (base: string, light: string, dark: string, repeat: number) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1600; i++) {
          ctx.fillStyle = i % 2 === 0 ? light : dark;
          ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 4);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
      return tex;
    };
    return {
      lawnTexture: makeGrassTex('#22c55e', 'rgba(74, 222, 128, 0.25)', 'rgba(21, 128, 61, 0.28)', 18),
      teaGardenTexture: makeGrassTex('#166534', 'rgba(34, 197, 94, 0.16)', 'rgba(20, 83, 45, 0.35)', 40),
    };
  }, []);

  // Boundary polygon shape for campus interior
  const campusInteriorGeo = useMemo(() => {
    if (!boundary || boundary.length < 3) return null;
    const s = new THREE.Shape();
    s.moveTo(boundary[0][0], -boundary[0][1]);
    for (let i = 1; i < boundary.length; i++) {
      s.lineTo(boundary[i][0], -boundary[i][1]);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [boundary]);

  // Campus Boundary Security Fence & Masonry Plinth Geometries
  const { boundaryPlinthGeo, boundaryFenceGeo } = useMemo(() => {
    if (!boundary || boundary.length < 3) return { boundaryPlinthGeo: null, boundaryFenceGeo: null };

    const gateLocations: [number, number][] = [
      [155.01, -111.17], // Main South-East Highway Entrance Gate (Hill Cart Road)
      [34.34, 119.55],   // North Secondary Entrance Gate
    ];

    const isGate = (p1: [number, number], p2: [number, number]) => {
      const mx = (p1[0] + p2[0]) / 2.0;
      const mz = (p1[1] + p2[1]) / 2.0;
      for (const [gx, gz] of gateLocations) {
        if (Math.hypot(mx - gx, mz - gz) < 5.5) return true;
      }
      return false;
    };

    const plinthPositions: number[] = [];
    const fencePositions: number[] = [];

    const plinthH = 0.38;
    const plinthHalfW = 0.13;
    const fenceH = 2.2;
    const railBottomY = 0.44;
    const railTopY = 2.12;
    const railHalfW = 0.04;
    const postHalfW = 0.06;
    const picketHalfW = 0.02;

    for (let i = 0; i < boundary.length; i++) {
      const p1 = boundary[i];
      const p2 = boundary[(i + 1) % boundary.length];
      if (isGate(p1, p2)) continue;

      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 0.15) continue;

      const ux = dx / segLen;
      const uz = dz / segLen;
      const nx = -uz;
      const nz = ux;

      // 1. Concrete Plinth Base (Box ribbon)
      const p1_left = [p1[0] + nx * plinthHalfW, p1[1] + nz * plinthHalfW];
      const p1_right = [p1[0] - nx * plinthHalfW, p1[1] - nz * plinthHalfW];
      const p2_left = [p2[0] + nx * plinthHalfW, p2[1] + nz * plinthHalfW];
      const p2_right = [p2[0] - nx * plinthHalfW, p2[1] - nz * plinthHalfW];

      // Left face
      plinthPositions.push(
        p1_left[0], 0, p1_left[1],
        p1_left[0], plinthH, p1_left[1],
        p2_left[0], 0, p2_left[1],
        p2_left[0], 0, p2_left[1],
        p1_left[0], plinthH, p1_left[1],
        p2_left[0], plinthH, p2_left[1]
      );
      // Right face
      plinthPositions.push(
        p2_right[0], 0, p2_right[1],
        p2_right[0], plinthH, p2_right[1],
        p1_right[0], 0, p1_right[1],
        p1_right[0], 0, p1_right[1],
        p2_right[0], plinthH, p2_right[1],
        p1_right[0], plinthH, p1_right[1]
      );
      // Top face
      plinthPositions.push(
        p1_left[0], plinthH, p1_left[1],
        p1_right[0], plinthH, p1_right[1],
        p2_left[0], plinthH, p2_left[1],
        p2_left[0], plinthH, p2_left[1],
        p1_right[0], plinthH, p1_right[1],
        p2_right[0], plinthH, p2_right[1]
      );

      // 2. Horizontal Steel Guard Rails (Top & Bottom)
      for (const ry of [railBottomY, railTopY]) {
        const r1l = [p1[0] + nx * railHalfW, p1[1] + nz * railHalfW];
        const r1r = [p1[0] - nx * railHalfW, p1[1] - nz * railHalfW];
        const r2l = [p2[0] + nx * railHalfW, p2[1] + nz * railHalfW];
        const r2r = [p2[0] - nx * railHalfW, p2[1] - nz * railHalfW];
        const rh = 0.06;

        fencePositions.push(
          r1l[0], ry, r1l[1], r1l[0], ry + rh, r1l[1], r2l[0], ry, r2l[1],
          r2l[0], ry, r2l[1], r1l[0], ry + rh, r1l[1], r2l[0], ry + rh, r2l[1],
          r2r[0], ry, r2r[1], r2r[0], ry + rh, r2r[1], r1r[0], ry, r1r[1],
          r1r[0], ry, r1r[1], r2r[0], ry + rh, r2r[1], r1r[0], ry + rh, r1r[1]
        );
      }

      // 3. Vertical Security Posts (every ~3.5 meters)
      const numPosts = Math.max(1, Math.round(segLen / 3.5));
      for (let s = 0; s < numPosts; s++) {
        const t = s / numPosts;
        const postX = p1[0] + t * dx;
        const postZ = p1[1] + t * dz;

        // Square post box
        const p_l = [postX + nx * postHalfW, postZ + nz * postHalfW];
        const p_r = [postX - nx * postHalfW, postZ - nz * postHalfW];
        const p_f = [postX + ux * postHalfW, postZ + uz * postHalfW];
        const p_b = [postX - ux * postHalfW, postZ - uz * postHalfW];

        fencePositions.push(
          p_l[0], 0, p_l[1], p_l[0], fenceH, p_l[1], p_r[0], 0, p_r[1],
          p_r[0], 0, p_r[1], p_l[0], fenceH, p_l[1], p_r[0], fenceH, p_r[1],
          p_f[0], 0, p_f[1], p_f[0], fenceH, p_f[1], p_b[0], 0, p_b[1],
          p_b[0], 0, p_b[1], p_f[0], fenceH, p_f[1], p_b[0], fenceH, p_b[1]
        );
      }

      // 4. Vertical Metal Rail Pickets (every ~0.45 meters)
      const numPickets = Math.max(1, Math.round(segLen / 0.45));
      for (let s = 0; s < numPickets; s++) {
        const t = (s + 0.5) / numPickets;
        const pickX = p1[0] + t * dx;
        const pickZ = p1[1] + t * dz;

        const pik_l = [pickX + nx * picketHalfW, pickZ + nz * picketHalfW];
        const pik_r = [pickX - nx * picketHalfW, pickZ - nz * picketHalfW];

        fencePositions.push(
          pik_l[0], railBottomY, pik_l[1],
          pik_l[0], railTopY, pik_l[1],
          pik_r[0], railBottomY, pik_r[1],
          pik_r[0], railBottomY, pik_r[1],
          pik_l[0], railTopY, pik_l[1],
          pik_r[0], railTopY, pik_r[1]
        );
      }
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(plinthPositions, 3));
    pGeo.computeVertexNormals();

    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fencePositions, 3));
    fGeo.computeVertexNormals();

    return { boundaryPlinthGeo: pGeo, boundaryFenceGeo: fGeo };
  }, [boundary]);

  return (
    <group>
      {/* Expansive Regional Ground (Chamtaguri Tea Garden Green + Foothills) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial
          map={teaGardenTexture || undefined}
          color="#166534" // lush tea garden deep green
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Campus Ground (Fresh campus green lawn base) */}
      {campusInteriorGeo && (
        <mesh
          geometry={campusInteriorGeo}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          receiveShadow
        >
          <meshStandardMaterial
            map={lawnTexture || undefined}
            color="#22c55e" // vibrant manicured grass
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>
      )}

      {/* 1. Low Concrete Plinth Base along Perimeter */}
      {boundaryPlinthGeo && (
        <mesh geometry={boundaryPlinthGeo} receiveShadow castShadow>
          <meshStandardMaterial
            color="#94a3b8" // architectural concrete plinth
            roughness={0.75}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* 2. Continuous Steel Security Rails, Posts & Pickets */}
      {boundaryFenceGeo && (
        <mesh geometry={boundaryFenceGeo} receiveShadow castShadow>
          <meshStandardMaterial
            color="#1e293b" // dark graphite steel security fence
            roughness={0.35}
            metalness={0.65}
          />
        </mesh>
      )}

      {/* 3. Main South-East Highway Entrance Gate (Hill Cart Road at [155.01, -111.17], perpendicular to road) */}
      <group position={[155.01, 0, -111.17]} rotation={[0, 1.7745, 0]}>
        {/* Left Masonry Gate Pillar */}
        <mesh position={[-4.2, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 4.8, 1.4]} />
          <meshStandardMaterial color="#f5ede0" roughness={0.5} />
        </mesh>
        <mesh position={[-4.2, 4.95, 0]} castShadow>
          <boxGeometry args={[1.6, 0.3, 1.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-4.2, 5.3, 0]} castShadow>
          <coneGeometry args={[0.9, 0.5, 4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Right Masonry Gate Pillar */}
        <mesh position={[4.2, 2.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 4.8, 1.4]} />
          <meshStandardMaterial color="#f5ede0" roughness={0.5} />
        </mesh>
        <mesh position={[4.2, 4.95, 0]} castShadow>
          <boxGeometry args={[1.6, 0.3, 1.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[4.2, 5.3, 0]} castShadow>
          <coneGeometry args={[0.9, 0.5, 4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Overhead Entrance Arch Beam */}
        <mesh position={[0, 4.8, 0]} castShadow>
          <boxGeometry args={[9.8, 0.7, 0.6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Open Wing Security Gates */}
        <mesh position={[-2.8, 1.6, 0.8]} rotation={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[2.5, 2.8, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[2.8, 1.6, 0.8]} rotation={[0, -0.8, 0]} castShadow>
          <boxGeometry args={[2.5, 2.8, 0.08]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Floating Main Gate Label */}
        <Html position={[0, 6.4, 0]} center distanceFactor={95} zIndexRange={[10, 0]}>
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-md bg-slate-900/85 text-amber-100 backdrop-blur-sm border border-amber-400/50 flex items-center gap-1.5 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span>Main Gate</span>
          </div>
        </Html>
      </group>

      {/* 4. North Secondary Campus Gate (at [34.34, 119.55]) */}
      <group position={[34.34, 0, 119.55]} rotation={[0, 0.25, 0]}>
        <mesh position={[-3.6, 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 4.0, 1.1]} />
          <meshStandardMaterial color="#f5ede0" roughness={0.5} />
        </mesh>
        <mesh position={[-3.6, 4.15, 0]} castShadow>
          <boxGeometry args={[1.25, 0.25, 1.25]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[3.6, 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 4.0, 1.1]} />
          <meshStandardMaterial color="#f5ede0" roughness={0.5} />
        </mesh>
        <mesh position={[3.6, 4.15, 0]} castShadow>
          <boxGeometry args={[1.25, 0.25, 1.25]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
      </group>

    </group>
  );
}
