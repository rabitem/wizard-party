'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_REALISM, NEON_ROOF_UNITS } from '@/presentation/config/neon-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { seededRandom, useDisposables, usePrefersReducedMotion } from '../primitives';
import { getFogNoiseTexture, shaderUniforms, useDeviceTier } from '../primitives/realism';
import { STEAM_FRAGMENT_SHADER, STEAM_VERTEX_SHADER } from './neon-shaders';

const { STEAM } = NEON_REALISM;
/** Frozen moment shown with reduced motion (plumes mid-rise) */
const FROZEN_TIME = 2.3;
const VENT_LIFT = 0.12;
const STEAM_SEED = 404;

/** One quad per puff, instanced across every vent (a single draw call). */
function createSteamGeometry(puffsPerVent: number): THREE.InstancedBufferGeometry {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.setAttribute('uv', quad.getAttribute('uv'));

  const count = STEAM.UNITS.length * puffsPerVent;
  const origins = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 2);
  const rand = seededRandom(STEAM_SEED);
  STEAM.UNITS.forEach((unitIndex, vent) => {
    const [x, z, , h] = NEON_ROOF_UNITS[unitIndex];
    for (let i = 0; i < puffsPerVent; i++) {
      const k = vent * puffsPerVent + i;
      origins.set([x + (rand() - 0.5) * 0.25, ENVIRONMENT_ROOM.FLOOR_Y + h + VENT_LIFT, z + (rand() - 0.5) * 0.25], k * 3);
      // Evenly staggered ages keep each plume continuous
      seeds.set([(i + rand() * 0.5) / puffsPerVent, rand()], k * 2);
    }
  });
  geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origins, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 2));
  geometry.instanceCount = count;
  return geometry;
}

/**
 * Steam curling up from the lit roof vents: soft camera-facing puffs that
 * rise, widen and fade, animated entirely in the vertex shader. Puff count
 * follows the device tier; frozen for reduced motion.
 */
export function SteamVents() {
  const reducedMotion = usePrefersReducedMotion();
  const tier = useDeviceTier();
  const ref = useRef<THREE.Mesh>(null);
  const assets = useMemo(
    () => ({
      geometry: createSteamGeometry(STEAM.PUFFS_PER_VENT[tier]),
      material: new THREE.ShaderMaterial({
        vertexShader: STEAM_VERTEX_SHADER,
        fragmentShader: STEAM_FRAGMENT_SHADER,
        uniforms: {
          uTime: { value: FROZEN_TIME },
          uLifetime: { value: STEAM.LIFETIME },
          uRise: { value: STEAM.RISE },
          uSize: { value: new THREE.Vector2(...STEAM.SIZE) },
          uDrift: { value: new THREE.Vector2(...STEAM.DRIFT) },
          uNoise: { value: getFogNoiseTexture() },
          uColor: { value: new THREE.Color(STEAM.COLOR) },
          uOpacity: { value: STEAM.OPACITY },
        },
        transparent: true,
        depthWrite: false,
      }),
    }),
    [tier],
  );
  useDisposables(assets);

  useFrame(({ clock }) => {
    const u = shaderUniforms(ref.current);
    if (u && !reducedMotion) u.uTime.value = clock.getElapsedTime();
  });

  return <mesh ref={ref} geometry={assets.geometry} material={assets.material} frustumCulled={false} renderOrder={2} />;
}
