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

interface Card3DProps {
  card: ICard;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  onDragToTable?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  faceDown?: boolean;
  scale?: number;
}

export function Card3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  onDragToTable,
  onDragStart,
  onDragEnd,
  isPlayable = false,
  isSelected = false,
  scale = 1,
}: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  // Smoothed values for physics
  const smoothValues = useRef({
    y: 0,
    scale: scale,
    tiltX: 0,
    tiltZ: 0,
    progress: 0,
  });

  // Base states
  const isActive = hovered && isPlayable;

  useFrame((state) => {
    if (groupRef.current) {
      // Calculate target values based on state
      let targetY = 0;
      let targetScale = scale;
      let targetTiltX = 0;
      let targetTiltZ = 0;

      if (isDragging) {
        const progress = smoothValues.current.progress;
        targetY = 0.15 + progress * 0.1;
        targetScale = scale * (1.0 - progress * 0.25);
        targetTiltX = progress * 0.4;
        const horizontalDrag = dragOffset.current.x;
        targetTiltZ = THREE.MathUtils.clamp(horizontalDrag * -0.002, -0.15, 0.15);
      } else if (isSelected) {
        targetY = 0.12;
        targetScale = scale * 1.02;
      } else if (isActive) {
        targetY = 0.06;
        targetScale = scale * 1.01;
      }

      // Smooth all values with physics-like interpolation
      const lerpSpeed = isDragging ? 0.12 : 0.08;
      smoothValues.current.y = THREE.MathUtils.lerp(smoothValues.current.y, targetY, lerpSpeed);
      smoothValues.current.scale = THREE.MathUtils.lerp(smoothValues.current.scale, targetScale, lerpSpeed);
      smoothValues.current.tiltX = THREE.MathUtils.lerp(smoothValues.current.tiltX, targetTiltX, 0.08);
      smoothValues.current.tiltZ = THREE.MathUtils.lerp(smoothValues.current.tiltZ, targetTiltZ, 0.1);
      smoothValues.current.progress = THREE.MathUtils.lerp(smoothValues.current.progress, dragProgress, 0.1);

      // Apply position
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], 0.15);
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        position[1] + smoothValues.current.y,
        0.15
      );
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], 0.15);

      // Apply scale
      groupRef.current.scale.setScalar(smoothValues.current.scale);

      // Apply rotation
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        rotation[0] + smoothValues.current.tiltX,
        0.1
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        rotation[2] + smoothValues.current.tiltZ,
        0.1
      );

      // Gentle floating when selected but not dragging
      if (isSelected && !isDragging) {
        groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 2.5) * 0.008;
      }
    }
  });

  // Global pointer move listener for dragging
  useEffect(() => {
    if (!isDragging) return;

    const PLAY_THRESHOLD = 80;

    const handlePointerMove = (e: PointerEvent) => {
      dragOffset.current = {
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      };
      const dragUp = dragStartPos.current.y - e.clientY;
      const progress = THREE.MathUtils.clamp(dragUp / PLAY_THRESHOLD, 0, 1);
      setDragProgress(progress);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dragDistanceY = dragStartPos.current.y - e.clientY;
      if (dragDistanceY > PLAY_THRESHOLD) {
        onDragToTable?.();
      }
      setIsDragging(false);
      setDragProgress(0);
      dragOffset.current = { x: 0, y: 0 };
      document.body.style.cursor = 'pointer';
      onDragEnd?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, onDragToTable, onDragEnd]);

  // Create materials once per card identity using useMemo
  const materials = useMemo(() => {
    return createCardMaterials(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, card.type, card.suit, card.value]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      disposeCardMaterials(materials);
    };
  }, [materials]);

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
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
        if (!isDragging) document.body.style.cursor = 'auto';
      }}
      onPointerDown={(e) => {
        if (isPlayable && isSelected) {
          e.stopPropagation();
          setIsDragging(true);
          setDragProgress(0);
          dragStartPos.current = { x: e.clientX, y: e.clientY };
          dragOffset.current = { x: 0, y: 0 };
          document.body.style.cursor = 'grabbing';
          onDragStart?.();
        }
      }}
    >
      <mesh ref={meshRef} material={materials}>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS]} />
      </mesh>
    </group>
  );
}
