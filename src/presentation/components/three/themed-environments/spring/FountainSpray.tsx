'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEVICE_TIER, PARTICLE_FIELD } from '@/presentation/config/realism.config';
import { SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { seededRandom, useDeviceTier, useDisposables, usePrefersReducedMotion } from '../primitives';
import { particleCountForTier, shaderUniforms } from '../primitives/realism';
import { SPRAY_FRAGMENT_SHADER, SPRAY_VERTEX_SHADER } from './spray-shaders';

const GRAVITY = 6;
const DROPLET_SIZE = 0.035;
const DROPLET_OPACITY = 0.8;
const MAX_COUNT = 180;
/** Share of droplets per emitter: jet, rim drips, basin splashes */
const EMITTER_SHARES = [0.4, 0.4, 0.2] as const;

export interface FountainSprayProps {
  /** Local y the jet leaves the top bowl */
  jetY: number;
  /** Bowl rim radius and height (drips fall from here) */
  rimRadius: number;
  rimY: number;
  /** Basin water level and where splashes land */
  basinY: number;
  splashRadius: number;
}

function createSprayGeometry(count: number): THREE.BufferGeometry {
  const rand = seededRandom(131);
  const seeds = new Float32Array(count * 4);
  const kinds = new Float32Array(count);
  let index = 0;
  EMITTER_SHARES.forEach((share, kind) => {
    const n = kind === EMITTER_SHARES.length - 1 ? count - index : Math.round(count * share);
    for (let i = 0; i < n && index < count; i++, index++) {
      seeds.set([rand(), rand(), rand(), rand()], index * 4);
      kinds[index] = kind;
    }
  });
  const geometry = new THREE.BufferGeometry();
  // Positions are computed in the shader; the attribute only sets the vertex count.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
  return geometry;
}

/**
 * Splash droplets for the tiered fountain: one THREE.Points draw call, every
 * arc computed in the vertex shader (no per-droplet JS). Count scales with
 * the device tier; reduced motion shows a sparse, frozen spray.
 */
export function FountainSpray({ jetY, rimRadius, rimY, basinY, splashRadius }: FountainSprayProps) {
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const count = particleCountForTier(SPRING_REALISM.SPRAY_COUNT, tier, reducedMotion, MAX_COUNT);
  const pointsRef = useRef<THREE.Points>(null);

  const resources = useMemo(
    () => ({
      geometry: createSprayGeometry(count),
      material: new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: { value: PARTICLE_FIELD.FROZEN_TIME },
          uGravity: { value: GRAVITY },
          uJetY: { value: 0 },
          uRim: { value: new THREE.Vector2() },
          uBasinY: { value: 0 },
          uSplashRadius: { value: 0 },
          uSize: { value: DROPLET_SIZE },
          uViewportHeight: { value: 800 },
          uMaxPointSize: { value: 24 },
          uColor: { value: new THREE.Color(SPRING_REALISM.SPRAY_COLOR) },
          uOpacity: { value: DROPLET_OPACITY },
        },
        vertexShader: SPRAY_VERTEX_SHADER,
        fragmentShader: SPRAY_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    }),
    [count],
  );
  useDisposables(resources);

  useLayoutEffect(() => {
    const u = shaderUniforms(pointsRef.current);
    if (!u) return;
    u.uJetY.value = jetY;
    u.uRim.value.set(rimRadius, rimY);
    u.uBasinY.value = basinY;
    u.uSplashRadius.value = splashRadius;
  }, [resources, jetY, rimRadius, rimY, basinY, splashRadius]);

  useFrame((state) => {
    const u = shaderUniforms(pointsRef.current);
    if (!u) return;
    const dpr = state.viewport.dpr;
    u.uViewportHeight.value = state.size.height * dpr;
    u.uMaxPointSize.value = DEVICE_TIER.MAX_POINT_SIZE[tier] * dpr * 0.5;
    if (!reducedMotion) u.uTime.value = state.clock.getElapsedTime();
  });

  if (count === 0) return null;
  return <points ref={pointsRef} geometry={resources.geometry} material={resources.material} frustumCulled={false} renderOrder={3} />;
}
