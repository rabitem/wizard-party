'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TURN_INDICATOR } from '../../config/physics.config';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling';
import { getGlowTexture } from '../three/themed-environments/primitives/glow';

interface PlayerSeatProps {
  position: [number, number, number];
  isCurrentTurn: boolean;
  isDealer: boolean;
}

/**
 * Additive glow under the seat whose turn it is. A mesh instead of a point light: three.js keys
 * every lit shader on the point-light count, so a light that follows the turn would add per-pixel
 * cost to every lit material and relink them all whenever no one has the turn.
 */
function TurnGlow() {
  const size = TURN_INDICATOR.GLOW_DISTANCE * 2;
  return (
    <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={getGlowTexture()}
        color={TURN_INDICATOR.GLOW_COLOR}
        opacity={TURN_INDICATOR.GLOW_INTENSITY}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Pulsing rings of the current turn (decorative: animates at the ambient frame rate when idle). */
function TurnIndicator() {
  const turnIndicatorRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Pulsing opacity for inner ring
    if (turnIndicatorRef.current) {
      const material = turnIndicatorRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = TURN_INDICATOR.OPACITY_BASE + Math.sin(time * TURN_INDICATOR.OPACITY_SPEED) * TURN_INDICATOR.OPACITY_RANGE;
      const scale = 1 + Math.sin(time * TURN_INDICATOR.SCALE_SPEED) * TURN_INDICATOR.SCALE_RANGE;
      turnIndicatorRef.current.scale.set(scale, scale, 1);
      turnIndicatorRef.current.rotation.z = time * TURN_INDICATOR.ROTATION_SPEED;
    }

    // Outer expanding ring effect
    if (outerRingRef.current) {
      const material = outerRingRef.current.material as THREE.MeshBasicMaterial;
      const cycle = (time * TURN_INDICATOR.OUTER_CYCLE_SPEED) % 1;
      const outerScale = 1 + cycle * TURN_INDICATOR.OUTER_SCALE_RANGE;
      outerRingRef.current.scale.set(outerScale, outerScale, 1);
      material.opacity = TURN_INDICATOR.OUTER_MAX_OPACITY * (1 - cycle);
    }
  });

  return (
    <group userData={AMBIENT_USER_DATA}>
      {/* Inner pulsing ring */}
      <mesh ref={turnIndicatorRef} position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.3, 24]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.5} />
      </mesh>

      {/* Outer expanding ring for emphasis */}
      <mesh ref={outerRingRef} position={[0, -0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.32, 24]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.3} />
      </mesh>

      <TurnGlow />
    </group>
  );
}

export function PlayerSeat({ position, isCurrentTurn, isDealer }: PlayerSeatProps) {
  return (
    <group position={position}>
      {/* Seat base */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.04, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>

      {/* Turn indicator - pulsing glow ring */}
      {isCurrentTurn ? <TurnIndicator /> : null}

      {/* Dealer chip */}
      {isDealer ? <mesh position={[0.28, -0.04, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.015, 8]} />
          <meshBasicMaterial color="#d4a84b" />
        </mesh> : null}
    </group>
  );
}
