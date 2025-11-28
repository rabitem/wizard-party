'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CardTrailProps {
  targetRef: React.RefObject<THREE.Group | null>;
  color?: string;
  length?: number;
  opacity?: number;
  active?: boolean;
}

const TRAIL_LENGTH = 12;

/**
 * Creates a ghostly trail effect behind a moving card
 */
export function CardTrail({
  targetRef,
  color = '#ffd700',
  length = TRAIL_LENGTH,
  opacity = 0.3,
  active = true,
}: CardTrailProps) {
  const trailRef = useRef<THREE.Points>(null);
  const positionsRef = useRef<THREE.Vector3[]>(
    Array.from({ length }, () => new THREE.Vector3(0, -10, 0))
  );

  // Initialize trail positions buffer
  const positions = useMemo(() => {
    return new Float32Array(length * 3);
  }, [length]);

  // Create size array for fading trail
  const sizes = useMemo(() => {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = 0.03 * (1 - i / length); // Decreasing size
    }
    return arr;
  }, [length]);

  useFrame(() => {
    if (!trailRef.current || !targetRef.current || !active) return;

    // Shift positions back
    for (let i = length - 1; i > 0; i--) {
      positionsRef.current[i].copy(positionsRef.current[i - 1]);
    }

    // Set first position to current target position
    positionsRef.current[0].copy(targetRef.current.position);

    // Update buffer
    const positionAttr = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionAttr.array as Float32Array;

    for (let i = 0; i < length; i++) {
      posArray[i * 3] = positionsRef.current[i].x;
      posArray[i * 3 + 1] = positionsRef.current[i].y;
      posArray[i * 3 + 2] = positionsRef.current[i].z;
    }

    positionAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={trailRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

interface MotionBlurCardProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  velocity: THREE.Vector3;
  opacity?: number;
}

/**
 * Creates motion blur ghost images behind a fast-moving card
 */
export function MotionBlurGhost({
  position,
  rotation,
  scale,
  velocity,
  opacity = 0.15,
}: MotionBlurCardProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate ghost position based on velocity
  const ghostPosition = useMemo(() => {
    const speed = velocity.length();
    if (speed < 0.5) return null; // Only show ghost when moving fast

    return position.clone().sub(velocity.clone().normalize().multiplyScalar(0.1));
  }, [position, velocity]);

  if (!ghostPosition) return null;

  return (
    <mesh
      ref={meshRef}
      position={ghostPosition}
      rotation={rotation}
      scale={scale * 0.98}
    >
      <boxGeometry args={[0.7, 1.0, 0.02]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
