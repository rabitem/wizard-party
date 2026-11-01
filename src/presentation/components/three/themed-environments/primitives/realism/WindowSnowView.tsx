'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PARTICLE_FIELD,
  WINDOW_VIEW,
  WINDOW_VIEW_VARIANTS,
  type DeviceTier,
  type WindowPrecipitation,
  type WindowViewPalette,
  type WindowViewVariant,
} from '@/presentation/config/realism.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { useDisposables } from '../useDisposables';
import { useDeviceTier } from './device-tier';
import { shaderUniforms } from './shader-uniforms';
import { WINDOW_VIEW_FRAGMENT_SHADER, WINDOW_VIEW_VERTEX_SHADER } from './window-view-shader';
import { getFrostTexture, getMountainLayerTexture, getTreeLayerTexture } from './window-view-textures';

export interface WindowSnowViewProps {
  /** Centre of the pane, just in front of the wall (offset ~0.01 to avoid z-fighting) */
  position: Vec3;
  /** Euler rotation; the pane faces +z locally (into the room) */
  rotation?: Vec3;
  /** Pane width and height */
  size: readonly [number, number];
  variant?: WindowViewVariant;
  /** Per-colour overrides on top of the variant palette */
  palette?: Partial<WindowViewPalette>;
  precipitation?: WindowPrecipitation;
  /** 0..1 frost on the glass edges */
  frost?: number;
  /** Snow drift on the outer sill (window heights); 0 hides it */
  sillDrift?: number;
  tier?: DeviceTier;
}

const PALETTE_UNIFORMS: ReadonlyArray<readonly [keyof WindowViewPalette, string]> = [
  ['skyTop', 'uSkyTop'],
  ['skyHorizon', 'uSkyHorizon'],
  ['snow', 'uSnow'],
  ['mountain', 'uMountain'],
  ['treeFar', 'uTreeFar'],
  ['treeNear', 'uTreeNear'],
  ['celestial', 'uCelestial'],
  ['flakes', 'uFlakes'],
  ['frost', 'uFrostColor'],
];

const PRECIPITATION_CODE: Readonly<Record<WindowPrecipitation, number>> = { none: 0, snow: 1, rain: 2 };

const cameraLocal = new THREE.Vector3();

function createWindowMaterial(layers: number): THREE.ShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uSize: { value: new THREE.Vector2(1, 1) },
    uCameraLocal: { value: new THREE.Vector3(0, 0, 10) },
    uTime: { value: PARTICLE_FIELD.FROZEN_TIME },
    uVerticalParallax: { value: WINDOW_VIEW.VERTICAL_PARALLAX },
    uStars: { value: 0 },
    uCelestialPosition: { value: new THREE.Vector2() },
    uCelestialSize: { value: 0.05 },
    uBrightness: { value: 1 },
    uFrostAmount: { value: 0 },
    uPrecipitation: { value: 1 },
    uSillDrift: { value: 0 },
    uMountains: { value: getMountainLayerTexture() },
    uTreesDense: { value: getTreeLayerTexture('dense') },
    uTreesSparse: { value: getTreeLayerTexture('sparse') },
    uFrost: { value: getFrostTexture() },
  };
  PALETTE_UNIFORMS.forEach(([, name]) => {
    uniforms[name] = { value: new THREE.Color() };
  });
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WINDOW_VIEW_VERTEX_SHADER,
    fragmentShader: WINDOW_VIEW_FRAGMENT_SHADER,
    defines: { PRECIPITATION_LAYERS: layers },
    fog: true,
  });
}

/**
 * A window pane that shows an outdoor scene with real parallax: sky with
 * stars and moon/sun, mountains, two forest layers, several precipitation
 * layers at different depths, a snow drift on the outer sill and frost on
 * the glass. One opaque plane and one draw call; place it over the wall
 * where the window opening is and frame it with your own geometry.
 * Generic across rooms: pick a variant (night / dusk / day), override
 * palette colours and choose snow, rain or none.
 */
export function WindowSnowView({
  position,
  rotation = [0, 0, 0],
  size,
  variant = 'night',
  palette,
  precipitation = 'snow',
  frost = 0.45,
  sillDrift = WINDOW_VIEW.SILL_DRIFT,
  tier: tierOverride,
}: WindowSnowViewProps) {
  const detectedTier = useDeviceTier();
  const layers = WINDOW_VIEW.PRECIPITATION_LAYERS[tierOverride ?? detectedTier];
  const reducedMotion = usePrefersReducedMotion();
  const meshRef = useRef<THREE.Mesh>(null);
  const [width, height] = size;

  const resources = useMemo(
    () => ({
      geometry: new THREE.PlaneGeometry(width, height),
      material: createWindowMaterial(layers),
    }),
    [width, height, layers],
  );
  useDisposables(resources);

  const colors = useMemo(() => ({ ...WINDOW_VIEW_VARIANTS[variant], ...palette }), [variant, palette]);

  useLayoutEffect(() => {
    const uniforms = shaderUniforms(meshRef.current);
    if (!uniforms) return;
    PALETTE_UNIFORMS.forEach(([key, name]) => uniforms[name].value.set(colors[key] as string));
    uniforms.uSize.value.set(width, height);
    uniforms.uStars.value = colors.stars;
    uniforms.uCelestialPosition.value.set(...colors.celestialPosition);
    uniforms.uCelestialSize.value = colors.celestialSize;
    uniforms.uBrightness.value = colors.brightness;
    uniforms.uFrostAmount.value = frost;
    uniforms.uPrecipitation.value = PRECIPITATION_CODE[precipitation];
    uniforms.uSillDrift.value = sillDrift;
  }, [resources, colors, width, height, frost, precipitation, sillDrift]);

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    const uniforms = shaderUniforms(mesh);
    if (!mesh || !uniforms) return;
    // Camera in pane space, measured in window heights (matches vLocal in the shader).
    mesh.worldToLocal(cameraLocal.copy(camera.position)).divideScalar(height);
    uniforms.uCameraLocal.value.copy(cameraLocal);
    if (!reducedMotion) uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      geometry={resources.geometry}
      material={resources.material}
    />
  );
}
