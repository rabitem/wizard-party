'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Seeded pseudo-random number generator for deterministic particle generation
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

interface TrickWinParticlesProps {
  position: [number, number, number];
  active: boolean;
  color?: string;
  onComplete?: () => void;
}

const PARTICLE_COUNT = 60;
const DURATION = 2.0; // seconds

export function TrickWinParticles({
  position,
  active,
  color = '#ffd700',
  onComplete,
}: TrickWinParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startTimeRef = useRef<number | null>(null);
  const wasActiveRef = useRef(false);
  const isAnimatingRef = useRef(false);

  // Generate particle data with seeded random for consistency
  const { positions, velocities, colors: particleColors } = useMemo(() => {
    const rand = seededRandom(123);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];
    const particleColors = new Float32Array(PARTICLE_COUNT * 3);

    const baseColor = new THREE.Color(color);
    const goldColor = new THREE.Color('#ffd700');
    const whiteColor = new THREE.Color('#ffffff');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random outward velocity - burst pattern
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI;
      const speed = 1.5 + rand() * 2.5;

      velocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.sin(phi) * Math.sin(theta)) * speed * 1.5 + 1, // Bias upward
          Math.cos(phi) * speed * 0.5
        )
      );

      // Mix of colors: gold, white, and base color
      const colorChoice = rand();
      let particleColor: THREE.Color;
      if (colorChoice < 0.5) {
        particleColor = goldColor;
      } else if (colorChoice < 0.7) {
        particleColor = whiteColor;
      } else {
        particleColor = baseColor;
      }

      particleColors[i * 3] = particleColor.r;
      particleColors[i * 3 + 1] = particleColor.g;
      particleColors[i * 3 + 2] = particleColor.b;
    }

    return { positions, velocities, colors: particleColors };
  }, [color]);

  useFrame((state) => {
    // Detect rising edge of active prop
    if (active && !wasActiveRef.current) {
      wasActiveRef.current = true;
      isAnimatingRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
    }
    if (!active) {
      wasActiveRef.current = false;
    }

    if (!isAnimatingRef.current || !pointsRef.current) return;

    const elapsed = state.clock.elapsedTime - (startTimeRef.current ?? state.clock.elapsedTime);
    const progress = elapsed / DURATION;

    if (progress >= 1) {
      isAnimatingRef.current = false;
      startTimeRef.current = null;
      onComplete?.();
      return;
    }

    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;

    // Gravity
    const gravity = -4;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const velocity = velocities[i];

      // Update position with velocity and gravity
      posArray[i * 3] = velocity.x * elapsed;
      posArray[i * 3 + 1] = velocity.y * elapsed + 0.5 * gravity * elapsed * elapsed;
      posArray[i * 3 + 2] = velocity.z * elapsed;
    }

    positionAttr.needsUpdate = true;

    // Fade out opacity
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - Math.pow(progress, 2);
  });

  // Always render, but particles are invisible when not animating (opacity controlled in useFrame)
  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particleColors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Sparkle effect for continuous subtle particles
interface SparkleParticlesProps {
  position: [number, number, number];
  radius?: number;
  count?: number;
  color?: string;
}

const SPARKLE_COUNT = 20;

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
      // Gentle float animation
      posArray[i * 3 + 1] = Math.sin(time * 2 + phases[i]) * 0.1 + 0.15;
    }

    positionAttr.needsUpdate = true;

    // Twinkle effect
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
  });

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
