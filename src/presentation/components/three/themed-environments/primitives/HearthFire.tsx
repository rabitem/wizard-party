'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createFlameMaterial, createGlowMaterial } from './glow';
import { seededRandom } from './instancing';
import { useDisposables } from './useDisposables';
import { useFlicker } from './useFlicker';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface HearthFireColors {
  log: string;
  logGlow: string;
  flame: string;
  ember: string;
  glow: string;
}

interface HearthFireProps {
  /** Width of the hearth opening the fire fills */
  width: number;
  colors: HearthFireColors;
  emberCount: number;
  light: { color: string; intensity: number; distance: number };
  flameCount?: number;
  seed?: number;
}

const LOG = { RADIUS: 0.095, LENGTH_RATIO: 0.62, TILT: 0.3 } as const;
const FLAME = { RADIUS: 0.15, MIN_HEIGHT: 0.42, EXTRA_HEIGHT: 0.36, BASE_Y: 0.22 } as const;
const EMBER = { SIZE: 0.032, RISE: 1.1, START_Y: 0.25 } as const;

/** Rising embers that shrink as they climb (frozen with reduced motion). */
function Embers({ count, width, material, seed }: { count: number; width: number; material: THREE.Material; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const assets = useMemo(() => ({ geometry: new THREE.SphereGeometry(EMBER.SIZE, 6, 4) }), []);
  useDisposables(assets);
  const embers = useMemo(() => {
    const rand = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * width * 0.6,
      z: (rand() - 0.5) * 0.3,
      speed: 0.25 + rand() * 0.4,
      phase: rand(),
    }));
  }, [count, width, seed]);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = reducedMotion ? 0 : clock.getElapsedTime();
    embers.forEach((ember, i) => {
      const life = (time * ember.speed + ember.phase) % 1;
      scratch.position.set(ember.x + Math.sin(life * 6 + i) * 0.05, EMBER.START_Y + life * EMBER.RISE, ember.z);
      scratch.scale.setScalar(1 - life * 0.8);
      scratch.updateMatrix();
      mesh.setMatrixAt(i, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;
  return <instancedMesh ref={ref} args={[assets.geometry, material, count]} frustumCulled={false} />;
}

/**
 * Logs, swaying flame tongues, embers, a glow halo and the one flickering
 * point light of a fireplace. Place it inside a hearth opening (local +z
 * faces the room).
 */
export function HearthFire({ width, colors, emberCount, light, flameCount = 5, seed = 19 }: HearthFireProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flameRefs = useRef<Array<THREE.Mesh | null>>([]);
  const reducedMotion = usePrefersReducedMotion();

  const assets = useMemo(
    () => ({
      log: new THREE.MeshStandardMaterial({ color: colors.log, roughness: 0.9, emissive: colors.logGlow, emissiveIntensity: 0.6 }),
      flame: createFlameMaterial(colors.flame, 0.85),
      ember: createFlameMaterial(colors.ember, 1),
      glow: createGlowMaterial(colors.glow, 0.7),
      logGeometry: new THREE.CylinderGeometry(LOG.RADIUS * 0.9, LOG.RADIUS, width * LOG.LENGTH_RATIO, 7),
      flameGeometry: new THREE.ConeGeometry(FLAME.RADIUS, 1, 6),
    }),
    [colors, width],
  );
  useDisposables(assets);

  const flames = useMemo(
    () =>
      Array.from({ length: flameCount }, (_, i) => {
        const t = flameCount > 1 ? i / (flameCount - 1) : 0.5;
        return {
          id: `flame-${i}`,
          x: (t - 0.5) * width * 0.5,
          height: FLAME.MIN_HEIGHT + (1 - Math.abs(t - 0.5) * 2) * FLAME.EXTRA_HEIGHT,
          phase: i * 1.37,
        };
      }),
    [flameCount, width],
  );

  const flickerTargets = useMemo(
    () => [
      { light: lightRef, base: light.intensity, amplitude: 0.2, phase: 0.2 },
      { material: assets.glow, base: 0.7, amplitude: 0.25, phase: 1.4, useOpacity: true },
      { material: assets.log, base: 0.6, amplitude: 0.35, phase: 2.2 },
    ],
    [assets, light.intensity],
  );
  useFlicker(flickerTargets);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime();
    flames.forEach((flame, i) => {
      const mesh = flameRefs.current[i];
      if (!mesh) return;
      mesh.scale.y = flame.height * (1 + Math.sin(time * 7 + flame.phase) * 0.18 + Math.sin(time * 13 + flame.phase) * 0.08);
      mesh.rotation.z = Math.sin(time * 3 + flame.phase) * 0.12;
    });
  });

  return (
    <group>
      {[-LOG.TILT, LOG.TILT].map((tilt) => (
        <mesh key={`log-${tilt}`} position={[0, LOG.RADIUS * 1.2, 0]} rotation={[0, tilt, Math.PI / 2]} geometry={assets.logGeometry} material={assets.log} />
      ))}
      {flames.map((flame, i) => (
        <mesh
          key={flame.id}
          ref={(mesh) => {
            flameRefs.current[i] = mesh;
          }}
          position={[flame.x, FLAME.BASE_Y + flame.height / 2, 0]}
          scale={[1, flame.height, 1]}
          geometry={assets.flameGeometry}
          material={assets.flame}
        />
      ))}
      <Embers count={emberCount} width={width} material={assets.ember} seed={seed} />
      <sprite position={[0, 0.6, 0.2]} scale={[width * 1.25, 1.8, 1]} material={assets.glow} />
      <pointLight ref={lightRef} position={[0, 0.9, 1.0]} color={light.color} intensity={light.intensity} distance={light.distance} decay={2} />
    </group>
  );
}
