'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { NO_TRUMP_COLOR } from '@/presentation/config/trump-indicator.config';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling/ambient';
import { SmokeBrand, EmberParticles } from './TrumpAmbientEffects';
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
