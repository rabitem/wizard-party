'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEON_COLORS, NEON_RIM_DECOR } from '@/presentation/config/neon-environment.config';
import { useDisposables, usePrefersReducedMotion } from '../primitives';

const PROJECTOR = { RADIUS: 0.07, HEIGHT: 0.03, LENS: 0.025, HOLO_SIZE: 0.055, HOLO_Y: 0.14, SPIN: 0.9 } as const;
const BEAM = { TOP: 0.05, HEIGHT: 0.09 } as const;
const GLASS = { RADIUS: 0.05, STEM: 0.07, BOWL: 0.06, FOOT: 0.04 } as const;
const CASSETTE = { W: 0.16, H: 0.018, D: 0.1, REEL: 0.018, LABEL_D: 0.04 } as const;
const STICK = { RADIUS: 0.009, LENGTH: 0.13 } as const;
const SEGMENTS = 12;

type Materials = ReturnType<typeof createMaterials>;

function createMaterials() {
  const neon = (color: string, opacity = 1) =>
    new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  return {
    shell: new THREE.MeshStandardMaterial({ color: '#141022', roughness: 0.35, metalness: 0.7 }),
    cyan: neon(NEON_COLORS.cyan),
    magenta: neon(NEON_COLORS.magenta),
    mint: neon(NEON_COLORS.mint),
    holo: new THREE.MeshBasicMaterial({ color: NEON_COLORS.cyan, wireframe: true, toneMapped: false, transparent: true, opacity: 0.9 }),
    beam: new THREE.MeshBasicMaterial({
      color: NEON_COLORS.cyan,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: '#e8f0ff',
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    drink: neon(NEON_COLORS.magenta, 0.85),
  };
}

/** Puck projector with a light cone and a slowly spinning wireframe crystal hologram. */
function HoloProjector({ materials }: { materials: Materials }) {
  const holoRef = useRef<THREE.Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  useFrame((_, delta) => {
    if (reducedMotion || !holoRef.current) return;
    holoRef.current.rotation.y += delta * PROJECTOR.SPIN;
  });
  const { position, rotationY } = NEON_RIM_DECOR.projector;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, PROJECTOR.HEIGHT / 2, 0]} material={materials.shell}>
        <cylinderGeometry args={[PROJECTOR.RADIUS * 0.85, PROJECTOR.RADIUS, PROJECTOR.HEIGHT, SEGMENTS]} />
      </mesh>
      <mesh position={[0, PROJECTOR.HEIGHT + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.cyan}>
        <circleGeometry args={[PROJECTOR.LENS, SEGMENTS]} />
      </mesh>
      <mesh position={[0, PROJECTOR.HEIGHT + BEAM.HEIGHT / 2, 0]} material={materials.beam}>
        <cylinderGeometry args={[BEAM.TOP, PROJECTOR.LENS, BEAM.HEIGHT, SEGMENTS, 1, true]} />
      </mesh>
      <mesh ref={holoRef} position={[0, PROJECTOR.HOLO_Y, 0]} material={materials.holo}>
        <octahedronGeometry args={[PROJECTOR.HOLO_SIZE, 0]} />
      </mesh>
    </group>
  );
}

/** Martini-style glass with a glowing magenta drink and a cyan neon swizzle stick. */
function NeonCocktail({ materials }: { materials: Materials }) {
  const { position, rotationY } = NEON_RIM_DECOR.cocktail;
  const bowlY = GLASS.STEM + GLASS.BOWL / 2;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.003, 0]} material={materials.glass}>
        <cylinderGeometry args={[GLASS.FOOT, GLASS.FOOT, 0.006, SEGMENTS]} />
      </mesh>
      <mesh position={[0, GLASS.STEM / 2, 0]} material={materials.glass}>
        <cylinderGeometry args={[0.005, 0.005, GLASS.STEM, 6]} />
      </mesh>
      <mesh position={[0, bowlY - GLASS.BOWL * 0.12, 0]} rotation={[Math.PI, 0, 0]} material={materials.drink}>
        <coneGeometry args={[GLASS.RADIUS * 0.78, GLASS.BOWL * 0.76, SEGMENTS]} />
      </mesh>
      <mesh position={[0, bowlY, 0]} rotation={[Math.PI, 0, 0]} material={materials.glass}>
        <coneGeometry args={[GLASS.RADIUS, GLASS.BOWL, SEGMENTS, 1, true]} />
      </mesh>
      <mesh position={[0.015, bowlY + 0.02, 0]} rotation={[0, 0, -0.35]} material={materials.cyan}>
        <cylinderGeometry args={[0.003, 0.003, GLASS.BOWL * 1.4, 5]} />
      </mesh>
    </group>
  );
}

/** Retro tape cassette lying flat: dark shell, neon label strip, two reels. */
function Cassette({ materials }: { materials: Materials }) {
  const { position, rotationY } = NEON_RIM_DECOR.cassette;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, CASSETTE.H / 2, 0]} material={materials.shell}>
        <boxGeometry args={[CASSETTE.W, CASSETTE.H, CASSETTE.D]} />
      </mesh>
      <mesh position={[0, CASSETTE.H + 0.001, -CASSETTE.D * 0.22]} material={materials.magenta}>
        <boxGeometry args={[CASSETTE.W * 0.8, 0.002, CASSETTE.LABEL_D * 0.5]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * CASSETTE.W * 0.22, CASSETTE.H + 0.001, CASSETTE.D * 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={materials.cyan}>
          <torusGeometry args={[CASSETTE.REEL, 0.003, 4, SEGMENTS]} />
        </mesh>
      ))}
    </group>
  );
}

function GlowStick({ materials }: { materials: Materials }) {
  const { position, rotationY } = NEON_RIM_DECOR.glowStick;
  return (
    <mesh position={[position[0], position[1] + STICK.RADIUS, position[2]]} rotation={[0, rotationY, Math.PI / 2]} material={materials.mint}>
      <capsuleGeometry args={[STICK.RADIUS, STICK.LENGTH, 3, 8]} />
    </mesh>
  );
}

/**
 * Neon bar clutter on the wood rim: a hologram projector, a glowing
 * cocktail, a cassette tape and a glow stick. Visual only (no colliders),
 * placed in the safe rim slots outside the play area.
 */
export function NeonTableDecor() {
  const materials = useMemo(() => createMaterials(), []);
  useDisposables(materials);
  return (
    <group>
      <HoloProjector materials={materials} />
      <NeonCocktail materials={materials} />
      <Cassette materials={materials} />
      <GlowStick materials={materials} />
    </group>
  );
}
