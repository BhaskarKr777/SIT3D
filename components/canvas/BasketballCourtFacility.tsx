'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface BasketballCourtFacilityProps {
  position?: [number, number, number];
  rotationY?: number;
  isNight?: boolean;
  isSelected?: boolean;
  courtColor?: string;
  accentColor?: string;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function BasketballCourtFacility({
  position = [-44.0, 0.08, -64.0],
  rotationY = -11.5 * (Math.PI / 180), // -0.2007 rad (aligned with campus road)
  isNight = false,
  isSelected = false,
  courtColor = '#64748b',
  accentColor = '#ea580c',
  onClick,
  onPointerOver,
  onPointerOut,
}: BasketballCourtFacilityProps) {
  // Regulation FIBA Court Dimensions:
  // Playing court: 28m x 15m (Half: 14m x 7.5m)
  // Overall facility enclosure: 32m x 19m (Half: 16m x 9.5m)
  const courtLength = 28;
  const courtWidth = 15;
  const halfLen = courtLength / 2; // 14m
  const halfWid = courtWidth / 2; // 7.5m
  const facilityLength = 32;
  const facilityWidth = 19;
  const halfFacLen = facilityLength / 2; // 16m
  const halfFacWid = facilityWidth / 2; // 9.5m

  // Pre-generate Three-point Arc Geometry (Radius 6.75m from basket focal point at X = +/- 12.425m)
  const { threePointGeoEast, threePointGeoWest, centerCircleGeo, keyCirclesGeo } = useMemo(() => {
    // Center circle
    const cCircle = new THREE.RingGeometry(1.76, 1.84, 48);

    // Free throw top of key circle (radius 1.8m)
    const kCircle = new THREE.RingGeometry(1.76, 1.84, 36);

    // Three point arcs (radius 6.75m)
    const r3pt = 6.75;
    const basketOffsetX = halfLen - 1.575; // 12.425m
    const straightZ = 6.6; // FIBA corner distance
    const startAngle = Math.asin(straightZ / r3pt); // ~1.36 rad

    // West 3pt arc points (local centered on basket at -basketOffsetX)
    const ptsWest: THREE.Vector3[] = [];
    ptsWest.push(new THREE.Vector3(-halfLen, 0.005, -straightZ));
    const westStraightX = -basketOffsetX + Math.cos(startAngle) * r3pt;
    ptsWest.push(new THREE.Vector3(westStraightX, 0.005, -straightZ));
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = -startAngle + (i / steps) * (2 * startAngle);
      ptsWest.push(new THREE.Vector3(-basketOffsetX + Math.cos(a) * r3pt, 0.005, Math.sin(a) * r3pt));
    }
    ptsWest.push(new THREE.Vector3(-halfLen, 0.005, straightZ));

    // East 3pt arc points
    const ptsEast: THREE.Vector3[] = [];
    ptsEast.push(new THREE.Vector3(halfLen, 0.005, -straightZ));
    const eastStraightX = basketOffsetX - Math.cos(startAngle) * r3pt;
    ptsEast.push(new THREE.Vector3(eastStraightX, 0.005, -straightZ));
    for (let i = 0; i <= steps; i++) {
      const a = -startAngle + (i / steps) * (2 * startAngle);
      ptsEast.push(new THREE.Vector3(basketOffsetX - Math.cos(a) * r3pt, 0.005, Math.sin(a) * r3pt));
    }
    ptsEast.push(new THREE.Vector3(halfLen, 0.005, straightZ));

    const curveWest = new THREE.CatmullRomCurve3(ptsWest);
    const curveEast = new THREE.CatmullRomCurve3(ptsEast);

    return {
      threePointGeoEast: new THREE.TubeGeometry(curveEast, 36, 0.04, 6, false),
      threePointGeoWest: new THREE.TubeGeometry(curveWest, 36, 0.04, 6, false),
      centerCircleGeo: cCircle,
      keyCirclesGeo: kCircle,
    };
  }, [halfLen]);

  const mainCourtGrey = courtColor || '#64748b';
  const keyCenterOrange = accentColor || '#ea580c';

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
      {/* ============================================================== */}
      {/* 1. SOLID CONCRETE FOUNDATION SUB-BASE & PERIMETER BEVELED CURB */}
      {/* ============================================================== */}
      {/* Lower Subterranean Anchor Slab */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[facilityLength + 1.2, 0.16, facilityWidth + 1.2]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Main Concrete Plinth Top Slab */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[facilityLength + 0.6, 0.06, facilityWidth + 0.6]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* ============================================================== */}
      {/* 2. GREY SPORTS FLOORING WITH ORANGE KEYS & CENTER CIRCLE       */}
      {/* ============================================================== */}
      {/* Outer Apron / Run-off Border (Slate Grey) */}
      <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[facilityLength, facilityWidth]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#475569'}
          roughness={0.5}
          metalness={0.05}
        />
      </mesh>

      {/* Inner Playing Court (Architectural Grey) */}
      <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[courtLength, courtWidth]} />
        <meshStandardMaterial color={mainCourtGrey} roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Painted Free-Throw Keys / Goal Post Areas (Orange Infill) */}
      {/* West Key (5.8m long x 4.9m wide) */}
      <mesh position={[-halfLen + 2.9, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.8, 4.9]} />
        <meshStandardMaterial color={keyCenterOrange} roughness={0.42} />
      </mesh>
      {/* East Key (5.8m long x 4.9m wide) */}
      <mesh position={[halfLen - 2.9, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.8, 4.9]} />
        <meshStandardMaterial color={keyCenterOrange} roughness={0.42} />
      </mesh>

      {/* Center Jump Circle Inner Infill (Orange Infill) */}
      <mesh position={[0, 0.053, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 36]} />
        <meshStandardMaterial color={keyCenterOrange} roughness={0.42} />
      </mesh>

      {/* ============================================================== */}
      {/* 3. CRISP WHITE COURT OUTLINING & LINE MARKINGS                 */}
      {/* ============================================================== */}
      <group position={[0, 0.056, 0]}>
        {/* Perimeter Boundary Lines (28m x 15m) */}
        {/* North sideline */}
        <mesh position={[0, 0, -halfWid]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[courtLength + 0.09, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* South sideline */}
        <mesh position={[0, 0, halfWid]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[courtLength + 0.09, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* West baseline */}
        <mesh position={[-halfLen, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[courtWidth + 0.09, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* East baseline */}
        <mesh position={[halfLen, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[courtWidth + 0.09, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Half-Court Dividing Line */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[courtWidth, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Center Jump Circle Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={centerCircleGeo}>
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>

        {/* Free-Throw Lane Boundaries & Lines */}
        {/* West Free Throw Line (at X = -halfLen + 5.8m = -8.2m) */}
        <mesh position={[-halfLen + 5.8, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[4.99, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* West Lane Left & Right Margins */}
        <mesh position={[-halfLen + 2.9, 0, -2.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.8, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-halfLen + 2.9, 0, 2.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.8, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* West Free-Throw Circle (at X = -8.2m) */}
        <mesh position={[-halfLen + 5.8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={keyCirclesGeo}>
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>

        {/* East Free Throw Line (at X = halfLen - 5.8m = 8.2m) */}
        <mesh position={[halfLen - 5.8, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[4.99, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* East Lane Left & Right Margins */}
        <mesh position={[halfLen - 2.9, 0, -2.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.8, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[halfLen - 2.9, 0, 2.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.8, 0.09]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* East Free-Throw Circle (at X = 8.2m) */}
        <mesh position={[halfLen - 5.8, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={keyCirclesGeo}>
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>

        {/* Three-Point Arcs */}
        <mesh geometry={threePointGeoWest}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh geometry={threePointGeoEast}>
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Restricted Area No-Charge Semi-Circles (Radius 1.25m under rims) */}
        <mesh position={[-halfLen + 1.575, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.28, 24, 1, -Math.PI / 2, Math.PI]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[halfLen - 1.575, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.28, 24, 1, Math.PI / 2, Math.PI]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 4. TWO REGULATION BASKETBALL HOOP SYSTEMS                     */}
      {/* ============================================================== */}
      <BasketballHoop side="west" xPos={-halfLen} />
      <BasketballHoop side="east" xPos={halfLen} />

      {/* ============================================================== */}
      {/* 5. TEAM BENCHES ALONG SIDELINE (NO PERIMETER FENCES)           */}
      {/* ============================================================== */}
      {/* Home & Away Player Team Benches along North Sideline */}
      <group position={[-6.0, 0, halfFacWid - 0.9]}>
        <TeamBench length={4.2} label="Home Team" />
      </group>
      <group position={[6.0, 0, halfFacWid - 0.9]}>
        <TeamBench length={4.2} label="Away Team" />
      </group>

      {/* ============================================================== */}
      {/* 7. HIGH-MAST NIGHT FLOODLIGHT TOWERS & ILLUMINATION           */}
      {/* ============================================================== */}
      <group>
        {/* 4 Corner Floodlight Masts (at X = +/- 15.5m, Z = +/- 9.2m) */}
        {[
          [-halfFacLen + 0.5, -halfFacWid + 0.5, 45],
          [halfFacLen - 0.5, -halfFacWid + 0.5, 135],
          [halfFacLen - 0.5, halfFacWid - 0.5, 225],
          [-halfFacLen + 0.5, halfFacWid - 0.5, 315],
        ].map(([fx, fz, fRot], idx) => (
          <FloodlightTower
            key={`floodlight_${idx}`}
            position={[fx, 0, fz]}
            rotationY={(fRot * Math.PI) / 180}
            isNight={isNight}
          />
        ))}

        {/* Single Persistent Non-Shadow Night Court Floodlight (0ms toggle) */}
        <pointLight
          position={[0, 9.0, 0]}
          color="#fffcf0"
          intensity={isNight ? 3.8 : 0}
          distance={42}
          decay={1.8}
        />
      </group>

      {/* ============================================================== */}
      {/* 8. PAVED STONE ACCESS WALKWAY & PERIMETER LANDSCAPING          */}
      {/* ============================================================== */}
      {/* Entrance Paved Walkway connecting court gate to north road */}
      <group position={[0, 0.03, halfFacWid + 2.0]}>
        {/* Walkway Slab */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[3.2, 0.05, 4.0]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} />
        </mesh>
        {/* Decorative Paver Joint Borders */}
        {[-1.0, 0, 1.0].map((stepZ, zIdx) => (
          <mesh key={`pave_strip_${zIdx}`} position={[0, 0.026, stepZ]}>
            <boxGeometry args={[3.15, 0.005, 0.08]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
        ))}

        {/* Low Landscaped Hedge Borders along Walkway */}
        <mesh position={[-1.75, 0.3, 0]}>
          <boxGeometry args={[0.4, 0.6, 3.8]} />
          <meshStandardMaterial color="#166534" roughness={0.9} />
        </mesh>
        <mesh position={[1.75, 0.3, 0]}>
          <boxGeometry args={[0.4, 0.6, 3.8]} />
          <meshStandardMaterial color="#166534" roughness={0.9} />
        </mesh>
      </group>

      {/* Landscaped Green Shrubbery Behind Spectator Bleachers */}
      <group position={[0, 0.35, -halfFacWid - 1.8]}>
        <mesh>
          <boxGeometry args={[18.5, 0.7, 0.6]} />
          <meshStandardMaterial color="#14532d" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: REGULATION BASKETBALL HOOP & CANTILEVER SUPPORT POST
// ----------------------------------------------------------------------
function BasketballHoop({ side, xPos }: { side: 'west' | 'east'; xPos: number }) {
  const isWest = side === 'west';
  // Post is placed 1.2m outside baseline
  const postX = isWest ? xPos - 1.2 : xPos + 1.2;
  const overhangSign = isWest ? 1 : -1;

  // Rim is placed 1.2m inward from baseline focal point
  const rimX = isWest ? xPos + 0.38 : xPos - 0.38;
  const backboardX = isWest ? xPos : xPos;

  return (
    <group>
      {/* 1. Heavy-duty Concrete Ground Pier */}
      <mesh position={[postX, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.3, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* 2. Protective Safety Padded Sleeve (Lower 1.8m) */}
      <mesh position={[postX, 1.05, 0]} castShadow>
        <boxGeometry args={[0.36, 1.8, 0.36]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* 3. Main Steel Support Post (Upper Section up to boom) */}
      <mesh position={[postX, 2.5, 0]} castShadow>
        <boxGeometry args={[0.18, 1.6, 0.18]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 4. Cantilevered Overhang Arm (extending 1.2m over baseline) */}
      <mesh
        position={[postX + (overhangSign * 0.6), 3.25, 0]}
        rotation={[0, 0, overhangSign * 0.22]}
        castShadow
      >
        <boxGeometry args={[1.3, 0.14, 0.14]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Dual Diagonal Upper Stabilization Struts */}
      <mesh
        position={[postX + (overhangSign * 0.5), 3.45, 0.22]}
        rotation={[0, 0, overhangSign * 0.35]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh
        position={[postX + (overhangSign * 0.5), 3.45, -0.22]}
        rotation={[0, 0, overhangSign * 0.35]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>

      {/* 5. Tempered Glass Backboard (1.8m x 1.05m x 0.03m) */}
      <group position={[backboardX, 3.35, 0]} rotation={[0, isWest ? Math.PI : 0, 0]}>
        {/* Outer Steel / Aluminum Structural Frame */}
        <mesh castShadow>
          <boxGeometry args={[0.04, 1.05, 1.8]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Tempered Transparent Glass Pane */}
        <mesh position={[0.015, 0, 0]}>
          <boxGeometry args={[0.01, 1.01, 1.76]} />
          <meshStandardMaterial
            color="#f1f5f9"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.65}
          />
        </mesh>
        {/* White Target Box (0.59m wide x 0.45m high) */}
        <mesh position={[0.022, -0.15, 0]}>
          <planeGeometry args={[0.59, 0.45]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      </group>

      {/* 6. Heavy-Duty Breakaway Orange Rim (Height 3.05m = 10ft) */}
      <group position={[rimX, 3.05, 0]}>
        {/* Rim Mounting Bracket */}
        <mesh position={[isWest ? -0.18 : 0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.08, 0.12]} />
          <meshStandardMaterial color="#ff5722" metalness={0.6} />
        </mesh>
        {/* Official Breakaway Steel Orange Ring (Radius 0.225m, Tube 0.018m) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.225, 0.018, 12, 32]} />
          <meshStandardMaterial color="#ff5722" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* White Hanging Nylon Net (Tapered Open Cone) */}
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.21, 0.12, 0.42, 16, 4, true]} />
          <meshStandardMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.85}
            roughness={0.9}
          />
        </mesh>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: PERIMETER SPORTS CHAIN-LINK ENCLOSURE FENCE (4M HEIGHT)
// ----------------------------------------------------------------------
function CourtPerimeterFence({
  facilityLength,
  facilityWidth,
}: {
  facilityLength: number;
  facilityWidth: number;
}) {
  const hFacL = facilityLength / 2;
  const hFacW = facilityWidth / 2;
  const fenceHeight = 3.8;
  const postRadius = 0.05;

  // Post positions along all 4 perimeter edges (spaced ~3.6m to 4m)
  const posts = useMemo(() => {
    const list: [number, number][] = [];
    const stepX = 3.55;
    const stepZ = 3.8;

    // North and South edges
    for (let x = -hFacL; x <= hFacL + 0.1; x += stepX) {
      list.push([x, -hFacW]);
      // Leave entrance opening on North side near center (X between -1.5 and 1.5)
      if (Math.abs(x) > 1.6) {
        list.push([x, hFacW]);
      }
    }
    // Entrance Gate boundary posts on North side
    list.push([-1.4, hFacW]);
    list.push([1.4, hFacW]);

    // West and East edges
    for (let z = -hFacW + stepZ; z < hFacW; z += stepZ) {
      list.push([-hFacL, z]);
      list.push([hFacL, z]);
    }
    return list;
  }, [hFacL, hFacW]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Vertical Dark Graphite Steel Posts */}
      {posts.map(([px, pz], idx) => (
        <group key={`fence_post_${idx}`} position={[px, fenceHeight / 2, pz]}>
          <mesh castShadow>
            <cylinderGeometry args={[postRadius, postRadius, fenceHeight, 10]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Post Cap */}
          <mesh position={[0, fenceHeight / 2 + 0.05, 0]}>
            <sphereGeometry args={[postRadius * 1.2, 8, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}

      {/* 2. Continuous Steel Top Tension Rails */}
      {/* South Top Rail */}
      <mesh position={[0, fenceHeight, -hFacW]} castShadow>
        <boxGeometry args={[facilityLength, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      {/* North Top Rails (West & East sections leaving gate open) */}
      <mesh position={[-(hFacL + 1.4) / 2, fenceHeight, hFacW]} castShadow>
        <boxGeometry args={[hFacL - 1.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      <mesh position={[(hFacL + 1.4) / 2, fenceHeight, hFacW]} castShadow>
        <boxGeometry args={[hFacL - 1.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      {/* Gate Top Archway Header */}
      <mesh position={[0, fenceHeight + 0.2, hFacW]}>
        <boxGeometry args={[2.8, 0.06, 0.06]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>
      {/* West and East Top Rails */}
      <mesh position={[-hFacL, fenceHeight, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[facilityWidth, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      <mesh position={[hFacL, fenceHeight, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[facilityWidth, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>

      {/* 3. Semi-Transparent Chain-Link Wire Mesh Screens */}
      {/* South Mesh Wall */}
      <mesh position={[0, fenceHeight / 2, -hFacW]}>
        <planeGeometry args={[facilityLength, fenceHeight]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.6}
          metalness={0.4}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* North Mesh Walls (flanking entrance gate) */}
      <mesh position={[-(hFacL + 1.4) / 2, fenceHeight / 2, hFacW]}>
        <planeGeometry args={[hFacL - 1.4, fenceHeight]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.6}
          metalness={0.4}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[(hFacL + 1.4) / 2, fenceHeight / 2, hFacW]}>
        <planeGeometry args={[hFacL - 1.4, fenceHeight]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.6}
          metalness={0.4}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* West Mesh Wall */}
      <mesh position={[-hFacL, fenceHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[facilityWidth, fenceHeight]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.6}
          metalness={0.4}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* East Mesh Wall */}
      <mesh position={[hFacL, fenceHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[facilityWidth, fenceHeight]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.6}
          metalness={0.4}
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: 3-TIER SPECTATOR BLEACHERS WITH GALVANIZED TRUSSES
// ----------------------------------------------------------------------
function SpectatorBleachers({ length }: { length: number }) {
  const tiers = [
    { y: 0.35, z: 0.0, seatY: 0.45 },
    { y: 0.70, z: -0.55, seatY: 0.80 },
    { y: 1.05, z: -1.10, seatY: 1.15 },
  ];

  return (
    <group>
      {/* 3 Tier Seating Planks */}
      {tiers.map((t, idx) => (
        <group key={`tier_${idx}`}>
          {/* Footboard / Walkway Plank */}
          <mesh position={[0, t.y, t.z]} castShadow receiveShadow>
            <boxGeometry args={[length, 0.05, 0.5]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Raised Seat Plank */}
          <mesh position={[0, t.seatY, t.z - 0.15]} castShadow receiveShadow>
            <boxGeometry args={[length, 0.06, 0.28]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Structural Steel A-Frame Under-Trusses spaced every 2.4m */}
      {[-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2].map((tx, idx) => (
        <group key={`truss_${idx}`} position={[tx, 0, 0]}>
          <mesh position={[0, 0.6, -0.6]} castShadow>
            <boxGeometry args={[0.08, 1.2, 1.6]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Safety Back Guardrail at rear */}
      <mesh position={[0, 1.8, -1.35]} castShadow>
        <boxGeometry args={[length, 0.06, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      {/* Vertical Guardrail Support Uprights */}
      {[-7.5, -3.75, 0, 3.75, 7.5].map((gx, idx) => (
        <mesh key={`rail_post_${idx}`} position={[gx, 1.45, -1.35]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: TEAM PLAYER BENCHES WITH MOLDED STADIUM SEATS
// ----------------------------------------------------------------------
function TeamBench({ length, label }: { length: number; label: string }) {
  const seatCount = 6;
  const seatStep = length / seatCount;

  return (
    <group>
      {/* Bench Base Frame */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[length, 0.06, 0.45]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      {/* Support Legs */}
      {[-length / 2 + 0.3, 0, length / 2 - 0.3].map((lx, idx) => (
        <mesh key={`bench_leg_${idx}`} position={[lx, 0.11, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.22, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* Individual Molded Stadium Bucket Seats (Royal Blue) */}
      {Array.from({ length: seatCount }).map((_, i) => {
        const sx = -length / 2 + seatStep * (i + 0.5);
        return (
          <group key={`seat_${i}`} position={[sx, 0.28, 0]}>
            {/* Seat bottom cushion */}
            <mesh castShadow>
              <boxGeometry args={[0.42, 0.06, 0.38]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.3} />
            </mesh>
            {/* Ergonomic seat backrest */}
            <mesh position={[0, 0.2, 0.18]} castShadow>
              <boxGeometry args={[0.42, 0.36, 0.05]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: HIGH-MAST NIGHT FLOODLIGHT TOWER
// ----------------------------------------------------------------------
function FloodlightTower({
  position,
  rotationY,
  isNight,
}: {
  position: [number, number, number];
  rotationY: number;
  isNight: boolean;
}) {
  const poleHeight = 8.5;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 1. Flanged Concrete Base Footing */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.38, 0.4, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* 2. Tapered High-Mast Octagonal Steel Column */}
      <mesh position={[0, poleHeight / 2 + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.22, poleHeight, 10]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 3. Top Cross-Arm Mounting Frame */}
      <mesh position={[0, poleHeight + 0.15, 0]} castShadow>
        <boxGeometry args={[1.4, 0.1, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>

      {/* 4. Dual High-Output LED Floodlight Luminaires */}
      {[-0.45, 0.45].map((lx, idx) => (
        <group key={`luminaire_${idx}`} position={[lx, poleHeight + 0.1, 0.15]}>
          {/* Angled Luminaire Housing Box (tilted 40 deg downward towards court) */}
          <group rotation={[0.7, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.5, 0.35, 0.2]} />
              <meshStandardMaterial color="#1e293b" metalness={0.6} />
            </mesh>
            {/* Front Emissive Glass Lens */}
            <mesh position={[0, 0, 0.105]}>
              <planeGeometry args={[0.46, 0.31]} />
              <meshStandardMaterial
                color={isNight ? '#fffdf0' : '#e2e8f0'}
                emissive={isNight ? '#fffdf0' : '#000000'}
                emissiveIntensity={isNight ? 5.0 : 0.0}
                roughness={0.1}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
