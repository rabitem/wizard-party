'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  easeOutCubic,
  seededRandom,
} from '../../config/physics.config';
import type { CollectionAnimationProfile } from '../../config/collection-animation.config';
import { softPointSize } from '../../config/particle-sprite.config';
import { SoftPointsMaterial } from '../three/particles/SoftPointsMaterial';

/** Arrival spark size (equivalent square point) and how much it shrinks over the burst */
const ARRIVAL_POINT = { SIZE: 0.055, SHRINK: 0.02 } as const;

interface CollectionArrivalBurstProps {
  active: boolean;
  position: [number, number, number];
  profile: CollectionAnimationProfile;
  seed: string;
}

export function CollectionArrivalBurst({
  active,
  position,
  profile,
  seed,
}: CollectionArrivalBurstProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const animatingRef = useRef(false);

  const velocities = useMemo(() => {
    const rand = seededRandom(`${seed}:${profile.id}:arrival-burst`);
    const values = new Float32Array(profile.particleCount * 3);

    for (let i = 0; i < profile.particleCount; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 0.25 + rand() * 0.42;
      values[i * 3] = Math.cos(angle) * radius;
      values[i * 3 + 1] = 0.08 + rand() * 0.28;
      values[i * 3 + 2] = Math.sin(angle) * radius;
    }

    return values;
  }, [profile.id, profile.particleCount, seed]);

  const positions = useMemo(
    () => new Float32Array(profile.particleCount * 3),
    [profile.particleCount]
  );

  useFrame((state) => {
    if (active && !startedRef.current) {
      startedRef.current = true;
      animatingRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
      if (pointsRef.current) pointsRef.current.visible = true;
    }

    if (!animatingRef.current || !pointsRef.current) return;

    const elapsed = state.clock.elapsedTime - (startTimeRef.current ?? state.clock.elapsedTime);
    const duration = Math.max(0.16, profile.settleDuration);
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeOutCubic(progress);
    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;

    for (let i = 0; i < profile.particleCount; i++) {
      posArray[i * 3] = velocities[i * 3] * ease;
      posArray[i * 3 + 1] = velocities[i * 3 + 1] * ease - progress * progress * 0.06;
      posArray[i * 3 + 2] = velocities[i * 3 + 2] * ease;
    }

    positionAttr.needsUpdate = true;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = (1 - progress) * 0.82;
    material.size = softPointSize(ARRIVAL_POINT.SIZE - progress * ARRIVAL_POINT.SHRINK);

    if (progress >= 1) {
      animatingRef.current = false;
      pointsRef.current.visible = false;
    }
  });

  return (
    <points ref={pointsRef} position={position} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <SoftPointsMaterial
        color={profile.particleColor}
        size={ARRIVAL_POINT.SIZE}
        opacity={0}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
