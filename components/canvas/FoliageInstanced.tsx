'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { TreeInstance } from '@/types/campus';

interface FoliageInstancedProps {
  trees: TreeInstance[];
  selectedTreeId?: string | null;
  isEditMode?: boolean;
  transformMode?: 'translate' | 'rotate' | 'scale' | null;
  onSelectTree?: (treeId: string) => void;
  onUpdateTree?: (treeId: string, updated: TreeInstance) => void;
  onTransformDraggingChanged?: (isDragging: boolean) => void;
}

export function FoliageInstanced({
  trees,
  selectedTreeId = null,
  isEditMode = false,
  transformMode = 'translate',
  onSelectTree,
  onUpdateTree,
  onTransformDraggingChanged,
}: FoliageInstancedProps) {
  // Shared realistic geometries & materials for smooth campus-wide rendering
  const assets = useMemo(() => {
    return {
      trunkMainGeo: new THREE.CylinderGeometry(0.16, 0.34, 2.8, 8),
      trunkTallGeo: new THREE.CylinderGeometry(0.12, 0.25, 4.2, 8),
      branchGeo: new THREE.CylinderGeometry(0.06, 0.12, 1.5, 6),
      canopyLargeGeo: new THREE.IcosahedronGeometry(1.55, 1),
      canopyMedGeo: new THREE.DodecahedronGeometry(1.15, 1),
      canopySmallGeo: new THREE.DodecahedronGeometry(0.85, 1),
      blossomGeo: new THREE.DodecahedronGeometry(0.55, 0),
      trunkMat: new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.92 }),
      palmTrunkMat: new THREE.MeshStandardMaterial({ color: '#6b4c35', roughness: 0.9 }),
      foliageDeepMat: new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.82 }),
      foliageMidMat: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.78 }),
      foliageLightMat: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.75 }),
      blossomMat: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.7 }),
      selectedMat: new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: '#f59e0b',
        emissiveIntensity: 0.35,
        roughness: 0.6,
      }),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(assets).forEach((resource) => {
        resource.dispose();
      });
    };
  }, [assets]);

  if (!trees.length) return null;

  return (
    <group>
      {trees.map((tree, idx) => {
        const treeId = tree.id || `tree-${idx}`;
        const isSelected = selectedTreeId === treeId;

        return (
          <InteractiveTree
            key={treeId}
            tree={tree}
            treeId={treeId}
            idx={idx}
            isSelected={isSelected}
            isEditMode={isEditMode}
            transformMode={transformMode}
            assets={assets}
            onSelect={() => onSelectTree?.(treeId)}
            onUpdate={(updated) => onUpdateTree?.(treeId, updated)}
            onTransformDraggingChanged={onTransformDraggingChanged}
          />
        );
      })}
    </group>
  );
}

interface TreeAssets {
  trunkMainGeo: THREE.BufferGeometry;
  trunkTallGeo: THREE.BufferGeometry;
  branchGeo: THREE.BufferGeometry;
  canopyLargeGeo: THREE.BufferGeometry;
  canopyMedGeo: THREE.BufferGeometry;
  canopySmallGeo: THREE.BufferGeometry;
  blossomGeo: THREE.BufferGeometry;
  trunkMat: THREE.Material;
  palmTrunkMat: THREE.Material;
  foliageDeepMat: THREE.Material;
  foliageMidMat: THREE.Material;
  foliageLightMat: THREE.Material;
  blossomMat: THREE.Material;
  selectedMat: THREE.Material;
}

function InteractiveTree({
  tree,
  treeId,
  idx,
  isSelected,
  isEditMode,
  transformMode,
  assets,
  onSelect,
  onUpdate,
  onTransformDraggingChanged,
}: {
  tree: TreeInstance;
  treeId: string;
  idx: number;
  isSelected: boolean;
  isEditMode: boolean;
  transformMode: 'translate' | 'rotate' | 'scale' | null;
  assets: TreeAssets;
  onSelect: () => void;
  onUpdate: (updated: TreeInstance) => void;
  onTransformDraggingChanged?: (isDragging: boolean) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const [x, y, z] = tree.position;
  const s = tree.scale;
  const rotY = (idx * 1.13) % (Math.PI * 2);
  // 4 distinct natural tree varieties + realistic Coconut Palm (type === 4)
  const variety = tree.type === 4 ? 4 : (tree.type + idx) % 4;

  const matA = isSelected ? assets.selectedMat : assets.foliageDeepMat;
  const matB = isSelected ? assets.selectedMat : assets.foliageMidMat;
  const matC = isSelected ? assets.selectedMat : assets.foliageLightMat;

  return (
    <>
      <group
        ref={groupRef}
        position={[x, y, z]}
        scale={[s, s, s]}
        rotation={[0, rotY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {variety === 4 ? (
          /* Variety 4: Realistic Tropical Coconut Palm Tree */
          <group>
            {/* Slightly Curved Segmented Coconut Trunk */}
            <mesh position={[0, 1.3, 0]} rotation={[0.04, 0, 0.03]} castShadow receiveShadow>
              <cylinderGeometry args={[0.16, 0.24, 2.6, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[0.08, 3.7, 0.09]} rotation={[0.07, 0, -0.04]} castShadow receiveShadow>
              <cylinderGeometry args={[0.11, 0.16, 2.5, 8]} />
              <meshStandardMaterial color="#6b4c35" roughness={0.9} />
            </mesh>
            {/* Cluster of Coconuts at Crown Base */}
            {[0, 2.1, 4.2].map((ca, cIdx) => (
              <mesh key={`coco_${cIdx}`} position={[0.06 + Math.cos(ca) * 0.2, 4.82, 0.14 + Math.sin(ca) * 0.2]} castShadow>
                <sphereGeometry args={[0.14, 8, 8]} />
                <meshStandardMaterial color="#65a30d" roughness={0.7} />
              </mesh>
            ))}
            {/* Radiating Arching Coconut Palm Fronds */}
            {Array.from({ length: 9 }).map((_, fIdx) => {
              const fa = (fIdx / 9) * Math.PI * 2;
              const droop = fIdx % 2 === 0 ? 0.45 : 0.22;
              return (
                <group key={`frond_${fIdx}`} position={[0.06, 5.0, 0.14]} rotation={[0, fa, 0]}>
                  <mesh position={[0.95, 0.05 - droop * 0.45, 0]} rotation={[0, 0, -droop]} castShadow>
                    <boxGeometry args={[2.0, 0.06, 0.42]} />
                    <meshStandardMaterial color={fIdx % 2 === 0 ? '#16a34a' : '#15803d'} roughness={0.75} />
                  </mesh>
                  <mesh position={[1.95, -0.22 - droop * 0.7, 0]} rotation={[0, 0, -droop - 0.35]} castShadow>
                    <boxGeometry args={[0.85, 0.05, 0.26]} />
                    <meshStandardMaterial color="#15803d" roughness={0.75} />
                  </mesh>
                </group>
              );
            })}
          </group>
        ) : variety === 1 ? (
          /* Variety 1: Tall Royal Palm / Ashoka-style Tree */
          <group>
            <mesh position={[0, 2.0, 0]} geometry={assets.trunkTallGeo} material={assets.palmTrunkMat} castShadow receiveShadow />
            <mesh position={[0, 4.3, 0]} scale={[1.2, 0.55, 1.2]} geometry={assets.canopyLargeGeo} material={matB} castShadow />
            <mesh position={[0.75, 4.05, 0.35]} scale={[0.9, 0.45, 0.9]} geometry={assets.canopyMedGeo} material={matC} castShadow />
            <mesh position={[-0.75, 4.05, -0.35]} scale={[0.9, 0.45, 0.9]} geometry={assets.canopyMedGeo} material={matA} castShadow />
            <mesh position={[0, 4.75, 0]} scale={[0.85, 0.65, 0.85]} geometry={assets.canopySmallGeo} material={matC} castShadow />
          </group>
        ) : variety === 2 ? (
          /* Variety 2: Flowering Gulmohar / Campus Ornamental Tree */
          <group>
            <mesh position={[0, 1.35, 0]} geometry={assets.trunkMainGeo} material={assets.trunkMat} castShadow receiveShadow />
            <mesh position={[0.45, 2.4, 0.2]} rotation={[0.2, 0, -0.55]} geometry={assets.branchGeo} material={assets.trunkMat} castShadow />
            <mesh position={[-0.45, 2.35, -0.2]} rotation={[-0.2, 0, 0.55]} geometry={assets.branchGeo} material={assets.trunkMat} castShadow />
            <mesh position={[0, 3.6, 0]} scale={[1.25, 0.85, 1.25]} geometry={assets.canopyLargeGeo} material={matB} castShadow receiveShadow />
            <mesh position={[1.0, 3.2, 0.5]} geometry={assets.canopyMedGeo} material={matC} castShadow />
            <mesh position={[-0.95, 3.3, -0.45]} geometry={assets.canopyMedGeo} material={matA} castShadow />
            {/* Subtle warm blossom clusters */}
            <mesh position={[0.6, 3.9, 0.8]} geometry={assets.blossomGeo} material={assets.blossomMat} castShadow />
            <mesh position={[-0.7, 3.7, 0.6]} geometry={assets.blossomGeo} material={assets.blossomMat} castShadow />
          </group>
        ) : variety === 3 ? (
          /* Variety 3: Dense Rounded Mango / Rain Tree */
          <group>
            <mesh position={[0, 1.3, 0]} geometry={assets.trunkMainGeo} material={assets.trunkMat} castShadow receiveShadow />
            <mesh position={[0, 3.4, 0]} scale={[1.35, 1.1, 1.35]} geometry={assets.canopyLargeGeo} material={matA} castShadow receiveShadow />
            <mesh position={[0.9, 3.0, 0.4]} geometry={assets.canopyMedGeo} material={matB} castShadow />
            <mesh position={[-0.85, 3.1, -0.5]} geometry={assets.canopyMedGeo} material={matB} castShadow />
            <mesh position={[0.2, 4.35, 0.1]} geometry={assets.canopySmallGeo} material={matC} castShadow />
          </group>
        ) : (
          /* Variety 0: Broad Canopy Neem / Banyan-style Tree */
          <group>
            <mesh position={[0, 1.35, 0]} geometry={assets.trunkMainGeo} material={assets.trunkMat} castShadow receiveShadow />
            <mesh position={[0.4, 2.3, 0]} rotation={[0, 0, -0.5]} geometry={assets.branchGeo} material={assets.trunkMat} castShadow />
            <mesh position={[-0.4, 2.35, 0.2]} rotation={[0.2, 0, 0.5]} geometry={assets.branchGeo} material={assets.trunkMat} castShadow />
            <mesh position={[0, 3.65, 0]} scale={[1.2, 1.0, 1.2]} geometry={assets.canopyLargeGeo} material={matB} castShadow receiveShadow />
            <mesh position={[0.95, 3.25, 0.3]} geometry={assets.canopyMedGeo} material={matC} castShadow />
            <mesh position={[-0.9, 3.3, -0.35]} geometry={assets.canopyMedGeo} material={matA} castShadow />
            <mesh position={[0.1, 3.4, 0.95]} geometry={assets.canopySmallGeo} material={matC} castShadow />
          </group>
        )}

        {/* Ground Selection / Hover Ring */}
        {(isSelected || hovered) && (
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.6, 2.1, 24]} />
            <meshBasicMaterial
              color={isSelected ? '#f59e0b' : '#38bdf8'}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Circular Stone & Rock Sitting Area Around Landmark Big Trees */}
        {(treeId === 'big-tree-1' || treeId === 'big-tree-2') && (
          <group scale={[1 / s, 1 / s, 1 / s]}>
            <TreeRockSittingArea />
          </group>
        )}
      </group>

      {/* Transform Gizmo when tree is selected in Edit Mode */}
      {isSelected && isEditMode && transformMode && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode === 'rotate' ? 'translate' : transformMode}
          onMouseDown={() => onTransformDraggingChanged?.(true)}
          onMouseUp={() => onTransformDraggingChanged?.(false)}
          onObjectChange={() => {
            if (groupRef.current) {
              const p = groupRef.current.position;
              const sc = groupRef.current.scale;
              onUpdate({
                ...tree,
                id: treeId,
                position: [
                  parseFloat(p.x.toFixed(2)),
                  parseFloat(p.y.toFixed(2)),
                  parseFloat(p.z.toFixed(2)),
                ],
                scale: parseFloat(Math.max(0.3, sc.x).toFixed(2)),
              });
            }
          }}
        />
      )}
    </>
  );
}

/**
 * Circular rockery planter & curved stone/timber sitting benches surrounding each big tree.
 */
function TreeRockSittingArea() {
  const numRocks = 18;
  const rockRadius = 2.45;
  const benchAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Circular Stone-Paved Walkway Apron */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[4.4, 4.55, 0.08, 24]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.85} />
      </mesh>

      {/* 2. Raised Soil & Mulch Planter Bed Inside the Rock Ring */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.5, 0.24, 18]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </mesh>

      {/* 3. Natural Rockery Border Ring Covering the Tree Base */}
      {Array.from({ length: numRocks }).map((_, i) => {
        const a = (i / numRocks) * Math.PI * 2;
        const rx = Math.cos(a) * rockRadius;
        const rz = Math.sin(a) * rockRadius;
        const rScale = 0.42 + ((i * 7) % 5) * 0.08;
        const rockColor = i % 3 === 0 ? '#64748b' : i % 3 === 1 ? '#78716c' : '#57534e';
        return (
          <mesh
            key={`tree_rock_${i}`}
            position={[rx, 0.24, rz]}
            scale={[rScale * 1.25, rScale * 0.85, rScale]}
            rotation={[0, a + i * 0.5, 0]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[0.75, 0]} />
            <meshStandardMaterial color={rockColor} roughness={0.92} />
          </mesh>
        );
      })}

      {/* 4. Four Curved/Segmented Stone & Timber Sitting Benches Around the Rock Ring */}
      {benchAngles.map((ang, idx) => (
        <group key={`tree_bench_${idx}`} rotation={[0, ang, 0]}>
          <group position={[0, 0.06, 3.35]}>
            {/* Stone Bench Supports */}
            <mesh position={[-0.95, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.28, 0.4, 0.52]} />
              <meshStandardMaterial color="#64748b" roughness={0.85} />
            </mesh>
            <mesh position={[0.95, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.28, 0.4, 0.52]} />
              <meshStandardMaterial color="#64748b" roughness={0.85} />
            </mesh>
            {/* Timber Slatted Seat Top */}
            <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.35, 0.08, 0.58]} />
              <meshStandardMaterial color="#b45309" roughness={0.65} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
