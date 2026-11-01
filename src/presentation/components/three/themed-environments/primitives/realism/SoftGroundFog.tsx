'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GROUND_FOG, type DeviceTier } from '@/presentation/config/realism.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useDisposables } from '../useDisposables';
import { useDeviceTier } from './device-tier';
import { createFogGeometry } from './atmosphere-geometry';
import { GROUND_FOG_FRAGMENT_SHADER, GROUND_FOG_VERTEX_SHADER } from './atmosphere-shaders';
import { getFogNoiseTexture } from './noise-texture';
import { shaderUniforms } from './shader-uniforms';

export interface SoftGroundFogProps {
  /** Floor-level centre (defaults to the room floor at the origin) */
  center?: Vec3;
  /** Footprint width (x) and depth (z) */
  size: readonly [number, number];
  /** Height of the top layer above the floor */
  height?: number;
  color?: string;
  opacity?: number;
  /** Noise repeats across the footprint */
  scale?: number;
  /** Drift speed multiplier */
  speed?: number;
  /** Override the device tier (layer count) */
  tier?: DeviceTier;
  renderOrder?: number;
}

/**
 * Low drifting fog hugging the floor: a few stacked transparent planes
 * sampling a scrolling tileable noise, feathered at the edges and faded near
 * the camera and into scene fog. One draw call; frozen for reduced motion.
 */
export function SoftGroundFog({
  center = [0, ENVIRONMENT_ROOM.FLOOR_Y, 0],
  size,
  height = 0.6,
  color = '#c8d2e0',
  opacity = 0.32,
  scale = 2.5,
  speed = 1,
  tier: tierOverride,
  renderOrder = 0,
}: SoftGroundFogProps) {
  const detectedTier = useDeviceTier();
  const layers = GROUND_FOG.LAYERS[tierOverride ?? detectedTier];
  const reducedMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);
  const [width, depth] = size;

  const resources = useMemo(
    () => ({
      geometry: createFogGeometry(layers, width, depth, height),
      material: new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uNoise: { value: getFogNoiseTexture() },
          uColor: { value: new THREE.Color() },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uScale: { value: 1 },
          uLayers: { value: layers },
          uNearFade: { value: new THREE.Vector2(0.8, 3) },
        },
        vertexShader: GROUND_FOG_VERTEX_SHADER,
        fragmentShader: GROUND_FOG_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    }),
    [layers, width, depth, height],
  );
  useDisposables(resources);

  useLayoutEffect(() => {
    const uniforms = shaderUniforms(meshRef.current);
    if (!uniforms) return;
    uniforms.uColor.value.set(color);
    uniforms.uOpacity.value = opacity;
    uniforms.uScale.value = scale;
  }, [resources, color, opacity, scale]);

  useFrame(({ clock }) => {
    const uniforms = shaderUniforms(meshRef.current);
    if (!uniforms || reducedMotion) return;
    uniforms.uTime.value = clock.getElapsedTime() * GROUND_FOG.SCROLL_SPEED * speed;
  });

  return (
    <mesh
      ref={meshRef}
      position={center}
      geometry={resources.geometry}
      material={resources.material}
      renderOrder={renderOrder}
    />
  );
}
