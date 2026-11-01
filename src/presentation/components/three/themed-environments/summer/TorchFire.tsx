'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUMMER_TORCH_FIRE } from '@/presentation/config/summer-environment.config';
import { DEVICE_TIER } from '@/presentation/config/realism.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, seededRandom, useDisposables, usePrefersReducedMotion, type PropPlacement } from '../primitives';
import { getParticleSprite, shaderUniforms, useDeviceTier } from '../primitives/realism';
import { EMBER_FRAGMENT_SHADER, EMBER_VERTEX_SHADER, FLAME_FRAGMENT_SHADER, FLAME_VERTEX_SHADER } from './torch-fire-shaders';

/** Reduced motion: a fixed flame shape */
const FROZEN_TIME = 5;
const color = (hex: string) => new THREE.Color(hex);

interface TorchFlamesProps {
  placements: readonly PropPlacement[];
  /** Local offset from each torch base to the flame base */
  offset: THREE.Matrix4;
}

/** One instanced draw call of noise-shaped, camera-facing flames (static shape with reduced motion). */
export function TorchFlames({ placements, offset }: TorchFlamesProps) {
  const reducedMotion = usePrefersReducedMotion();
  const groupRef = useRef<THREE.Group>(null);
  const resources = useMemo(() => {
    const [width, height] = SUMMER_TORCH_FIRE.FLAME_SIZE;
    const geometry = new THREE.PlaneGeometry(width, height);
    geometry.translate(0, height / 2, 0);
    return {
      geometry,
      material: new THREE.ShaderMaterial({
        uniforms: {
          uCore: { value: color(SUMMER_TORCH_FIRE.CORE) },
          uMid: { value: color(SUMMER_TORCH_FIRE.MID) },
          uEdge: { value: color(SUMMER_TORCH_FIRE.EDGE) },
          uIntensity: { value: SUMMER_TORCH_FIRE.INTENSITY },
          uTime: { value: FROZEN_TIME },
        },
        vertexShader: FLAME_VERTEX_SHADER,
        fragmentShader: FLAME_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    };
  }, []);
  useDisposables(resources);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const mesh = groupRef.current?.children[0];
    const uniforms = shaderUniforms(mesh);
    if (uniforms) uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group ref={groupRef}>
      <InstancedProp geometry={resources.geometry} material={resources.material} placements={placements} offset={offset} />
    </group>
  );
}

/** Ember spawn points (world flame tips) and four randoms per ember. */
function buildEmberGeometry(origins: readonly Vec3[], perTorch: number): THREE.BufferGeometry {
  const rand = seededRandom(97);
  const count = origins.length * perTorch;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  origins.forEach((origin, t) => {
    for (let e = 0; e < perTorch; e++) {
      const i = t * perTorch + e;
      positions.set([origin[0] + (rand() - 0.5) * 0.08, origin[1], origin[2] + (rand() - 0.5) * 0.08], i * 3);
      seeds.set([rand(), rand(), rand(), rand()], i * 4);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  return geometry;
}

interface TorchEmbersProps {
  /** World positions the embers rise from (flame tips) */
  origins: readonly Vec3[];
}

/**
 * Sparks rising from every torch in one THREE.Points draw call: lifetime,
 * drift, cooling and fade all run in the vertex shader. Count scales with
 * the device tier; hidden entirely with reduced motion.
 */
export function TorchEmbers({ origins }: TorchEmbersProps) {
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const perTorch = Math.max(1, Math.round(SUMMER_TORCH_FIRE.EMBERS_PER_TORCH * DEVICE_TIER.PARTICLE_MULTIPLIER[tier]));
  const pointsRef = useRef<THREE.Points>(null);

  const resources = useMemo(
    () => ({
      geometry: buildEmberGeometry(origins, perTorch),
      material: new THREE.ShaderMaterial({
        uniforms: {
          uSprite: { value: getParticleSprite('glow') },
          uHot: { value: color(SUMMER_TORCH_FIRE.EMBER_HOT) },
          uCool: { value: color(SUMMER_TORCH_FIRE.EMBER_COOL) },
          uTime: { value: 0 },
          uRise: { value: SUMMER_TORCH_FIRE.EMBER_RISE },
          uRate: { value: SUMMER_TORCH_FIRE.EMBER_RATE },
          uSize: { value: SUMMER_TORCH_FIRE.EMBER_SIZE },
          uViewportHeight: { value: 1 },
          uMaxPointSize: { value: DEVICE_TIER.MAX_POINT_SIZE[tier] },
        },
        vertexShader: EMBER_VERTEX_SHADER,
        fragmentShader: EMBER_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [origins, perTorch, tier],
  );
  useDisposables(resources);

  useLayoutEffect(() => {
    pointsRef.current?.geometry.computeBoundingSphere();
  }, [resources]);

  useFrame((state) => {
    const uniforms = shaderUniforms(pointsRef.current);
    if (!uniforms) return;
    const dpr = state.viewport.dpr;
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uViewportHeight.value = state.size.height * dpr;
    uniforms.uMaxPointSize.value = DEVICE_TIER.MAX_POINT_SIZE[tier] * dpr;
  });

  if (reducedMotion) return null;
  return <points ref={pointsRef} geometry={resources.geometry} material={resources.material} frustumCulled={false} />;
}
