'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';

export interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
  duration?: number;
}

interface CameraControllerProps {
  cameraTarget: CameraTarget | null;
  defaultTarget?: [number, number, number];
  enabled?: boolean;
  onTransitionEnd?: () => void;
}

export function CameraController({
  cameraTarget,
  defaultTarget = [8, 7, -8],
  enabled = true,
  onTransitionEnd,
}: CameraControllerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();

  const hasInitializedTargetRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const elapsedRef = useRef(0);
  const durationRef = useRef(1.35);

  const startPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const destPosRef = useRef(new THREE.Vector3());
  const destTargetRef = useRef(new THREE.Vector3());
  const onTransitionEndRef = useRef(onTransitionEnd);
  onTransitionEndRef.current = onTransitionEnd;

  // Cancel scripted camera flight only on real user drag (>5px) or mouse wheel, never on a simple click
  useEffect(() => {
    const dom = gl.domElement;
    let downX = 0;
    let downY = 0;
    let isDown = false;

    const cancelTransition = () => {
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
        if (controlsRef.current) {
          controlsRef.current.enableDamping = true;
        }
        onTransitionEndRef.current?.();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDown = true;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDown || !isTransitioningRef.current) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) {
        cancelTransition();
      }
    };
    const onPointerUp = () => {
      isDown = false;
    };
    const onWheel = () => {
      cancelTransition();
    };

    dom.addEventListener('pointerdown', onPointerDown, { passive: true });
    dom.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    dom.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  // Set initial OrbitControls target once on mount without snapping on subsequent re-renders
  useEffect(() => {
    if (controlsRef.current && !hasInitializedTargetRef.current) {
      controlsRef.current.target.set(...defaultTarget);
      controlsRef.current.update();
      hasInitializedTargetRef.current = true;
    }
  }, [defaultTarget]);

  useEffect(() => {
    if (cameraTarget) {
      startPosRef.current.copy(camera.position);
      if (controlsRef.current) {
        startTargetRef.current.copy(controlsRef.current.target);
        // Disable damping during scripted flight so residual velocity never fights interpolation
        controlsRef.current.enableDamping = false;
      } else {
        startTargetRef.current.set(...defaultTarget);
      }
      destPosRef.current.set(...cameraTarget.position);
      destTargetRef.current.set(...cameraTarget.target);

      const flyDist = startPosRef.current.distanceTo(destPosRef.current);
      const adaptiveDuration = Math.min(1.85, Math.max(0.85, flyDist / 95));
      durationRef.current = cameraTarget.duration ?? adaptiveDuration;
      elapsedRef.current = 0;
      isTransitioningRef.current = true;
    }
  }, [cameraTarget, camera, defaultTarget]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current || !controlsRef.current) return;

    elapsedRef.current += Math.min(delta, 0.05);
    const t = Math.min(1.0, elapsedRef.current / durationRef.current);
    // Quintic smootherstep (zero velocity & zero acceleration at start and end)
    const ease = t * t * t * (t * (t * 6 - 15) + 10);

    camera.position.lerpVectors(startPosRef.current, destPosRef.current, ease);
    controlsRef.current.target.lerpVectors(startTargetRef.current, destTargetRef.current, ease);
    camera.lookAt(controlsRef.current.target);
    controlsRef.current.update();

    if (t >= 1.0) {
      camera.position.copy(destPosRef.current);
      controlsRef.current.target.copy(destTargetRef.current);
      camera.lookAt(controlsRef.current.target);
      controlsRef.current.update();
      controlsRef.current.enableDamping = true;
      isTransitioningRef.current = false;
      onTransitionEndRef.current?.();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enabled}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2.1} // Prevent going below ground level
      minDistance={10}
      maxDistance={380}
      screenSpacePanning
    />
  );
}
