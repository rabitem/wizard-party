'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_THICKNESS,
  createCardMaterials,
  disposeCardMaterials,
} from '../../utils/card-texture';
import {
  DRAG_CONFIG,
  FEEDBACK_CONFIG,
  SPRING_CONFIG,
  clamp,
} from '../../config/physics.config';

interface DraggedCardProps {
  card: ICard;
  worldPosition: THREE.Vector3;
  playZoneProximity: number;
  isInPlayZone: boolean;
  baseScale?: number;
}

/**
 * Card rendered in world space during drag operations.
 * Separate from hand for accurate cursor tracking.
 */
export function DraggedCard({
  card,
  worldPosition,
  playZoneProximity,
  isInPlayZone,
  baseScale = 0.65,
}: DraggedCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Physics state - explicitly typed to allow reassignment
  const physics = useRef<{
    posX: number;
    posY: number;
    posZ: number;
    lastX: number;
    lastZ: number;
    velX: number;
    velZ: number;
    tiltX: number;
    tiltZ: number;
    scale: number;
    glowIntensity: number;
    wobblePhase: number;
  }>({
    // Position (smoothed)
    posX: worldPosition.x,
    posY: DRAG_CONFIG.DRAG_ELEVATION_BASE,
    posZ: worldPosition.z,

    // Velocity tracking for tilt
    lastX: worldPosition.x,
    lastZ: worldPosition.z,
    velX: 0,
    velZ: 0,

    // Tilt (velocity-based)
    tiltX: 0,
    tiltZ: 0,

    // Scale
    scale: baseScale * DRAG_CONFIG.SCALE_MULTIPLIER,

    // Glow
    glowIntensity: 0,

    // Wobble phase
    wobblePhase: 0,
  });

  // Create materials
  const materials = useMemo(() => {
    return createCardMaterials(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.type, card.suit, card.value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeCardMaterials(materials);
    };
  }, [materials]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const p = physics.current;

    // Target position - card follows cursor directly (very responsive)
    const targetX = worldPosition.x;
    const targetZ = worldPosition.z;
    const targetY = DRAG_CONFIG.DRAG_ELEVATION_BASE +
                    playZoneProximity * DRAG_CONFIG.DRAG_ELEVATION_PROXIMITY;

    // Fast position follow - almost instant
    p.posX = p.posX + (targetX - p.posX) * SPRING_CONFIG.LERP_SPEED.FAST;
    p.posZ = p.posZ + (targetZ - p.posZ) * SPRING_CONFIG.LERP_SPEED.FAST;
    p.posY = p.posY + (targetY - p.posY) * SPRING_CONFIG.LERP_SPEED.MEDIUM;

    // Calculate velocity for tilt
    p.velX = (p.posX - p.lastX) / dt;
    p.velZ = (p.posZ - p.lastZ) / dt;
    p.lastX = p.posX;
    p.lastZ = p.posZ;

    // Velocity-based tilt (card tilts in direction of movement)
    const targetTiltX = clamp(
      -p.velZ * FEEDBACK_CONFIG.VELOCITY_TILT_FACTOR,
      -FEEDBACK_CONFIG.MAX_TILT,
      FEEDBACK_CONFIG.MAX_TILT
    );
    const targetTiltZ = clamp(
      p.velX * FEEDBACK_CONFIG.VELOCITY_TILT_FACTOR,
      -FEEDBACK_CONFIG.MAX_TILT,
      FEEDBACK_CONFIG.MAX_TILT
    );

    // Smooth tilt transitions
    p.tiltX = p.tiltX + (targetTiltX - p.tiltX) * 0.15;
    p.tiltZ = p.tiltZ + (targetTiltZ - p.tiltZ) * 0.15;

    // Scale
    const targetScale = baseScale * DRAG_CONFIG.SCALE_MULTIPLIER;
    p.scale = p.scale + (targetScale - p.scale) * SPRING_CONFIG.LERP_SPEED.MEDIUM;

    // Glow intensity based on proximity and zone
    const targetGlow = isInPlayZone
      ? FEEDBACK_CONFIG.GLOW_OPACITY_DRAG
      : playZoneProximity * FEEDBACK_CONFIG.GLOW_OPACITY_SELECT;
    p.glowIntensity = p.glowIntensity + (targetGlow - p.glowIntensity) * FEEDBACK_CONFIG.GLOW_LERP_SPEED;

    // Wobble (subtle life)
    p.wobblePhase += dt * FEEDBACK_CONFIG.WOBBLE_SPEED.X;
    const wobbleX = Math.sin(p.wobblePhase) * FEEDBACK_CONFIG.WOBBLE_INTENSITY.DRAG;
    const wobbleZ = Math.cos(p.wobblePhase * 0.85) * FEEDBACK_CONFIG.WOBBLE_INTENSITY.DRAG * 0.8;

    // Apply transforms
    groupRef.current.position.set(p.posX, p.posY, p.posZ);
    groupRef.current.rotation.set(
      -Math.PI / 2 + p.tiltX + wobbleX,
      0,
      p.tiltZ + wobbleZ
    );
    groupRef.current.scale.setScalar(p.scale);

    // Update glow
    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = p.glowIntensity;
      glowMat.color.setHex(isInPlayZone ? 0x44ff88 : 0x4488ff);
    }
  });

  return (
    <group ref={groupRef} position={[worldPosition.x, DRAG_CONFIG.DRAG_ELEVATION_BASE, worldPosition.z]}>
      {/* Main card mesh - face up */}
      <mesh material={materials} castShadow>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS]} />
      </mesh>

      {/* Glow ring effect */}
      <mesh ref={glowRef} position={[0, 0, CARD_THICKNESS / 2 + 0.005]}>
        <ringGeometry args={[
          Math.max(CARD_WIDTH, CARD_HEIGHT) * 0.52,
          Math.max(CARD_WIDTH, CARD_HEIGHT) * 0.58,
          32
        ]} />
        <meshBasicMaterial
          color={isInPlayZone ? '#44ff88' : '#4488ff'}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner glow fill */}
      <mesh position={[0, 0, CARD_THICKNESS / 2 + 0.003]}>
        <planeGeometry args={[CARD_WIDTH + 0.08, CARD_HEIGHT + 0.08]} />
        <meshBasicMaterial
          color={isInPlayZone ? '#44ff88' : '#4488ff'}
          transparent
          opacity={physics.current.glowIntensity * 0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Drop shadow on table */}
      <mesh
        position={[0.03, -0.01, -DRAG_CONFIG.DRAG_ELEVATION_BASE + 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[CARD_WIDTH * 0.85, CARD_HEIGHT * 0.85]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.25 + playZoneProximity * 0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
