'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_THICKNESS,
  createCardMaterials,
  disposeCardMaterials,
} from '../utils/card-texture';
import {
  SPRING_CONFIG,
  DRAG_CONFIG,
  FEEDBACK_CONFIG,
  springForce,
} from '../config/physics.config';

interface Card3DProps {
  card: ICard;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  onDragStart?: (worldPosition: THREE.Vector3, screenX: number, screenY: number) => void;
  onDragMove?: (screenX: number, screenY: number) => void;
  onDragEnd?: () => void;
  onDoubleTap?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  dragWorldPosition?: THREE.Vector3;
  playZoneProximity?: number;
  isInPlayZone?: boolean;
  faceDown?: boolean;
  scale?: number;
}

export function Card3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDoubleTap,
  isPlayable = false,
  isSelected = false,
  isDragging = false,
  scale = 1,
}: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [localDragging, setLocalDragging] = useState(false);
  const lastTapRef = useRef(0);

  // Physics state
  const physics = useRef({
    y: 0,
    yVelocity: 0,
    scale: scale,
    scaleVelocity: 0,
    wobbleX: 0,
    wobbleZ: 0,
    glowIntensity: 0,
    wobblePhase: Math.random() * Math.PI * 2, // Random start phase
  });

  // World position for drag start
  const worldPosRef = useRef(new THREE.Vector3());

  // Combined dragging state
  const isCurrentlyDragging = isDragging || localDragging;
  const isActive = hovered && isPlayable;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const p = physics.current;

    // Target values based on state
    let targetY = 0;
    let targetScale = scale;
    let targetGlow = 0;
    let wobbleIntensity: number = FEEDBACK_CONFIG.WOBBLE_INTENSITY.IDLE;

    if (isSelected && !isCurrentlyDragging) {
      targetY = DRAG_CONFIG.SELECT_ELEVATION;
      targetScale = scale * FEEDBACK_CONFIG.SELECT_SCALE;
      targetGlow = FEEDBACK_CONFIG.GLOW_OPACITY_SELECT;
      wobbleIntensity = FEEDBACK_CONFIG.WOBBLE_INTENSITY.SELECT;
    } else if (isActive) {
      targetY = DRAG_CONFIG.HOVER_ELEVATION;
      targetScale = scale * FEEDBACK_CONFIG.HOVER_SCALE;
      targetGlow = FEEDBACK_CONFIG.GLOW_OPACITY_HOVER;
      wobbleIntensity = FEEDBACK_CONFIG.WOBBLE_INTENSITY.HOVER;
    }

    // Spring physics for Y
    const ySpring = springForce(
      p.y, targetY, p.yVelocity,
      SPRING_CONFIG.STIFFNESS,
      SPRING_CONFIG.DAMPING,
      dt
    );
    p.y = ySpring.value;
    p.yVelocity = ySpring.velocity;

    // Spring physics for scale
    const scaleSpring = springForce(
      p.scale, targetScale, p.scaleVelocity,
      SPRING_CONFIG.STIFFNESS * 0.6,
      SPRING_CONFIG.DAMPING * 1.2,
      dt
    );
    p.scale = scaleSpring.value;
    p.scaleVelocity = scaleSpring.velocity;

    // Glow fade
    p.glowIntensity += (targetGlow - p.glowIntensity) * FEEDBACK_CONFIG.GLOW_LERP_SPEED;

    // Wobble animation
    p.wobblePhase += dt * FEEDBACK_CONFIG.WOBBLE_SPEED.X;
    p.wobbleX = Math.sin(p.wobblePhase) * wobbleIntensity;
    p.wobbleZ = Math.cos(p.wobblePhase * (FEEDBACK_CONFIG.WOBBLE_SPEED.Z / FEEDBACK_CONFIG.WOBBLE_SPEED.X)) * wobbleIntensity * 0.8;

    // Apply position (smooth return to hand position)
    groupRef.current.position.x += (position[0] - groupRef.current.position.x) * SPRING_CONFIG.LERP_SPEED.SLOW;
    groupRef.current.position.z += (position[2] - groupRef.current.position.z) * SPRING_CONFIG.LERP_SPEED.SLOW;
    groupRef.current.position.y = position[1] + p.y;

    // Floating animation when selected
    if (isSelected && !isCurrentlyDragging) {
      groupRef.current.position.y += Math.sin(time * 2.5) * 0.01;
    }

    // Apply scale
    groupRef.current.scale.setScalar(p.scale);

    // Apply rotation with wobble
    groupRef.current.rotation.x = rotation[0] + p.wobbleX;
    groupRef.current.rotation.z = rotation[2] + p.wobbleZ;

    // Update glow material
    if (glowRef.current && p.glowIntensity > 0.001) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = p.glowIntensity;
    }
  });

  // Global pointer listeners for drag
  useEffect(() => {
    if (!localDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      onDragMove?.(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      setLocalDragging(false);
      document.body.style.cursor = isPlayable ? 'pointer' : 'auto';
      onDragEnd?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [localDragging, onDragMove, onDragEnd, isPlayable]);

  // Create materials
  const materials = useMemo(() => {
    return createCardMaterials(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.type, card.suit, card.value]);

  // Cleanup
  useEffect(() => {
    return () => {
      disposeCardMaterials(materials);
    };
  }, [materials]);

  // Handle pointer down
  const handlePointerDown = (e: THREE.Event & { stopPropagation: () => void; nativeEvent?: PointerEvent }) => {
    if (!isPlayable) return;

    e.stopPropagation();

    // Double-tap detection
    const now = Date.now();
    if (now - lastTapRef.current < DRAG_CONFIG.DOUBLE_TAP_WINDOW_MS) {
      onDoubleTap?.();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Get screen coordinates
    const nativeEvent = e.nativeEvent as PointerEvent | undefined;
    const screenX = nativeEvent?.clientX ?? 0;
    const screenY = nativeEvent?.clientY ?? 0;

    // Get world position
    if (groupRef.current) {
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      worldPosRef.current.copy(worldPos);

      setLocalDragging(true);
      document.body.style.cursor = 'grabbing';
      onDragStart?.(worldPos, screenX, screenY);
    }
  };

  // Hide when dragging (rendered separately in world space)
  const isHidden = isCurrentlyDragging;

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
      visible={!isHidden}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        if (isPlayable) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
        if (!localDragging) document.body.style.cursor = 'auto';
      }}
      onPointerDown={(e) => {
        handlePointerDown(e as unknown as THREE.Event & { stopPropagation: () => void });
      }}
    >
      {/* Main card mesh */}
      <mesh ref={meshRef} material={materials} castShadow receiveShadow>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS]} />
      </mesh>

      {/* Glow effect */}
      {(isActive || isSelected) && !isCurrentlyDragging && (
        <mesh ref={glowRef} position={[0, 0, -CARD_THICKNESS / 2 - 0.005]}>
          <planeGeometry args={[CARD_WIDTH + 0.12, CARD_HEIGHT + 0.12]} />
          <meshBasicMaterial
            color={isSelected ? '#44aaff' : '#4488ff'}
            transparent
            opacity={physics.current.glowIntensity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}
