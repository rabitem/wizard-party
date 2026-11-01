'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_LAND_DUST } from '../../config/physics.config';
import type { CardLandDustProps } from './cardLandDust.types';
import {
  generateParticleData,
  updateParticlePositions,
  calculateOpacity,
} from './cardLandDustParticles';
import { SoftPointsMaterial } from './particles/SoftPointsMaterial';

export function CardLandDust({
  position,
  active,
  color = CARD_LAND_DUST.COLOR_PRIMARY,
  onComplete,
}: CardLandDustProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const wasActiveRef = useRef(false);
  const isAnimatingRef = useRef(false);

  // Track trigger count to force particle regeneration on each dust burst
  const [triggerCount, setTriggerCount] = useState(0);

  // Generate particle data - recalculate on each trigger with new seed
  const particleData = useMemo(() => {
    return generateParticleData(color, triggerCount);
  }, [color, triggerCount]);

  useFrame((state) => {
    // Detect rising edge of active prop
    if (active && !wasActiveRef.current) {
      wasActiveRef.current = true;
      isAnimatingRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
      // Increment trigger count to regenerate particles with new random pattern
      setTriggerCount(prev => prev + 1);
    }
    if (!active) {
      wasActiveRef.current = false;
    }

    if (!isAnimatingRef.current || !pointsRef.current) return;

    const elapsed = state.clock.elapsedTime - (startTimeRef.current ?? state.clock.elapsedTime);
    const progress = elapsed / CARD_LAND_DUST.DURATION;

    if (progress >= 1) {
      isAnimatingRef.current = false;
      startTimeRef.current = null;
      onComplete?.();
      return;
    }

    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;

    updateParticlePositions(posArray, particleData, elapsed);
    positionAttr.needsUpdate = true;

    // Quick fade out
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = calculateOpacity(progress);
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particleData.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particleData.colors, 3]}
        />
      </bufferGeometry>
      <SoftPointsMaterial
        size={CARD_LAND_DUST.PARTICLE_SIZE}
        vertexColors
        opacity={0}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
