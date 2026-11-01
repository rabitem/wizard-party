'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAND_FX_TIMING } from './land-fx.constants';
import { createRng, seedFromPosition } from './land-fx-selection';
import type { LandFxRecipe } from './layers/types';

interface LayeredLandEffectProps {
  recipe: LandFxRecipe;
  position: [number, number, number];
  active: boolean;
  onComplete?: () => void;
}

interface BurstState {
  wasActive: boolean;
  running: boolean;
  t: number;
}

/**
 * Plays a recipe's layers at the landing point on each rising edge of
 * `active`. Layers are built once per mount and re-armed per landing.
 */
export function LayeredLandEffect({ recipe, position, active, onComplete }: LayeredLandEffectProps) {
  const layers = useMemo(() => recipe.createLayers(), [recipe]);
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef<BurstState>({ wasActive: false, running: false, t: 0 });
  const positionRef = useRef(position);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    positionRef.current = position;
    onCompleteRef.current = onComplete;
  });

  useEffect(() => () => layers.forEach((layer) => layer.dispose()), [layers]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const s = stateRef.current;
    if (!group) return;
    if (active && !s.wasActive) {
      s.wasActive = true;
      s.running = true;
      s.t = 0;
      const rand = createRng(seedFromPosition(positionRef.current));
      for (const layer of layers) layer.reset(rand);
      group.visible = true;
    }
    if (!active) s.wasActive = false;
    if (!s.running) return;

    const dt = Math.min(delta, LAND_FX_TIMING.MAX_DT);
    s.t += dt;
    if (s.t >= recipe.duration) {
      s.running = false;
      group.visible = false;
      onCompleteRef.current?.();
      return;
    }
    for (const layer of layers) layer.update(s.t, dt);
  });

  return (
    <group ref={groupRef} position={position} visible={false}>
      {layers.map((layer) => (
        <primitive key={layer.object.uuid} object={layer.object} />
      ))}
    </group>
  );
}
