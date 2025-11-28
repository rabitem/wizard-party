'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh, Points, PointsMaterial, MeshBasicMaterial } from 'three';

/**
 * Environment setup with simple lighting
 * Creates a casino/poker room atmosphere
 */
export function GameEnvironment() {
  return (
    <>
      {/* Hemisphere light for ambient fill */}
      <hemisphereLight
        args={['#1a1a2e', '#0a0a12', 0.3]}
        position={[0, 10, 0]}
      />
    </>
  );
}

interface FogEffectProps {
  color?: string;
  near?: number;
  far?: number;
}

/**
 * Atmospheric fog for depth perception
 */
export function AtmosphericFog({
  color = '#0a0a18',
  near = 8,
  far = 25,
}: FogEffectProps) {
  const { scene } = useThree();

  useEffect(() => {
    if (!scene) return;
    scene.fog = new THREE.Fog(color, near, far);
    return () => {
      scene.fog = null;
    };
  }, [scene, color, near, far]);

  return null;
}

interface VolumetricLightProps {
  position?: [number, number, number];
  color?: string;
  intensity?: number;
}

/**
 * Enhanced volumetric light cone with animated dust motes
 */
export function VolumetricLight({
  position = [0, 8, 0],
  color = '#fff8e0',
  intensity = 1,
}: VolumetricLightProps) {
  const coneRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);

  // Generate dust particles inside the light cone
  const dustGeometry = useMemo(() => {
    const count = 80;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute within cone shape
      const t = Math.random(); // 0 at top, 1 at bottom
      const radius = t * 2.5; // Cone widens toward bottom
      const angle = Math.random() * Math.PI * 2;

      positions[i * 3] = Math.cos(angle) * radius * Math.random();
      positions[i * 3 + 1] = -t * 7; // Descending from light
      positions[i * 3 + 2] = Math.sin(angle) * radius * Math.random();

      sizes[i] = 0.02 + Math.random() * 0.03;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    return geometry;
  }, []);

  useFrame((state) => {
    if (!coneRef.current || !dustRef.current) return;

    const time = state.clock.elapsedTime;

    // Animate cone opacity (subtle flicker)
    const coneMat = coneRef.current.material as THREE.MeshBasicMaterial;
    coneMat.opacity = (0.025 + Math.sin(time * 2.3) * 0.008 + Math.sin(time * 5.7) * 0.003) * intensity;

    // Animate dust particles
    const posAttr = dustRef.current.geometry.attributes.position;
    const phaseAttr = dustRef.current.geometry.attributes.phase;
    const posArray = posAttr.array as Float32Array;
    const phaseArray = phaseAttr.array as Float32Array;

    for (let i = 0; i < posArray.length / 3; i++) {
      const phase = phaseArray[i];

      // Gentle drift
      posArray[i * 3] += Math.sin(time * 0.5 + phase) * 0.002;
      posArray[i * 3 + 1] -= 0.003; // Fall slowly
      posArray[i * 3 + 2] += Math.cos(time * 0.4 + phase * 1.3) * 0.002;

      // Reset particles that fall out
      if (posArray[i * 3 + 1] < -7) {
        posArray[i * 3 + 1] = 0;
        const radius = Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2;
        posArray[i * 3] = Math.cos(angle) * radius;
        posArray[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }

    posAttr.needsUpdate = true;

    // Dust twinkle
    const dustMat = dustRef.current.material as THREE.PointsMaterial;
    dustMat.opacity = (0.4 + Math.sin(time * 3) * 0.15) * intensity;
  });

  return (
    <group position={position}>
      {/* Light cone volume */}
      <mesh ref={coneRef} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[3, 8, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner brighter core */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.5, 7, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.015}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Dust motes in light beam */}
      <points ref={dustRef} geometry={dustGeometry}>
        <pointsMaterial
          color="#fffaf0"
          size={0.03}
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/**
 * Subtle smoke/haze layer floating above table
 */
export function TableHaze() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    // Gentle drift animation
    meshRef.current.rotation.z = time * 0.02;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.015 + Math.sin(time * 0.5) * 0.005;
  });

  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[5, 32]} />
      <meshBasicMaterial
        color="#8888aa"
        transparent
        opacity={0.02}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
