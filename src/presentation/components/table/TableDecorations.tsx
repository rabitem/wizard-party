'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Decorative chip stacks around the table
 */
export function ChipStacks() {
  // Position chip stacks at various locations around the table
  const stackPositions: Array<{
    pos: [number, number, number];
    colors: string[];
    heights: number[];
  }> = useMemo(() => [
    {
      pos: [-2.2, 0.02, 1.8],
      colors: ['#c41e3a', '#c41e3a', '#1e90ff', '#1e90ff', '#228b22'],
      heights: [0, 0.025, 0.05, 0.075, 0.1],
    },
    {
      pos: [2.3, 0.02, 1.6],
      colors: ['#1e90ff', '#1e90ff', '#1e90ff', '#ffd700'],
      heights: [0, 0.025, 0.05, 0.075],
    },
    {
      pos: [-2.0, 0.02, -1.9],
      colors: ['#228b22', '#228b22', '#c41e3a'],
      heights: [0, 0.025, 0.05],
    },
    {
      pos: [2.1, 0.02, -1.7],
      colors: ['#ffd700', '#ffd700', '#1e90ff', '#1e90ff', '#c41e3a', '#c41e3a'],
      heights: [0, 0.025, 0.05, 0.075, 0.1, 0.125],
    },
  ], []);

  return (
    <group>
      {stackPositions.map((stack, stackIdx) => (
        <group key={stackIdx} position={stack.pos}>
          {stack.colors.map((color, chipIdx) => (
            <Chip
              key={chipIdx}
              position={[0, stack.heights[chipIdx], 0]}
              color={color}
              rotation={(stackIdx * 0.3 + chipIdx * 0.15) % (Math.PI * 2)}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

interface ChipProps {
  position: [number, number, number];
  color: string;
  rotation?: number;
}

function Chip({ position, color, rotation = 0 }: ChipProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main chip body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Edge detail ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.005, 8, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Center inlay */}
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.5}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}

/**
 * Drink coasters around the table edge
 */
export function Coasters() {
  const coasterPositions: [number, number, number][] = useMemo(() => [
    [3.0, 0.01, 0],
    [-3.0, 0.01, 0],
    [0, 0.01, 3.0],
    [2.1, 0.01, 2.1],
    [-2.1, 0.01, 2.1],
  ], []);

  return (
    <group>
      {coasterPositions.map((pos, i) => (
        <Coaster key={i} position={pos} rotation={i * 0.4} />
      ))}
    </group>
  );
}

interface CoasterProps {
  position: [number, number, number];
  rotation?: number;
}

function Coaster({ position, rotation = 0 }: CoasterProps) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, rotation, 0]} receiveShadow>
      <cylinderGeometry args={[0.12, 0.12, 0.008, 24]} />
      <meshStandardMaterial
        color="#2a1810"
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  );
}

/**
 * Dealer button
 */
export function DealerButton({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.025, 24]} />
      <meshStandardMaterial
        color="#f5f5f5"
        roughness={0.3}
        metalness={0.1}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * Contact shadow component - soft shadow under objects
 */
interface ContactShadowProps {
  position: [number, number, number];
  scale?: number;
  opacity?: number;
  blur?: number;
}

export function ContactShadow({
  position,
  scale = 1,
  opacity = 0.4,
}: ContactShadowProps) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.5 * scale, 32]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Ambient table glow - subtle light emanating from center
 */
export function TableCenterGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.5, 32]} />
      <meshBasicMaterial
        color="#ffd700"
        transparent
        opacity={0.1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * Scattered card backs (decoration for empty table)
 */
export function ScatteredCards({ visible = false }: { visible: boolean }) {
  if (!visible) return null;

  const cardPositions = useMemo(() => [
    { pos: [-1.5, 0.025, 0.8] as [number, number, number], rot: 0.3 },
    { pos: [1.2, 0.027, -0.5] as [number, number, number], rot: -0.2 },
    { pos: [0.3, 0.026, 1.2] as [number, number, number], rot: 0.8 },
  ], []);

  return (
    <group>
      {cardPositions.map((card, i) => (
        <mesh
          key={i}
          position={card.pos}
          rotation={[-Math.PI / 2, card.rot, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.7 * 0.5, 1.0 * 0.5]} />
          <meshStandardMaterial
            color="#1a237e"
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
