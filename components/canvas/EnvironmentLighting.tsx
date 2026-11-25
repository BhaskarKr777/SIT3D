'use client';

import React from 'react';
import { LightingState } from '@/lib/sunPosition';

interface EnvironmentLightingProps {
  lighting: LightingState;
}

export function EnvironmentLighting({ lighting }: EnvironmentLightingProps) {
  const [sx, sy, sz] = lighting.sunPosition;

  return (
    <>
      {/* Background Color & Fog */}
      <color attach="background" args={[lighting.skyColor]} />
      <fog attach="fog" args={[lighting.fogColor, lighting.isNight ? 180 : 120, lighting.isNight ? 850 : 600]} />

      {/* Main Directional Sun / Moon Light */}
      <directionalLight
        position={[sx, sy, sz]}
        intensity={lighting.sunIntensity}
        color={lighting.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={500}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
        shadow-bias={-0.0004}
      />

      {/* Ambient Lighting */}
      <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />

      {/* Hemispheric Light (Sky vs Ground reflection) */}
      <hemisphereLight
        args={[lighting.skyColor, lighting.groundColor, lighting.ambientIntensity * (lighting.isNight ? 0.95 : 0.8)]}
      />
    </>
  );
}
