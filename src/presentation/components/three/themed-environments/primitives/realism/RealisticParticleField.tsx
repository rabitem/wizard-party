'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import {
  DEVICE_TIER,
  PARTICLE_FIELD,
  PARTICLE_KINDS,
  type DeviceTier,
  type ParticleKind,
} from '@/presentation/config/realism.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useDisposables } from '../useDisposables';
import { useDeviceTier } from './device-tier';
import { buildParticleBuffers, particleCountForTier } from './particle-buffers';
import { createParticleGeometry, createParticleMaterial, type ParticleUniforms } from './particle-material';
import { shaderUniforms } from './shader-uniforms';
import { advanceWind, gustEnvelope } from './wind';

/** Box the particles live in: floor-plane centre, half extents in x/z, vertical range. */
export interface ParticleVolume {
  center: Vec3;
  halfSize: readonly [number, number];
  bottom: number;
  top: number;
}

export interface RealisticParticleFieldProps {
  kind: ParticleKind;
  volume: ParticleVolume;
  /** Base count on a high-tier device (defaults to the kind preset); scaled by tier + reduced motion */
  count?: number;
  colors?: readonly string[];
  /** Multiplies every particle's size */
  sizeScale?: number;
  opacity?: number;
  fallSpeed?: number;
  sway?: number;
  turbulence?: number;
  wind?: readonly [number, number, number];
  /** Gust strength 0..1 */
  gust?: number;
  seed?: number;
  /** Fade particles inside this world radius around clearCenter (keeps the table readable); 0 disables */
  clearRadius?: number;
  clearCenter?: readonly [number, number];
  /** Override the detected device tier */
  tier?: DeviceTier;
  renderOrder?: number;
}

/**
 * GPU particle field (snow, rain, leaves, petals, embers, dust, fireflies,
 * pollen): one THREE.Points draw call, all motion in the vertex shader, the
 * CPU only advances time, wind and gust uniforms. Reduced-motion users get a
 * sparse, frozen field.
 */
export function RealisticParticleField({
  kind,
  volume,
  count,
  colors,
  sizeScale = 1,
  opacity = 1,
  fallSpeed,
  sway,
  turbulence,
  wind,
  gust,
  seed = 1,
  clearRadius = PARTICLE_FIELD.TABLE_CLEAR_RADIUS,
  clearCenter = [0, 0],
  tier: tierOverride,
  renderOrder = 0,
}: RealisticParticleFieldProps) {
  const preset = PARTICLE_KINDS[kind];
  const detectedTier = useDeviceTier();
  const tier = tierOverride ?? detectedTier;
  const reducedMotion = usePrefersReducedMotion();
  const total = particleCountForTier(count ?? preset.baseCount, tier, reducedMotion, preset.maxCount);
  const palette = colors ?? preset.colors;
  const paletteKey = palette.join('|');

  const resources = useMemo(() => {
    const buffers = buildParticleBuffers(total, preset.layers, seed);
    return {
      geometry: createParticleGeometry(buffers, paletteKey.split('|')),
      material: createParticleMaterial(preset),
    };
  }, [total, preset, seed, paletteKey]);
  useDisposables(resources);

  const windRef = useRef(wind ?? preset.wind);
  const gustRef = useRef(gust ?? preset.gust);
  useEffect(() => {
    windRef.current = wind ?? preset.wind;
    gustRef.current = gust ?? preset.gust;
  }, [wind, gust, preset]);

  const [cx, , cz] = volume.center;
  const [hx, hz] = volume.halfSize;
  const height = volume.top - volume.bottom;
  const [clearX, clearZ] = clearCenter;

  const pointsRef = useRef<THREE.Points>(null);

  useLayoutEffect(() => {
    const u = shaderUniforms<ParticleUniforms>(pointsRef.current);
    if (!u) return;
    u.uBoxSize.value.set(hx * 2, height, hz * 2);
    u.uFallSpeed.value = fallSpeed ?? preset.fallSpeed;
    u.uSway.value = sway ?? preset.sway;
    u.uTurbulence.value = turbulence ?? preset.turbulence;
    u.uClearCenter.value.set(clearX, clearZ);
    u.uClearRadius.value = clearRadius;
    u.uSizeScale.value = sizeScale;
    u.uOpacity.value = opacity;
    if (reducedMotion) {
      u.uTime.value = PARTICLE_FIELD.FROZEN_TIME;
      u.uGust.value = 0;
    }
  }, [resources, hx, hz, height, fallSpeed, sway, turbulence, clearX, clearZ, clearRadius, sizeScale, opacity, reducedMotion, preset]);

  useFrame((state, delta) => {
    const u = shaderUniforms<ParticleUniforms>(pointsRef.current);
    if (!u) return;
    const dpr = state.viewport.dpr;
    u.uViewportHeight.value = state.size.height * dpr;
    u.uMaxPointSize.value = DEVICE_TIER.MAX_POINT_SIZE[tier] * dpr;
    if (reducedMotion) return;
    const time = state.clock.getElapsedTime();
    const gustNow = gustEnvelope(time, seed) * gustRef.current;
    const step = Math.min(delta, 0.1);
    advanceWind(u.uWindOffset.value, windRef.current, gustNow, step);
    u.uTime.value = time;
    u.uGust.value = gustNow;
    const w = windRef.current;
    const boost = 1 + gustNow * 1.5;
    u.uVelocity.value.set(w[0] * boost, -u.uFallSpeed.value, w[2] * boost);
  });

  if (total === 0) return null;
  return (
    <points
      ref={pointsRef}
      position={[cx, volume.bottom, cz]}
      geometry={resources.geometry}
      material={resources.material}
      frustumCulled={false}
      renderOrder={renderOrder}
    />
  );
}
