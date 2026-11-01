'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  HALLOWEEN_COLORS,
  HALLOWEEN_LAYOUT,
  HALLOWEEN_LIGHTS,
  HALLOWEEN_REALISM,
} from '@/presentation/config/halloween-environment.config';
import {
  addSurfaceDetail,
  createFlameMaterial,
  createGlowMaterial,
  seededRandom,
  useDisposables,
  useFlicker,
  usePrefersReducedMotion,
  RealisticParticleField,
  type ParticleVolume,
} from '../primitives';

const BODY_RADIUS = 0.75;
const BODY_HEIGHT = 1.0;
const LIQUID_Y = BODY_HEIGHT * 0.86;
const LEG_COUNT = 3;
const BUBBLE_RISE = 0.35;
const BUBBLE_RADIUS = 0.07;
const LEG_ANGLES = Array.from({ length: LEG_COUNT }, (_, i) => (i / LEG_COUNT) * Math.PI * 2);
const { STEAM, EMBERS } = HALLOWEEN_REALISM;
/** Particle volumes are local to the cauldron group (its origin sits on the floor). */
const STEAM_VOLUME: ParticleVolume = { center: [0, 0, 0], halfSize: STEAM.halfSize, bottom: STEAM.bottom, top: STEAM.top };
const EMBER_VOLUME: ParticleVolume = { center: [0, 0, 0], halfSize: EMBERS.halfSize, bottom: EMBERS.bottom, top: EMBERS.top };

function createBodyGeometry(): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = -Math.PI / 2 + t * Math.PI * 0.9;
    points.push(new THREE.Vector2(Math.max(0.05, Math.cos(angle) * BODY_RADIUS), BODY_HEIGHT * 0.5 + Math.sin(angle) * BODY_HEIGHT * 0.5));
  }
  return new THREE.LatheGeometry(points, 24);
}

interface Bubble {
  id: string;
  x: number;
  z: number;
  speed: number;
  phase: number;
}

/** Bubbles rise a little, swell and pop, looping forever (static with reduced motion). */
function Bubbles({ material }: { material: THREE.Material }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const reducedMotion = usePrefersReducedMotion();
  const bubbles = useMemo<Bubble[]>(() => {
    const rand = seededRandom(41);
    return Array.from({ length: HALLOWEEN_LAYOUT.CAULDRON_BUBBLES }, (_, i) => {
      const angle = rand() * Math.PI * 2;
      const radius = rand() * BODY_RADIUS * 0.55;
      return { id: `bubble-${i}`, x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, speed: 0.5 + rand() * 0.7, phase: rand() };
    });
  }, []);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime();
    bubbles.forEach((bubble, index) => {
      const mesh = refs.current[index];
      if (!mesh) return;
      const life = (time * bubble.speed + bubble.phase) % 1;
      mesh.position.y = LIQUID_Y + life * BUBBLE_RISE * 0.4;
      mesh.scale.setScalar(0.4 + Math.sin(life * Math.PI) * 0.9);
    });
  });

  return (
    <group>
      {bubbles.map((bubble, index) => (
        <mesh
          key={bubble.id}
          ref={(mesh) => {
            refs.current[index] = mesh;
          }}
          position={[bubble.x, LIQUID_Y, bubble.z]}
          material={material}
        >
          <sphereGeometry args={[BUBBLE_RADIUS, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

/** Black iron cauldron with glowing green brew, bubbles, rising steam, fire embers and its own light. */
export function Cauldron() {
  const lightRef = useRef<THREE.PointLight>(null);
  const geometries = useMemo(() => ({ body: createBodyGeometry() }), []);
  const materials = useMemo(
    () => ({
      iron: addSurfaceDetail(
        new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.cauldron, roughness: 0.55, metalness: 0.75 }),
        { scale: 3, normalStrength: 0.45 },
      ),
      potion: new THREE.MeshBasicMaterial({ color: HALLOWEEN_COLORS.potion, toneMapped: false }),
      bubble: createFlameMaterial(HALLOWEEN_COLORS.potion, 0.8),
      glow: createGlowMaterial(HALLOWEEN_COLORS.potionGlow, 0.55),
      fire: createFlameMaterial('#ff7a2a', 0.85),
    }),
    [],
  );
  useDisposables(geometries);
  useDisposables(materials);

  const light = HALLOWEEN_LIGHTS.cauldron;
  const flickerTargets = useMemo(
    () => [
      { light: lightRef, base: light.intensity, amplitude: 0.15, phase: 0.4 },
      { material: materials.glow, base: 0.55, amplitude: 0.2, phase: 1.1, useOpacity: true },
      { material: materials.fire, base: 0.85, amplitude: 0.15, phase: 2.7, useOpacity: true },
    ],
    [materials, light.intensity],
  );
  useFlicker(flickerTargets);

  const legRadius = BODY_RADIUS * 0.7;
  return (
    <group position={HALLOWEEN_LAYOUT.CAULDRON_POSITION}>
      <group position={[0, 0.25, 0]}>
        <mesh geometry={geometries.body} material={materials.iron} />
        <mesh position={[0, BODY_HEIGHT * 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.iron}>
          <torusGeometry args={[BODY_RADIUS * 0.82, 0.06, 8, 24]} />
        </mesh>
        <mesh position={[0, LIQUID_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.potion}>
          <circleGeometry args={[BODY_RADIUS * 0.8, 24]} />
        </mesh>
        <Bubbles material={materials.bubble} />
        <sprite position={[0, LIQUID_Y + 0.5, 0]} scale={[2.6, 2.2, 1]} material={materials.glow} />
      </group>
      {LEG_ANGLES.map((angle) => {
        return (
          <mesh key={`leg-${angle}`} position={[Math.cos(angle) * legRadius, 0.15, Math.sin(angle) * legRadius]} material={materials.iron}>
            <cylinderGeometry args={[0.05, 0.07, 0.3, 6]} />
          </mesh>
        );
      })}
      {/* Embers under the pot */}
      <mesh position={[0, 0.12, 0]} material={materials.fire}>
        <coneGeometry args={[0.35, 0.3, 7]} />
      </mesh>
      <RealisticParticleField
        kind="dust"
        volume={STEAM_VOLUME}
        count={STEAM.count}
        colors={STEAM.colors}
        fallSpeed={STEAM.fallSpeed}
        sizeScale={STEAM.sizeScale}
        opacity={STEAM.opacity}
        turbulence={STEAM.turbulence}
        clearRadius={0}
        seed={13}
      />
      <RealisticParticleField
        kind="embers"
        volume={EMBER_VOLUME}
        count={EMBERS.count}
        sizeScale={EMBERS.sizeScale}
        clearRadius={0}
        seed={29}
      />
      <pointLight
        ref={lightRef}
        position={[0, LIQUID_Y + 0.9, 0]}
        color={light.color}
        intensity={light.intensity}
        distance={light.distance}
        decay={2}
      />
    </group>
  );
}
