'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling/ambient';

interface PhysicsTrumpIndicatorProps {
  suit: Suit | null;
}

/** 3D Mountains icon for GIANTS */
function MountainsIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <coneGeometry args={[0.1, 0.16, 4]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[-0.08, 0.05, 0]}>
        <coneGeometry args={[0.07, 0.1, 4]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0.08, 0.05, 0]}>
        <coneGeometry args={[0.07, 0.1, 4]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.035, 0.04, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}

/** 3D Crescent Moon with stars for ELVES */
function MoonIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 6]}>
        <torusGeometry args={[0.06, 0.02, 16, 32, Math.PI * 1.2]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[-0.02, 0.08, 0]}>
        <sphereGeometry args={[0.035, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>
      <group position={[0.06, 0.12, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.025]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
      {[
        { id: 'star-tl', pos: [-0.07, 0.11, 0.02] as [number, number, number], size: 0.012 },
        { id: 'star-br', pos: [0.04, 0.04, 0.01] as [number, number, number], size: 0.01 },
        { id: 'star-bl', pos: [-0.05, 0.04, -0.01] as [number, number, number], size: 0.008 },
        { id: 'star-tr', pos: [0.08, 0.08, -0.02] as [number, number, number], size: 0.01 },
      ].map((star) => (
        <mesh key={star.id} position={star.pos} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[star.size]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** 3D Anvil icon for DWARVES */
function AnvilIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.14, 0.03, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.04, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[0.15, 0.03, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.085, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.015, 0.06, 8]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

/** 3D Crown icon for HUMANS */
function CrownIcon({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.04, 32]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.sin(angle) * 0.065;
        const z = Math.cos(angle) * 0.065;
        return (
          <mesh key={i} position={[x, 0.07, z]}>
            <coneGeometry args={[0.02, 0.08, 4]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.9} />
          </mesh>
        );
      })}
      {[0, 2, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.sin(angle) * 0.065;
        const z = Math.cos(angle) * 0.065;
        return (
          <mesh key={`jewel-${i}`} position={[x, 0.115, z]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.3} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Generic crystal for unknown suit */
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

function SuitIcon({ suit, color }: { suit: Suit | null; color: string }) {
  switch (suit) {
    case Suit.GIANTS:
      return <MountainsIcon color={color} />;
    case Suit.ELVES:
      return <MoonIcon color={color} />;
    case Suit.DWARVES:
      return <AnvilIcon color={color} />;
    case Suit.HUMANS:
      return <CrownIcon color={color} />;
    default:
      return <CrystalIcon color={color} />;
  }
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
  const suitColor = suit ? cardTheme.suits[suit].accent : NO_TRUMP_COLOR;

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

      {/* 3D Icon - scaled up 3x */}
      <group ref={iconRef} position={[0, 0.01, 0]} scale={3}>
        <SuitIcon suit={suit} color={suitColor} />
      </group>

      {/* Ember particles */}
      <EmberParticles color={suitColor} />

      {/* The suit-coloured glow is TrumpIndicatorLight, mounted by GameTable in every phase */}
    </group>
  );
}
