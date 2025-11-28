'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Seeded pseudo-random number generator for deterministic particle positions
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

interface AmbientDustProps {
  count?: number;
  radius?: number;
  height?: number;
}

/**
 * Floating dust particles in the air for atmospheric depth
 */
export function AmbientDust({
  count = 50,
  radius = 5,
  height = 4,
}: AmbientDustProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, speeds, phases } = useMemo(() => {
    // Use deterministic seeded random for particle positions
    const rand = seededRandom(42);
    const positions = new Float32Array(count * 3);
    const speeds: number[] = [];
    const phases: number[] = [];

    for (let i = 0; i < count; i++) {
      // Cylindrical distribution around table
      const theta = rand() * Math.PI * 2;
      const r = rand() * radius;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = rand() * height + 0.5;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      speeds.push(0.1 + rand() * 0.2);
      phases.push(rand() * Math.PI * 2);
    }

    return { positions, speeds, phases };
  }, [count, radius, height]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Gentle floating motion
      const speed = speeds[i];
      const phase = phases[i];

      // Slow upward drift with horizontal sway
      posArray[i * 3] += Math.sin(time * speed + phase) * 0.001;
      posArray[i * 3 + 1] += speed * 0.002;
      posArray[i * 3 + 2] += Math.cos(time * speed * 1.3 + phase) * 0.001;

      // Reset particles that float too high
      if (posArray[i * 3 + 1] > height + 0.5) {
        posArray[i * 3 + 1] = 0.5;
        // Re-randomize horizontal position
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        posArray[i * 3] = Math.cos(theta) * r;
        posArray[i * 3 + 2] = Math.sin(theta) * r;
      }
    }

    positionAttr.needsUpdate = true;

    // Subtle opacity variation
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.25 + Math.sin(time * 0.5) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffeedd"
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface LightRaysProps {
  position?: [number, number, number];
}

/**
 * Volumetric light cone effect from overhead light
 */
export function LightRays({ position = [0, 8, 0] }: LightRaysProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    // Subtle flicker
    material.opacity = 0.03 + Math.sin(state.clock.elapsedTime * 2) * 0.005;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, 0]}>
      <coneGeometry args={[3, 8, 32, 1, true]} />
      <meshBasicMaterial
        color="#fff8e0"
        transparent
        opacity={0.03}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
