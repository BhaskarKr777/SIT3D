'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RouteResult } from '@/types/campus';

interface RouteRibbonProps {
  route: RouteResult | null;
}

export function RouteRibbon({ route }: RouteRibbonProps) {
  const destMarkerRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // Generate 3D curve from path coordinates
  const { curve, startPoint, endPoint } = useMemo(() => {
    if (!route || !route.path || route.path.length < 2) {
      return { curve: null, startPoint: null, endPoint: null };
    }

    const vectors = route.path.map((p) => new THREE.Vector3(p[0], 0.25, p[1]));
    const catmull = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.1);

    return {
      curve: catmull,
      startPoint: vectors[0],
      endPoint: vectors[vectors.length - 1],
    };
  }, [route]);

  // Tube geometry along the 3D curve
  const tubeGeometry = useMemo(() => {
    if (!curve) return null;
    return new THREE.TubeGeometry(curve, Math.max(20, route!.path.length * 8), 0.5, 8, false);
  }, [curve, route]);

  // Animate pulse along the tube and bounce on destination pin
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.35;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.position.y = 1.8 + Math.sin(t * 3) * 0.4;
    }
  });

  if (!route || !tubeGeometry || !startPoint || !endPoint) return null;

  return (
    <group>
      {/* 3D Glowing Walking Tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          ref={materialRef}
          color="#38bdf8" // bright cyan
          emissive="#0284c7"
          emissiveIntensity={0.8}
          roughness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Start Point Marker (Green Beacon) */}
      <group position={[startPoint.x, 0.2, startPoint.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.8, 32]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
          <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} />
        </mesh>
        <Html position={[0, 2.5, 0]} center distanceFactor={80} zIndexRange={[10, 0]}>
          <div className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-emerald-400">
            <span>🟢 Start: {route.originName}</span>
          </div>
        </Html>
      </group>

      {/* Destination Marker (Animated Floating Red Pin) */}
      <group position={[endPoint.x, 0, endPoint.z]}>
        {/* Pulsing ground target ring */}
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.2, 32]} />
          <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
        </mesh>

        <group ref={destMarkerRef} position={[0, 2.0, 0]}>
          {/* Pin Sphere */}
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.8} />
          </mesh>
          {/* Pin Point Cone */}
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.5, 0.9, 16]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>

        <Html position={[0, 4.2, 0]} center distanceFactor={80} zIndexRange={[10, 0]}>
          <div className="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-rose-400 animate-bounce">
            <span>🏁 {route.destinationName}</span>
            <span className="text-[10px] bg-rose-700 px-1 rounded font-normal">
              {route.totalDistance}m ({route.estimatedMinutes} min)
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
}
