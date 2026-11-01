'use client';

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUMMER_COLORS, SUMMER_LAYOUT, SUMMER_SEA, SUMMER_SKY } from '@/presentation/config/summer-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { getFogNoiseTexture, shaderUniforms } from '../primitives/realism';
import { SEA_FRAGMENT_SHADER, SEA_VERTEX_SHADER, SKY_FRAGMENT_SHADER, SKY_VERTEX_SHADER } from './sky-sea-shaders';

const SUN_POSITION = new THREE.Vector3(...SUMMER_LAYOUT.SUN_POSITION);
/** Angular radius of the sun seen from the table */
const SUN_ANGULAR_RADIUS = SUMMER_LAYOUT.SUN_RADIUS / SUN_POSITION.length();
/** Reduced motion: a fixed, pleasant moment of the animation */
const FROZEN_TIME = 12;

const color = (hex: string) => new THREE.Color(hex);

/** Advances uTime on a ShaderMaterial mesh (frozen with reduced motion). */
function useShaderClock(ref: RefObject<THREE.Mesh | null>, speed = 1) {
  const reducedMotion = usePrefersReducedMotion();
  useLayoutEffect(() => {
    const uniforms = shaderUniforms(ref.current);
    if (uniforms && reducedMotion) uniforms.uTime.value = FROZEN_TIME;
  }, [ref, reducedMotion]);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const uniforms = shaderUniforms(ref.current);
    if (uniforms) uniforms.uTime.value = clock.getElapsedTime() * speed;
  });
}

interface SkyGradientProps {
  /** Vertical sunset gradient (v = elevation), shared by sky and sea */
  gradient: THREE.Texture;
}

/**
 * Sunset sky dome: gradient, forward-scattering sun glow, a bright haze band
 * with heat shimmer on the horizon, thin gold-lit cloud streaks and a
 * limb-darkened sun bright enough to bloom. One draw call, unlit, no fog.
 */
export function SunsetSky({ gradient }: SkyGradientProps) {
  const ref = useRef<THREE.Mesh>(null);
  const resources = useMemo(() => {
    const [widthSegments, heightSegments] = SUMMER_SKY.DOME_SEGMENTS;
    return {
      geometry: new THREE.SphereGeometry(SUMMER_LAYOUT.SKY_RADIUS, widthSegments, heightSegments, 0, Math.PI * 2, 0, Math.PI / 2),
      material: new THREE.ShaderMaterial({
        uniforms: {
          uGradient: { value: gradient },
          uSunPosition: { value: SUN_POSITION.clone() },
          uSunColor: { value: color(SUMMER_COLORS.sun) },
          uGlowColor: { value: color(SUMMER_SKY.GLOW_COLOR) },
          uHazeColor: { value: color(SUMMER_SKY.HAZE_COLOR) },
          uCloudLit: { value: color(SUMMER_SKY.CLOUD_LIT) },
          uCloudShade: { value: color(SUMMER_SKY.CLOUD_SHADE) },
          uSunRadius: { value: SUN_ANGULAR_RADIUS },
          uSunIntensity: { value: SUMMER_SKY.SUN_INTENSITY },
          uCloudCover: { value: SUMMER_SKY.CLOUD_COVER },
          uCloudDrift: { value: SUMMER_SKY.CLOUD_DRIFT },
          uShimmer: { value: SUMMER_SKY.HAZE_SHIMMER },
          uTime: { value: 0 },
        },
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [gradient]);
  useDisposables(resources);
  useShaderClock(ref);

  return (
    <mesh
      ref={ref}
      position={[0, SUMMER_LAYOUT.SEA_Y, 0]}
      geometry={resources.geometry}
      material={resources.material}
      renderOrder={-1}
      frustumCulled={false}
    />
  );
}

/**
 * Sea: rolling swells plus two scrolling noise layers for normal detail,
 * Fresnel reflection of the sunset gradient, a glittering sun path and foam
 * lines along the beach. Unlit (the sky is the light), fogged into the haze.
 */
export function SeaSurface({ gradient }: SkyGradientProps) {
  const ref = useRef<THREE.Mesh>(null);
  const [seaNear, seaFar] = SUMMER_LAYOUT.SEA_Z;
  const resources = useMemo(
    () => ({
      geometry: new THREE.PlaneGeometry(SUMMER_LAYOUT.SEA_WIDTH, Math.abs(seaFar - seaNear)),
      material: new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uGradient: { value: gradient },
          uNoise: { value: getFogNoiseTexture() },
          uSunPosition: { value: SUN_POSITION.clone() },
          uSunColor: { value: color(SUMMER_COLORS.sun) },
          uDeep: { value: color(SUMMER_SEA.DEEP) },
          uShallow: { value: color(SUMMER_SEA.SHALLOW) },
          uFoam: { value: color(SUMMER_SEA.FOAM) },
          uDetail: { value: new THREE.Vector2(...SUMMER_SEA.DETAIL) },
          uDetailScale: { value: new THREE.Vector2(...SUMMER_SEA.DETAIL_SCALE) },
          uGlitter: { value: SUMMER_SEA.GLITTER },
          uSunPath: { value: SUMMER_SEA.SUN_PATH },
          uShoreZ: { value: seaNear },
          uFoamWidth: { value: SUMMER_SEA.FOAM_WIDTH },
          uTime: { value: 0 },
        },
        vertexShader: SEA_VERTEX_SHADER,
        fragmentShader: SEA_FRAGMENT_SHADER,
        fog: true,
      }),
    }),
    [gradient, seaNear, seaFar],
  );
  useDisposables(resources);
  useShaderClock(ref);

  return (
    <mesh
      ref={ref}
      position={[0, SUMMER_LAYOUT.SEA_Y, (seaNear + seaFar) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={resources.geometry}
      material={resources.material}
    />
  );
}
