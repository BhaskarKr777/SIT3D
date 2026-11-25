'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

interface RiverAndBridgesProps {
  isNight?: boolean;
}

interface BankProp {
  pos: [number, number, number];
  scale: number;
  rotY: number;
  kind: 'rock' | 'submergedRock' | 'reed' | 'shrub';
  color: string;
}

/**
 * Renders a 3D recessed campus river channel with:
 * - Raised sloped grassy embankments (Y = 0.02m -> 0.52m) and inner stone walls (Y = 0.52m -> 0.025m)
 * - Visible 3D channel depth with dark riverbed & submerged river boulders
 * - Translucent, reflective flowing water (Y = 0.22m) with scrolling current texture & animated 3D foam streaks
 * - Two elevated precast concrete bridges spanning cleanly over the 3D river channel
 */
export function RiverAndBridges({ isNight = false }: RiverAndBridgesProps) {
  const foamGroupRef = useRef<THREE.Group>(null);

  // High-contrast procedural flowing water texture with directional current & ripples
  const { waterTexture, foamTexture } = useMemo(() => {
    if (typeof document === 'undefined') return { waterTexture: null, foamTexture: null };

    const c1 = document.createElement('canvas');
    c1.width = 256;
    c1.height = 256;
    const ctx1 = c1.getContext('2d');
    if (ctx1) {
      ctx1.fillStyle = '#0284c7';
      ctx1.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 240; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const w = 2 + Math.random() * 5;
        const h = 24 + Math.random() * 56;
        ctx1.fillStyle =
          i % 3 === 0
            ? 'rgba(186, 230, 253, 0.35)'
            : i % 3 === 1
            ? 'rgba(14, 116, 144, 0.4)'
            : 'rgba(7, 89, 133, 0.35)';
        ctx1.fillRect(x, y, w, h);
      }
    }
    const wTex = new THREE.CanvasTexture(c1);
    wTex.wrapS = THREE.RepeatWrapping;
    wTex.wrapT = THREE.RepeatWrapping;
    wTex.repeat.set(2, 32);

    const c2 = document.createElement('canvas');
    c2.width = 128;
    c2.height = 256;
    const ctx2 = c2.getContext('2d');
    if (ctx2) {
      ctx2.clearRect(0, 0, 128, 256);
      for (let i = 0; i < 90; i++) {
        const x = 10 + Math.random() * 108;
        const y = Math.random() * 256;
        const w = 1.5 + Math.random() * 2.5;
        const h = 20 + Math.random() * 48;
        ctx2.fillStyle = 'rgba(224, 242, 254, 0.55)';
        ctx2.fillRect(x, y, w, h);
      }
    }
    const fTex = new THREE.CanvasTexture(c2);
    fTex.wrapS = THREE.RepeatWrapping;
    fTex.wrapT = THREE.RepeatWrapping;
    fTex.repeat.set(1, 26);

    return { waterTexture: wTex, foamTexture: fTex };
  }, []);

  const {
    outerEmbankmentGeo,
    innerStoneWallGeo,
    deepBedGeo,
    waterGeo,
    foamGeo,
    bankProps,
  } = useMemo(() => {
    const waypoints = [
      new THREE.Vector3(-32, 0, 175),
      new THREE.Vector3(6, 0, 152),
      new THREE.Vector3(34, 0, 112),
      new THREE.Vector3(46, 0, 74),
      new THREE.Vector3(57.6, 0, 32.6),   // Crossing #1 (Road 1469221646)
      new THREE.Vector3(67, 0, 0),
      new THREE.Vector3(75, 0, -26),
      new THREE.Vector3(81.84, 0, -52.49), // Crossing #2 (Road 1484218552)
      new THREE.Vector3(88, 0, -82),
      new THREE.Vector3(93, 0, -112),
      new THREE.Vector3(99, 0, -148),
    ];

    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.45);
    const segments = 160;

    // Scatter rocks, submerged boulders, reeds & shrubs along the 3D banks
    const props: BankProp[] = [];
    const pts = curve.getSpacedPoints(95);
    const bridge1 = [57.6, 32.6];
    const bridge2 = [81.84, -52.49];

    for (let i = 2; i < pts.length - 2; i++) {
      const p = pts[i];
      const pNext = pts[i + 1];
      const dx = pNext.x - p.x;
      const dz = pNext.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      // Skip near the two concrete bridges
      if (
        Math.hypot(p.x - bridge1[0], p.z - bridge1[1]) < 9.0 ||
        Math.hypot(p.x - bridge2[0], p.z - bridge2[1]) < 9.0
      ) {
        continue;
      }

      const side = i % 2 === 0 ? 1 : -1;
      const bankOffset = 3.2 + ((i * 17) % 10) * 0.14;
      const px = p.x + nx * side * bankOffset;
      const pz = p.z + nz * side * bankOffset;

      if (i % 3 === 0) {
        // Shoreline rock sitting on sloped stone bank
        props.push({
          pos: [px, 0.24, pz],
          scale: 0.38 + ((i * 13) % 7) * 0.08,
          rotY: (i * 1.1) % Math.PI,
          kind: 'rock',
          color: i % 6 === 0 ? '#64748b' : '#78716c',
        });
      } else if (i % 7 === 0) {
        // Submerged boulder visible through translucent water
        props.push({
          pos: [p.x + nx * side * 1.3, 0.09, p.z + nz * side * 1.3],
          scale: 0.45 + ((i * 5) % 4) * 0.1,
          rotY: (i * 0.9) % Math.PI,
          kind: 'submergedRock',
          color: '#475569',
        });
      } else if (i % 4 === 1) {
        // Reeds on bank crest
        props.push({
          pos: [p.x + nx * side * 3.8, 0.42, p.z + nz * side * 3.8],
          scale: 0.55 + ((i * 7) % 5) * 0.1,
          rotY: (i * 0.8) % Math.PI,
          kind: 'reed',
          color: '#3f6212',
        });
      } else if (i % 5 === 2) {
        // Streamside shrub on outer embankment
        props.push({
          pos: [p.x + nx * side * 4.5, 0.38, p.z + nz * side * 4.5],
          scale: 0.6 + ((i * 11) % 5) * 0.09,
          rotY: (i * 0.5) % Math.PI,
          kind: 'shrub',
          color: i % 10 === 2 ? '#15803d' : '#166534',
        });
      }
    }

    return {
      // 3D Channel Cross-Section (all above Y = 0.01 terrain so depth is 100% visible!)
      // Outer grassy slope rises from terrain (0.015m) up to bank crest (0.48m)
      outerEmbankmentGeo: buildSlopedBankRibbon(curve, segments, 3.6, 5.8, 0.48, 0.015),
      // Inner rocky slope drops steeply from bank crest (0.48m) down into riverbed (0.025m)
      innerStoneWallGeo: buildSlopedBankRibbon(curve, segments, 2.2, 3.6, 0.025, 0.48),
      // Deep dark riverbed floor at Y = 0.025m
      deepBedGeo: buildFlatRibbon(curve, segments, 4.6, 0.025),
      // Translucent flowing water surface at Y = 0.24m (0.215m deep above riverbed, 0.24m below bank crest!)
      waterGeo: buildFlatRibbon(curve, segments, 5.4, 0.24),
      // Animated white/cyan current foam layer at Y = 0.25m
      foamGeo: buildFlatRibbon(curve, segments, 4.6, 0.25),
      bankProps: props,
    };
  }, []);

  // Continuous gentle river flow animation (reversed direction, slow natural pace)
  useFrame((state, delta) => {
    if (waterTexture) {
      waterTexture.offset.y += delta * 0.16;
      waterTexture.offset.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
    if (foamTexture) {
      foamTexture.offset.y += delta * 0.24;
      foamTexture.offset.x = Math.cos(state.clock.elapsedTime * 0.65) * 0.03;
    }
    if (foamGroupRef.current) {
      foamGroupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.008;
    }
  });

  return (
    <group>
      {/* 1. Raised Outer Grassy River Embankment Slopes */}
      <mesh geometry={outerEmbankmentGeo} receiveShadow castShadow>
        <meshStandardMaterial color="#3f6212" roughness={0.92} />
      </mesh>

      {/* 2. Steep Inner Stone / Rock Bank Walls (creates visible 3D channel depth) */}
      <mesh geometry={innerStoneWallGeo} receiveShadow castShadow>
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* 3. Deep Riverbed Channel Floor */}
      <mesh geometry={deepBedGeo} receiveShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.95} />
      </mesh>

      {/* 4. Translucent Reflective Flowing Water Surface */}
      <mesh geometry={waterGeo} receiveShadow>
        <meshStandardMaterial
          map={waterTexture || undefined}
          color={isNight ? '#0c4a6e' : '#0284c7'}
          roughness={0.07}
          metalness={0.45}
          transparent
          opacity={0.76}
        />
      </mesh>

      {/* 5. Animated Downstream Foam & Current Streaks */}
      <group ref={foamGroupRef}>
        <mesh geometry={foamGeo}>
          <meshStandardMaterial
            map={foamTexture || undefined}
            color="#e0f2fe"
            transparent
            opacity={isNight ? 0.25 : 0.6}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 6. Riverbank Rocks, Submerged Boulders, Reeds & Shrubs */}
      {bankProps.map((prop, idx) => {
        if (prop.kind === 'rock' || prop.kind === 'submergedRock') {
          return (
            <mesh
              key={`river_prop_${idx}`}
              position={prop.pos}
              scale={[prop.scale * 1.3, prop.scale * 0.75, prop.scale]}
              rotation={[0, prop.rotY, 0]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[0.7, 0]} />
              <meshStandardMaterial color={prop.color} roughness={0.9} />
            </mesh>
          );
        }
        if (prop.kind === 'reed') {
          return (
            <group key={`river_prop_${idx}`} position={prop.pos} rotation={[0, prop.rotY, 0]}>
              <mesh position={[0, prop.scale * 0.45, 0]} castShadow>
                <coneGeometry args={[0.18 * prop.scale, prop.scale * 1.1, 5]} />
                <meshStandardMaterial color={prop.color} roughness={0.85} />
              </mesh>
              <mesh position={[0.2, prop.scale * 0.35, 0.15]} rotation={[0.1, 0, -0.15]} castShadow>
                <coneGeometry args={[0.14 * prop.scale, prop.scale * 0.9, 5]} />
                <meshStandardMaterial color="#4d7c0f" roughness={0.85} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh
            key={`river_prop_${idx}`}
            position={prop.pos}
            scale={[prop.scale * 1.2, prop.scale * 0.85, prop.scale]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[0.8, 1]} />
            <meshStandardMaterial color={prop.color} roughness={0.88} />
          </mesh>
        );
      })}

      {/* 7. Two Elevated Simple Precast Concrete Bridges Spanning the 3D Channel */}
      <SimpleConcreteBridge label="Bridge 1" position={[57.6, 0, 32.6]} rotationY={-0.4988} />
      <SimpleConcreteBridge label="Bridge 2" position={[81.84, 0, -52.49]} rotationY={0.8948} />
    </group>
  );
}

/** Builds a flat 3D ribbon along a curve */
function buildFlatRibbon(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  width: number,
  yHeight: number
): THREE.BufferGeometry {
  const halfW = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const points = curve.getSpacedPoints(segments);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    const v1L = [p1.x + nx * halfW, yHeight, p1.z + nz * halfW];
    const v1R = [p1.x - nx * halfW, yHeight, p1.z - nz * halfW];
    const v2L = [p2.x + nx * halfW, yHeight, p2.z + nz * halfW];
    const v2R = [p2.x - nx * halfW, yHeight, p2.z - nz * halfW];

    positions.push(...v1L, ...v2L, ...v1R);
    positions.push(...v1R, ...v2L, ...v2R);

    const u1 = i / segments;
    const u2 = (i + 1) / segments;
    uvs.push(0, u1, 0, u2, 1, u1);
    uvs.push(1, u1, 0, u2, 1, u2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Builds sloped left & right riverbank strips from innerHalfW/innerY to outerHalfW/outerY */
function buildSlopedBankRibbon(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  innerHalfW: number,
  outerHalfW: number,
  innerY: number,
  outerY: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const points = curve.getSpacedPoints(segments);

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;

    // Left slope
    const lIn1 = [p1.x + nx * innerHalfW, innerY, p1.z + nz * innerHalfW];
    const lOut1 = [p1.x + nx * outerHalfW, outerY, p1.z + nz * outerHalfW];
    const lIn2 = [p2.x + nx * innerHalfW, innerY, p2.z + nz * innerHalfW];
    const lOut2 = [p2.x + nx * outerHalfW, outerY, p2.z + nz * outerHalfW];
    positions.push(...lOut1, ...lOut2, ...lIn1, ...lIn1, ...lOut2, ...lIn2);

    // Right slope
    const rIn1 = [p1.x - nx * innerHalfW, innerY, p1.z - nz * innerHalfW];
    const rOut1 = [p1.x - nx * outerHalfW, outerY, p1.z - nz * outerHalfW];
    const rIn2 = [p2.x - nx * innerHalfW, innerY, p2.z - nz * innerHalfW];
    const rOut2 = [p2.x - nx * outerHalfW, outerY, p2.z - nz * outerHalfW];
    positions.push(...rIn1, ...rIn2, ...rOut1, ...rOut1, ...rIn2, ...rOut2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Simple precast concrete road bridge spanning cleanly over the 3D river channel.
 */
function SimpleConcreteBridge({
  label,
  position,
  rotationY,
}: {
  label: string;
  position: [number, number, number];
  rotationY: number;
}) {
  const spanLength = 10.6;
  const deckWidth = 5.4;
  const deckY = 0.62;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main Concrete Deck Slab */}
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[spanLength, 0.22, deckWidth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* Asphalt Roadway Surface on Bridge Deck */}
      <mesh position={[0, deckY + 0.115, 0]} receiveShadow>
        <boxGeometry args={[spanLength - 0.1, 0.03, deckWidth - 0.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Approach Concrete Ramps at Both Ends */}
      <mesh position={[-spanLength / 2 - 1.5, deckY * 0.52, 0]} rotation={[0, 0, 0.18]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.18, deckWidth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>
      <mesh position={[spanLength / 2 + 1.5, deckY * 0.52, 0]} rotation={[0, 0, -0.18]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.18, deckWidth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* Concrete Abutment Piers Anchoring into Riverbanks */}
      <mesh position={[-spanLength / 2 + 0.5, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, deckWidth + 0.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>
      <mesh position={[spanLength / 2 - 0.5, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.72, deckWidth + 0.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} />
      </mesh>

      {/* Simple Concrete Side Parapet Walls / Guardrails */}
      <mesh position={[0, deckY + 0.42, -deckWidth / 2 + 0.16]} castShadow receiveShadow>
        <boxGeometry args={[spanLength + 0.4, 0.68, 0.28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      <mesh position={[0, deckY + 0.42, deckWidth / 2 - 0.16]} castShadow receiveShadow>
        <boxGeometry args={[spanLength + 0.4, 0.68, 0.28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {/* Floating Bridge Name Label */}
      <Html position={[0, 2.2, 0]} center distanceFactor={95} zIndexRange={[80, 0]}>
        <div className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-md bg-slate-900/80 text-sky-100 backdrop-blur-sm border border-sky-500/40 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
          <span>{label}</span>
        </div>
      </Html>
    </group>
  );
}
