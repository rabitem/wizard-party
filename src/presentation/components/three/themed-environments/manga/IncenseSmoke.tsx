'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MANGA_INCENSE } from '@/presentation/config/manga-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';
import { shaderUniforms } from '../primitives/realism';
import { createToonMaterial } from './manga-geometry';
import { SMOKE_FRAGMENT_SHADER, SMOKE_VERTEX_SHADER } from './incense-smoke-shader';

const BURNER = { RADIUS: 0.13, HEIGHT: 0.12 } as const;
const STICK = { RADIUS: 0.006, LENGTH: 0.34, TILT: 0.08 } as const;
const EMBER_RADIUS = 0.011;
/** Ember colour multiplier (> 1 blooms) */
const EMBER_GLOW = 2.4;
/** Reduced motion: a fixed smoke shape */
const FROZEN_TIME = 9;

/**
 * Bronze incense burner on the tokonoma: a stick with a glowing tip and two
 * curling smoke wisps (one shader quad, one time uniform; frozen for reduced
 * motion). Far from the table, so it never covers the cards.
 */
export function IncenseSmoke() {
  const reducedMotion = usePrefersReducedMotion();
  const smokeRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(() => {
    const [width, height] = MANGA_INCENSE.SMOKE_SIZE;
    const smokeGeometry = new THREE.PlaneGeometry(width, height);
    smokeGeometry.translate(0, height / 2, 0);
    return {
      smokeGeometry,
      burnerGeometry: new THREE.CylinderGeometry(BURNER.RADIUS, BURNER.RADIUS * 0.8, BURNER.HEIGHT, 14),
      stickGeometry: new THREE.CylinderGeometry(STICK.RADIUS, STICK.RADIUS, STICK.LENGTH, 4),
      emberGeometry: new THREE.SphereGeometry(EMBER_RADIUS, 6, 4),
      burner: createToonMaterial(MANGA_INCENSE.BURNER),
      stick: createToonMaterial(MANGA_INCENSE.STICK),
      ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(MANGA_INCENSE.EMBER).multiplyScalar(EMBER_GLOW), toneMapped: false }),
      smoke: new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(MANGA_INCENSE.SMOKE_COLOR) },
          uOpacity: { value: MANGA_INCENSE.SMOKE_OPACITY },
          uTime: { value: FROZEN_TIME },
        },
        vertexShader: SMOKE_VERTEX_SHADER,
        fragmentShader: SMOKE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, []);
  useDisposables(assets);

  useLayoutEffect(() => {
    const uniforms = shaderUniforms(smokeRef.current);
    if (uniforms && reducedMotion) uniforms.uTime.value = FROZEN_TIME;
  }, [reducedMotion]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const uniforms = shaderUniforms(smokeRef.current);
    if (uniforms) uniforms.uTime.value = clock.getElapsedTime();
  });

  const stickTop = BURNER.HEIGHT + STICK.LENGTH * Math.cos(STICK.TILT);
  const stickTipX = STICK.LENGTH * Math.sin(STICK.TILT);
  return (
    <group position={MANGA_INCENSE.POSITION}>
      <mesh position={[0, BURNER.HEIGHT / 2, 0]} geometry={assets.burnerGeometry} material={assets.burner} />
      <mesh
        position={[stickTipX / 2, BURNER.HEIGHT + (stickTop - BURNER.HEIGHT) / 2, 0]}
        rotation={[0, 0, -STICK.TILT]}
        geometry={assets.stickGeometry}
        material={assets.stick}
      />
      <mesh position={[stickTipX, stickTop, 0]} geometry={assets.emberGeometry} material={assets.ember} />
      <mesh ref={smokeRef} position={[stickTipX, stickTop, 0]} geometry={assets.smokeGeometry} material={assets.smoke} />
    </group>
  );
}
