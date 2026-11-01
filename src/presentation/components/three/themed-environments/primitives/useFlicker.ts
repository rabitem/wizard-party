'use client';

import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { ENVIRONMENT_EFFECTS } from '@/presentation/config/themed-environment.config';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type FlickerMaterial = THREE.Material & { emissiveIntensity?: number; opacity: number };

export interface FlickerTarget {
  /** Material whose emissiveIntensity (or opacity, for sprites) flickers */
  material?: FlickerMaterial | null;
  /** Light whose intensity flickers */
  light?: RefObject<THREE.PointLight | null>;
  base: number;
  amplitude?: number;
  /** Phase offset so neighbouring flames do not pulse in sync */
  phase?: number;
  /** Animate opacity instead of emissiveIntensity */
  useOpacity?: boolean;
}

/** Layered sines read as an organic flame flicker without per-frame randomness. */
export function flickerValue(time: number, phase: number): number {
  const speed = ENVIRONMENT_EFFECTS.FLICKER_SPEED;
  return (
    Math.sin(time * speed + phase) * 0.5 +
    Math.sin(time * speed * 2.3 + phase * 1.7) * 0.3 +
    Math.sin(time * speed * 5.1 + phase * 0.6) * 0.2
  );
}

function apply(target: FlickerTarget, value: number) {
  if (target.material) {
    if (target.useOpacity) target.material.opacity = value;
    else if (target.material.emissiveIntensity !== undefined) target.material.emissiveIntensity = value;
  }
  if (target.light?.current) target.light.current.intensity = value;
}

/**
 * Drives every flame/glow of an environment from one frame callback.
 * With reduced motion the targets stay at their base value.
 */
export function useFlicker(targets: readonly FlickerTarget[]): void {
  const reducedMotion = usePrefersReducedMotion();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    for (const target of targets) {
      const amplitude = target.amplitude ?? ENVIRONMENT_EFFECTS.FLICKER_AMPLITUDE;
      const wobble = reducedMotion ? 0 : flickerValue(time, target.phase ?? 0);
      apply(target, target.base * (1 + amplitude * wobble));
    }
  });
}
