'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AUTUMN_ATMOSPHERE_FX, AUTUMN_COLORS, AUTUMN_LAYOUT, AUTUMN_LIGHTS } from '@/presentation/config/autumn-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createFlameMaterial,
  createGlowMaterial,
  createPbrMaterial,
  RealisticParticleField,
  useDisposables,
  useFlicker,
  usePrefersReducedMotion,
} from '../primitives';

const HEARTH = { WIDTH: 3.4, HEIGHT: 2.6, DEPTH: 1.0, OPENING_W: 1.9, OPENING_H: 1.3, CHIMNEY_W: 2.2 } as const;
const FLAME_COUNT = 5;
/** Sparks rising off the logs into the flue (local to the fire group; the opening faces +z). */
const EMBER_VOLUME = { center: [0, 0, 0] as Vec3, halfSize: [HEARTH.OPENING_W * 0.36, 0.3] as const, bottom: 0.2, top: HEARTH.OPENING_H + 0.5 };
const EMBER_COLORS = [AUTUMN_COLORS.flame, AUTUMN_COLORS.ember, AUTUMN_COLORS.lanternGlass] as const;

/** Tongues of flame that sway and stretch (static with reduced motion). */
function Flames({ material }: { material: THREE.Material }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const reducedMotion = usePrefersReducedMotion();
  const flames = useMemo(
    () =>
      Array.from({ length: FLAME_COUNT }, (_, i) => ({
        id: `flame-${i}`,
        x: (i / (FLAME_COUNT - 1) - 0.5) * HEARTH.OPENING_W * 0.55,
        height: 0.45 + (1 - Math.abs(i / (FLAME_COUNT - 1) - 0.5) * 2) * 0.35,
        phase: i * 1.37,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime();
    flames.forEach((flame, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      mesh.scale.y = 1 + Math.sin(time * 7 + flame.phase) * 0.18 + Math.sin(time * 13 + flame.phase) * 0.08;
      mesh.rotation.z = Math.sin(time * 3 + flame.phase) * 0.12;
    });
  });

  return (
    <group position={[0, 0.25, 0]}>
      {flames.map((flame, i) => (
        <mesh
          key={flame.id}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          position={[flame.x, flame.height / 2, 0]}
          material={material}
        >
          <coneGeometry args={[0.16, flame.height, 6]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Fieldstone fireplace with chimney breast, mantel, crackling logs, flames,
 * GPU sparks rising into the flue and the room's main warm light. Flames
 * are unlit HDR colours so the room's bloom catches them.
 */
export function Fireplace() {
  const lightRef = useRef<THREE.PointLight>(null);
  const materials = useMemo(
    () => ({
      stone: createPbrMaterial('stone', { color: AUTUMN_COLORS.stone, accent: AUTUMN_COLORS.mortar, repeat: [1.5, 1.5], seed: 47, normalScale: 1 }),
      soot: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#120a06', roughness: 1 }), { scale: 3, normalStrength: 0.6 }),
      log: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#4a2c16', roughness: 0.9, emissive: '#5a1a04', emissiveIntensity: 0.6 }), {
        scale: 4,
        normalStrength: 0.9,
      }),
      mantel: createPbrMaterial('wood', { color: AUTUMN_COLORS.beam, repeat: [2, 1], seed: 43 }),
      flame: createFlameMaterial(AUTUMN_COLORS.flame, 0.85),
      glow: createGlowMaterial(AUTUMN_COLORS.fireGlow, 0.7),
    }),
    [],
  );
  useDisposables(materials);

  const fire = AUTUMN_LIGHTS.fire;
  const flickerTargets = useMemo(
    () => [
      { light: lightRef, base: fire.intensity, amplitude: 0.2, phase: 0.2 },
      { material: materials.glow, base: 0.7, amplitude: 0.25, phase: 1.4, useOpacity: true },
      { material: materials.log, base: 0.6, amplitude: 0.35, phase: 2.2 },
    ],
    [materials, fire.intensity],
  );
  useFlicker(flickerTargets);

  const sideWidth = (HEARTH.WIDTH - HEARTH.OPENING_W) / 2;
  const { WIDTH, HEIGHT, DEPTH, OPENING_H } = HEARTH;
  return (
    <group position={AUTUMN_LAYOUT.FIREPLACE_POSITION} rotation={[0, AUTUMN_LAYOUT.FIREPLACE_ROTATION, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={`jamb-${side}`} position={[side * (WIDTH / 2 - sideWidth / 2), HEIGHT / 2, DEPTH / 2]} material={materials.stone}>
          <boxGeometry args={[sideWidth, HEIGHT, DEPTH]} />
        </mesh>
      ))}
      <mesh position={[0, (HEIGHT + OPENING_H) / 2, DEPTH / 2]} material={materials.stone}>
        <boxGeometry args={[HEARTH.OPENING_W, HEIGHT - OPENING_H, DEPTH]} />
      </mesh>
      <mesh position={[0, OPENING_H / 2, 0.15]} material={materials.soot}>
        <boxGeometry args={[HEARTH.OPENING_W, OPENING_H, 0.3]} />
      </mesh>
      <mesh position={[0, HEIGHT + 3.7, 0.35]} material={materials.stone}>
        <boxGeometry args={[HEARTH.CHIMNEY_W, 7.4, 0.7]} />
      </mesh>
      <mesh position={[0, HEIGHT + 0.08, DEPTH / 2 + 0.12]} material={materials.mantel}>
        <boxGeometry args={[WIDTH + 0.4, 0.16, DEPTH + 0.35]} />
      </mesh>
      <mesh position={[0, 0.05, DEPTH + 0.35]} material={materials.stone}>
        <boxGeometry args={[WIDTH + 0.6, 0.1, 0.7]} />
      </mesh>

      <group position={[0, 0, DEPTH * 0.55]}>
        {[-0.3, 0.3].map((tilt) => (
          <mesh key={`log-${tilt}`} position={[0, 0.12, 0]} rotation={[0, tilt, Math.PI / 2]} material={materials.log}>
            <cylinderGeometry args={[0.09, 0.1, 1.2, 7]} />
          </mesh>
        ))}
        <Flames material={materials.flame} />
        <RealisticParticleField
          kind="embers"
          volume={EMBER_VOLUME}
          count={AUTUMN_ATMOSPHERE_FX.EMBER_COUNT}
          colors={EMBER_COLORS}
          clearRadius={0}
          seed={19}
        />
        <sprite position={[0, 0.6, 0.2]} scale={[2.4, 1.8, 1]} material={materials.glow} />
        <pointLight ref={lightRef} position={[0, 0.9, 1.0]} color={fire.color} intensity={fire.intensity} distance={fire.distance} decay={2} />
      </group>
    </group>
  );
}
