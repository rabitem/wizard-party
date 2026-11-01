'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OPPONENT_CARD_MESH } from '../config/layout.config';
import { useCardBackTexture } from '../hooks/useCardBackTexture';
import { AMBIENT_USER_DATA } from './three/frame-scheduling';
import {
  computeOpponentHandLayout,
  getOpponentBackMaterial,
  getOpponentCardGeometries,
  getOpponentEdgeMaterial,
  writeOpponentHandMatrices,
} from './opponent-hand';

interface OpponentHandProps {
  cardCount: number;
  position: [number, number, number];
  rotation: number; // Y rotation to face the table center
}

/**
 * An opponent's face-down fan: two instanced draws (backs and edges, which share one instance
 * matrix buffer) for the whole hand instead of six draws per card. The breathing wobble is
 * written into the instance matrices on rendered frames; the hand is ambient, so it never keeps
 * the table at full frame rate by itself.
 */
export function OpponentHand({ cardCount, position, rotation }: OpponentHandProps) {
  const backsRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);
  const backTexture = useCardBackTexture();
  const { backs, edges } = getOpponentCardGeometries();
  const backMaterial = getOpponentBackMaterial(backTexture);
  const capacity = Math.max(OPPONENT_CARD_MESH.CAPACITY, cardCount);
  const layout = useMemo(() => computeOpponentHandLayout(cardCount), [cardCount]);
  const instanceMatrix = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(capacity * 16), 16).setUsage(THREE.DynamicDrawUsage),
    [capacity],
  );

  // Both meshes draw from the same instance buffer, so the wobble is written and uploaded once.
  // Geometry and material are props, not constructor args: a new card-back theme swaps the
  // material on the same mesh instead of rebuilding it (a rebuilt mesh would lose this buffer).
  useLayoutEffect(() => {
    for (const mesh of [backsRef.current, edgesRef.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix = instanceMatrix;
      mesh.count = layout.length;
    }
  }, [instanceMatrix, layout, capacity]);

  useFrame((state) => {
    writeOpponentHandMatrices(layout, state.clock.elapsedTime, instanceMatrix);
  });

  if (cardCount === 0) return null;

  return (
    <group position={position} rotation={[0, rotation, 0]} userData={AMBIENT_USER_DATA}>
      <instancedMesh
        key={`backs-${capacity}`}
        ref={backsRef}
        args={[undefined, undefined, capacity]}
        geometry={backs}
        material={backMaterial}
        frustumCulled={false}
      />
      <instancedMesh
        key={`edges-${capacity}`}
        ref={edgesRef}
        args={[undefined, undefined, capacity]}
        geometry={edges}
        material={getOpponentEdgeMaterial()}
        frustumCulled={false}
      />
    </group>
  );
}
