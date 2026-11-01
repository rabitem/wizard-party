'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CELESTIAL_COLORS,
  CELESTIAL_LAYOUT,
  CELESTIAL_LIGHTS,
  CELESTIAL_REALISM,
} from '@/presentation/config/celestial-environment.config';
import { createFlameMaterial, createGlowMaterial, createPbrMaterial, useDisposables, usePrefersReducedMotion } from '../primitives';
import { createBrassMaterial } from './celestial-materials';

const CB = CELESTIAL_LAYOUT.CRYSTAL_BALL;
const L = CELESTIAL_LIGHTS.crystal;
const GLOW_OPACITY = 0.55;
const GLOW_SCALE = 2.2;
const SWIRL_SPEED = 0.6;

/**
 * Fortune teller's crystal ball on a draped round side table. The violet
 * point light (one of the room's three) breathes slowly with the inner swirl;
 * reduced motion keeps everything at its base value.
 */
export function CrystalBall() {
  const light = useRef<THREE.PointLight>(null);
  const swirl = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(
    () => ({
      cloth: createPbrMaterial('fabric', { color: '#2a1850', accent: '#1a0e36', seed: 4 }),
      brass: createBrassMaterial({ emissiveIntensity: 0.25, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({
        color: CELESTIAL_COLORS.crystal,
        emissive: CELESTIAL_COLORS.crystal,
        emissiveIntensity: CELESTIAL_REALISM.CRYSTAL_EMISSIVE,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      core: createFlameMaterial(CELESTIAL_COLORS.crystalCore, 0.7),
      glow: createGlowMaterial(CELESTIAL_COLORS.crystalGlow, GLOW_OPACITY),
      table: new THREE.CylinderGeometry(0.62, 0.9, CB.tableHeight, 20, 1, true),
      tableTop: new THREE.CircleGeometry(0.62, 20),
      stand: new THREE.CylinderGeometry(CB.ballRadius * 0.7, CB.ballRadius * 0.9, 0.14, 14),
      claws: new THREE.TorusGeometry(CB.ballRadius * 0.78, 0.025, 5, 20),
      ball: new THREE.SphereGeometry(CB.ballRadius, 24, 18),
      swirl: new THREE.TorusKnotGeometry(CB.ballRadius * 0.35, 0.03, 48, 5, 2, 3),
    }),
    [],
  );
  useDisposables(assets);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    const pulse = Math.sin(t * L.pulseSpeed) * L.pulseAmount;
    if (light.current) light.current.intensity = L.intensity * (1 + pulse);
    if (glow.current) glow.current.material.opacity = GLOW_OPACITY * (1 + pulse);
    if (swirl.current) {
      swirl.current.rotation.y = t * SWIRL_SPEED;
      swirl.current.rotation.x = Math.sin(t * 0.4) * 0.5;
    }
  });

  const ballY = CB.tableHeight + 0.14 + CB.ballRadius * 0.85;
  return (
    <group position={CB.position}>
      <mesh geometry={assets.table} material={assets.cloth} position={[0, CB.tableHeight / 2, 0]} />
      <mesh geometry={assets.tableTop} material={assets.cloth} position={[0, CB.tableHeight, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={assets.stand} material={assets.brass} position={[0, CB.tableHeight + 0.07, 0]} />
      <mesh geometry={assets.claws} material={assets.brass} position={[0, CB.tableHeight + 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={assets.ball} material={assets.glass} position={[0, ballY, 0]} />
      <mesh ref={swirl} geometry={assets.swirl} material={assets.core} position={[0, ballY, 0]} />
      <sprite ref={glow} material={assets.glow} position={[0, ballY, 0]} scale={[GLOW_SCALE, GLOW_SCALE, GLOW_SCALE]} />
      <pointLight ref={light} position={[0, ballY + 0.3, 0]} color={L.color} intensity={L.intensity} distance={L.distance} decay={2} />
    </group>
  );
}
