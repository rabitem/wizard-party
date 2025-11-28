'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAY_ZONE_VISUAL_RADIUS } from '../../hooks/useDragToPlay';

interface PlayZoneProps {
  visible: boolean;
  proximity: number; // 0 = far, 1 = in zone
  isInZone: boolean;
  position?: [number, number, number];
}

/**
 * Visual drop zone indicator on the table
 * Shows a glowing ring that pulses and changes color based on card proximity
 */
export function PlayZone({
  visible,
  proximity,
  isInZone,
  position = [0, 0.03, 0],
}: PlayZoneProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  // Colors
  const neutralColor = useMemo(() => new THREE.Color('#4488ff'), []);
  const activeColor = useMemo(() => new THREE.Color('#44ff88'), []);
  const glowColor = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame((state) => {
    if (!ringRef.current || !innerGlowRef.current) return;

    const time = state.clock.elapsedTime;

    // Pulse animation
    pulseRef.current = Math.sin(time * 4) * 0.5 + 0.5;

    // Ring material
    const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
    const innerMat = innerGlowRef.current.material as THREE.MeshBasicMaterial;

    if (visible) {
      // Lerp color based on proximity and zone state
      const targetColor = isInZone ? activeColor : neutralColor;
      ringMat.color.lerp(targetColor, 0.1);
      innerMat.color.lerp(isInZone ? glowColor : targetColor, 0.1);

      // Opacity based on proximity with pulse
      const baseOpacity = 0.3 + proximity * 0.5;
      const pulseAmount = isInZone ? 0.2 : 0.1;
      ringMat.opacity = THREE.MathUtils.lerp(
        ringMat.opacity,
        baseOpacity + pulseRef.current * pulseAmount,
        0.15
      );

      // Inner glow stronger when in zone
      innerMat.opacity = THREE.MathUtils.lerp(
        innerMat.opacity,
        isInZone ? 0.25 + pulseRef.current * 0.15 : proximity * 0.15,
        0.15
      );

      // Scale pulse when in zone
      const targetScale = isInZone ? 1.0 + pulseRef.current * 0.05 : 1.0;
      ringRef.current.scale.setScalar(THREE.MathUtils.lerp(ringRef.current.scale.x, targetScale, 0.1));
      innerGlowRef.current.scale.setScalar(THREE.MathUtils.lerp(innerGlowRef.current.scale.x, targetScale, 0.1));
    } else {
      // Fade out
      ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0, 0.15);
      innerMat.opacity = THREE.MathUtils.lerp(innerMat.opacity, 0, 0.15);
    }
  });

  return (
    <group position={position}>
      {/* Outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLAY_ZONE_VISUAL_RADIUS - 0.08, PLAY_ZONE_VISUAL_RADIUS, 64]} />
        <meshBasicMaterial
          color={neutralColor}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow */}
      <mesh ref={innerGlowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[PLAY_ZONE_VISUAL_RADIUS - 0.1, 64]} />
        <meshBasicMaterial
          color={neutralColor}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Dashed ring indicator */}
      <DashedRing visible={visible} proximity={proximity} isInZone={isInZone} />
    </group>
  );
}

interface DashedRingProps {
  visible: boolean;
  proximity: number;
  isInZone: boolean;
}

/**
 * Animated dashed ring that rotates when active
 */
function DashedRing({ visible, proximity, isInZone }: DashedRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create dashed ring geometry
  const segments = 24;
  const dashRatio = 0.6; // 60% dash, 40% gap

  useFrame((state, delta) => {
    if (!groupRef.current || !materialRef.current) return;

    // Rotate when visible
    if (visible) {
      const rotationSpeed = isInZone ? 1.5 : 0.5;
      groupRef.current.rotation.z += delta * rotationSpeed;
    }

    // Fade opacity
    const targetOpacity = visible ? (0.2 + proximity * 0.4) : 0;
    materialRef.current.opacity = THREE.MathUtils.lerp(
      materialRef.current.opacity,
      targetOpacity,
      0.1
    );

    // Color based on state
    const targetColor = isInZone ? '#44ff88' : '#4488ff';
    materialRef.current.color.lerp(new THREE.Color(targetColor), 0.1);
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * Math.PI * 2;
        const arcLength = (Math.PI * 2 / segments) * dashRatio;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle + arcLength / 2) * (PLAY_ZONE_VISUAL_RADIUS + 0.05),
              Math.sin(angle + arcLength / 2) * (PLAY_ZONE_VISUAL_RADIUS + 0.05),
              0,
            ]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            <planeGeometry args={[0.12, 0.02]} />
            <meshBasicMaterial
              ref={i === 0 ? materialRef : undefined}
              color="#4488ff"
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

interface GhostCardProps {
  visible: boolean;
  card?: { suit: string; value: number };
  position?: [number, number, number];
}

/**
 * Semi-transparent ghost card showing where the card will land
 */
export function GhostCard({
  visible,
  position = [0, 0.1, 0],
}: GhostCardProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    const targetOpacity = visible ? 0.3 : 0;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);

    // Gentle hover
    if (visible) {
      meshRef.current.position.y = position[1] + Math.sin(performance.now() * 0.003) * 0.02;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[0.7 * 0.9, 1.0 * 0.9]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
