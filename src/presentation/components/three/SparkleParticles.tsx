'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AMBIENT_USER_DATA } from './frame-scheduling/ambient';
import { seededRandom } from './particleUtils';
import { SoftPointsMaterial } from './particles/SoftPointsMaterial';

// =============================================================================
// SparkleParticles Component
// Enhanced sparkle effect for ambient particle decorations
// =============================================================================

interface SparkleParticlesProps {
  position: [number, number, number];
  radius?: number;
  count?: number;
  color?: string;
}

const SPARKLE_COUNT = 25;

export function SparkleParticles({
  position,
  radius = 0.5,
  count = SPARKLE_COUNT,
  color = '#ffd700',
}: SparkleParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, phases } = useMemo(() => {
    const rand = seededRandom(456);
    const positions = new Float32Array(count * 3);
    const phases: number[] = [];

    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const r = rand() * radius;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = rand() * 0.3;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      phases.push(rand() * Math.PI * 2);
    }

    return { positions, phases };
  }, [count, radius]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] = Math.sin(time * 2 + phases[i]) * 0.1 + 0.15;
    }

    positionAttr.needsUpdate = true;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.5 + Math.sin(time * 4) * 0.25;
  });

  return (
    // Endless decorative twinkle: ambient, so it animates at the idle frame rate instead of
    // keeping the whole table at full rate (its position buffer changes every frame)
    <points ref={pointsRef} position={position} userData={AMBIENT_USER_DATA}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <SoftPointsMaterial
        sprite="spark"
        size={0.05}
        color={color}
        opacity={0.5}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// =============================================================================
// RingBurst Component
// Celebration ring burst effect
// =============================================================================

interface RingBurstProps {
  position: [number, number, number];
  active: boolean;
  color?: string;
}

export function RingBurst({ position, active, color = '#ffd700' }: RingBurstProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const wasActiveRef = useRef(false);
  const isAnimatingRef = useRef(false);

  useFrame((state) => {
    if (active && !wasActiveRef.current && !isAnimatingRef.current) {
      wasActiveRef.current = true;
      isAnimatingRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
    }
    if (!active && !isAnimatingRef.current) {
      wasActiveRef.current = false;
    }

    if (!isAnimatingRef.current || !ringRef.current) return;

    const elapsed = state.clock.elapsedTime - (startTimeRef.current ?? state.clock.elapsedTime);
    const duration = 1.5;
    const progress = elapsed / duration;

    if (progress >= 1) {
      isAnimatingRef.current = false;
      startTimeRef.current = null;
      ringRef.current.visible = false;
      return;
    }

    ringRef.current.visible = true;

    // Expand ring
    const scale = 0.5 + progress * 4;
    ringRef.current.scale.set(scale, scale, 1);

    // Fade out
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 1 - Math.pow(progress, 2);
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
