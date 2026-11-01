'use client';

import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { usePrefersReducedMotion } from '@/presentation/components/three/themed-environments/primitives/usePrefersReducedMotion';

type PulseMaterial = THREE.Material & { emissiveIntensity?: number };

export interface PulseOptions {
  base: number;
  amplitude: number;
  speed: number;
  /** Animate opacity instead of emissiveIntensity */
  property?: 'emissiveIntensity' | 'opacity';
}

function applyPulse(material: PulseMaterial, property: PulseOptions['property'], value: number): void {
  if (property === 'opacity') material.opacity = value;
  else material.emissiveIntensity = value;
}

/**
 * Gently breathes a material's emissive intensity (or opacity) with two
 * layered sines. Holds the base value when the viewer prefers reduced motion.
 */
export function useSurfacePulse(material: PulseMaterial | undefined, options: PulseOptions): void {
  const reducedMotion = usePrefersReducedMotion();
  const { base, amplitude, speed, property = 'emissiveIntensity' } = options;

  useFrame(({ clock }) => {
    if (!material) return;
    const t = clock.getElapsedTime() * speed;
    const value = reducedMotion ? base : base + amplitude * (0.65 * Math.sin(t) + 0.35 * Math.sin(t * 2.7 + 1.3));
    applyPulse(material, property, value);
  });
}
