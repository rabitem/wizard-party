'use client';

import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { NEON_REALISM } from '@/presentation/config/neon-environment.config';
import { usePrefersReducedMotion } from '../primitives';

const { STUTTER } = NEON_REALISM;

export interface StutterTarget {
  material: THREE.Material;
  /** Opacity while the tube is lit */
  base: number;
  phase: number;
}

/**
 * Brightness of a failing neon tube (0..1): steadily lit most of the time,
 * then a short burst of hard on/off chatter like a dying ballast.
 * Pure so it can be unit tested.
 */
export function neonStutterLevel(time: number, phase: number): number {
  const cycle = (time * STUTTER.SPEED + phase * 0.37) % 1;
  if (cycle < 1 - STUTTER.SHARE) return 1;
  const chatter = Math.sin(time * 47 + phase * 13) * Math.sin(time * 23.3 + phase * 5);
  return chatter > -0.15 ? 1 : STUTTER.OFF_LEVEL;
}

function apply(target: StutterTarget, level: number): void {
  target.material.opacity = target.base * level;
}

/** Drives every faulty tube from one frame callback; steady with reduced motion. */
export function useNeonStutter(targets: readonly StutterTarget[]): void {
  const reducedMotion = usePrefersReducedMotion();
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    for (const target of targets) {
      const level = reducedMotion ? 1 : neonStutterLevel(time, target.phase);
      apply(target, level);
    }
  });
}
