'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling/ambient';
import { TRUMP_EMBLEM, createTrumpEmblemGeometry } from './trump-emblem';

interface PhysicsTrumpIndicatorProps {
  suit: Suit | null;
}

/** Crystal shown while no trump suit is set */
function CrystalIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <octahedronGeometry args={[0.08]} />
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

/** The deck's suit symbol as a solid emblem; the crystal when there is no trump or no outline */
function SuitEmblem({ symbol, color }: { symbol: string | null; color: string }) {
  const geometry = useMemo(() => (symbol ? createTrumpEmblemGeometry(symbol) : null), [symbol]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) return <CrystalIcon color={color} />;
  const { ROUGHNESS, METALNESS, EMISSIVE_INTENSITY } = TRUMP_EMBLEM.MATERIAL;
  return (
    <mesh geometry={geometry} position={[0, TRUMP_EMBLEM.LIFT, 0]}>
      <meshStandardMaterial
        color={color}
        roughness={ROUGHNESS}
        metalness={METALNESS}
        emissive={color}
        emissiveIntensity={EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// Pre-computed burn mark positions
const BURN_MARKS = [
  { id: 'burn-1', x: 0.36, z: 0.12, scale: 0.07, rotation: 0.5 },
  { id: 'burn-2', x: 0.18, z: 0.32, scale: 0.08, rotation: 1.2 },
  { id: 'burn-3', x: -0.22, z: 0.28, scale: 0.06, rotation: 2.1 },
  { id: 'burn-4', x: -0.35, z: -0.08, scale: 0.09, rotation: 3.0 },
  { id: 'burn-5', x: -0.12, z: -0.34, scale: 0.07, rotation: 4.2 },
  { id: 'burn-6', x: 0.25, z: -0.26, scale: 0.08, rotation: 5.1 },
  { id: 'burn-7', x: 0.52, z: 0.15, scale: 0.05, rotation: 0.8 },
  { id: 'burn-8', x: 0.35, z: 0.42, scale: 0.06, rotation: 1.5 },
  { id: 'burn-9', x: -0.08, z: 0.55, scale: 0.04, rotation: 2.4 },
  { id: 'burn-10', x: -0.45, z: 0.32, scale: 0.05, rotation: 3.3 },
  { id: 'burn-11', x: -0.55, z: -0.12, scale: 0.06, rotation: 4.0 },
  { id: 'burn-12', x: -0.38, z: -0.42, scale: 0.05, rotation: 4.9 },
  { id: 'burn-13', x: 0.12, z: -0.52, scale: 0.04, rotation: 5.6 },
  { id: 'burn-14', x: 0.48, z: -0.28, scale: 0.06, rotation: 0.3 },
];

/** Smoke brand burn marks on table */
function SmokeBrand() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (groupRef.current) {
      const children = groupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const mesh = children[i] as THREE.Mesh;
        const pulse = 1 + Math.sin(time * 2 + i * 0.5) * 0.1;
        mesh.scale.set(pulse, pulse, 1);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {BURN_MARKS.map((mark) => (
        <mesh key={mark.id} position={[mark.x, mark.z, 0.001]} rotation={[0, 0, mark.rotation]}>
          <circleGeometry args={[mark.scale, 16]} />
          <meshBasicMaterial color="#1a0a00" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Indicator colour when no trump suit is set (crystal icon) */
const NO_TRUMP_COLOR = '#8855ff';

const EMBER_PARTICLE_IDS = ['ember-0', 'ember-1', 'ember-2', 'ember-3', 'ember-4', 'ember-5'] as const;

/** Ember particles floating around */
function EmberParticles({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const angle = time * 0.4 + (i / 6) * Math.PI * 2;
        const radius = 0.25 + Math.sin(time * 0.5 + i) * 0.08;
        const height = 0.08 + Math.sin(time * 2 + i * 0.7) * 0.04;

        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.z = Math.sin(angle) * radius;
        mesh.position.y = height;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {EMBER_PARTICLE_IDS.map((id) => (
        <mesh key={id}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Trump Indicator - Animated 3D icon showing current trump suit
 * Uses smooth scripted animation (no physics)
 */
export function PhysicsTrumpIndicator({ suit }: PhysicsTrumpIndicatorProps) {
  const iconRef = useRef<THREE.Group>(null);
  const cardTheme = useCurrentCardTheme();
  const suitTheme = suit ? cardTheme.suits[suit] : null;
  const suitColor = suitTheme?.accent ?? NO_TRUMP_COLOR;

  // Smooth rotation animation
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (iconRef.current) {
      iconRef.current.rotation.y = time * 0.3;
      // Gentle floating
      iconRef.current.position.y = 0.01 + Math.sin(time * 1.5) * 0.01;
    }
  });

  // The spin, float, brand pulse and embers loop forever: ambient motion, rendered at the idle
  // frame rate, so the indicator never keeps the table at full frame rate by itself
  return (
    <group position={[0, 0.03, 0]} userData={AMBIENT_USER_DATA}>
      {/* Smoke brand effect on table */}
      <SmokeBrand />

      {/* The deck's suit emblem, scaled up 3x */}
      <group ref={iconRef} position={[0, 0.01, 0]} scale={3}>
        <SuitEmblem symbol={suitTheme?.canvasSymbol ?? null} color={suitColor} />
      </group>

      {/* Ember particles */}
      <EmberParticles color={suitColor} />

      {/* The suit-coloured glow is TrumpIndicatorLight, mounted by GameTable in every phase */}
    </group>
  );
}
