'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Card3D } from './Card3D';
import { ICard } from '@shared/domain';
import { useDragToPlay } from '../hooks/useDragToPlay';

interface PlayerHandProps {
  cards: ICard[];
  playableCardIds: string[];
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onCardPlay: (cardId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragStateChange?: (
    isDragging: boolean,
    proximity: number,
    isInZone: boolean,
    cardId: string | null,
    worldPosition: THREE.Vector3 | null
  ) => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isCurrentPlayer?: boolean;
  animation?: 'none' | 'shuffle' | 'sort';
}

export function PlayerHand({
  cards,
  playableCardIds,
  selectedCardId,
  onCardSelect,
  onCardPlay,
  onDragStart,
  onDragEnd,
  onDragStateChange,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isCurrentPlayer = false,
  animation = 'none',
}: PlayerHandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const animationStartRef = useRef(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const { camera, size } = useThree();

  // Drag to play hook
  const { dragState, startDrag, updateDrag, endDrag } = useDragToPlay({
    onPlay: (cardId) => {
      if (isCurrentPlayer && playableCardIds.includes(cardId)) {
        onCardPlay(cardId);
      }
    },
  });

  // Notify parent of drag state changes
  const prevDragStateRef = useRef({ isDragging: false, proximity: 0, isInZone: false, cardId: null as string | null });
  useFrame(() => {
    const current = {
      isDragging: dragState.isDragging,
      proximity: dragState.playZoneProximity,
      isInZone: dragState.isInPlayZone,
      cardId: dragState.cardId,
    };

    // Always notify during drag for position updates, or on state changes
    if (
      current.isDragging ||
      current.isDragging !== prevDragStateRef.current.isDragging ||
      Math.abs(current.proximity - prevDragStateRef.current.proximity) > 0.01 ||
      current.isInZone !== prevDragStateRef.current.isInZone
    ) {
      prevDragStateRef.current = current;
      onDragStateChange?.(
        current.isDragging,
        current.proximity,
        current.isInZone,
        current.cardId,
        dragState.isDragging ? dragState.worldPosition : null
      );
    }
  });

  // Track animation start time
  const prevAnimationRef = useRef(animation);
  if (animation !== prevAnimationRef.current) {
    prevAnimationRef.current = animation;
    // eslint-disable-next-line react-hooks/purity -- Intentional: need current time for animation start
    animationStartRef.current = animation !== 'none' ? performance.now() : 0;
  }

  useFrame(() => {
    if (groupRef.current && isCurrentPlayer) {
      const breathe = Math.sin(performance.now() * 0.002) * 0.008;
      groupRef.current.position.y = position[1] + breathe;
    }

    // Update animation progress during animation
    if (animation !== 'none' && animationStartRef.current > 0) {
      const elapsed = performance.now() - animationStartRef.current;
      const duration = animation === 'shuffle' ? 550 : 500;
      const progress = Math.min(elapsed / duration, 1);
      if (progress !== animationProgress && progress <= 1) {
        setAnimationProgress(progress);
      }
    }
  });

  // Calculate hand layout parameters based on screen size and card count
  const handLayout = useMemo(() => {
    const count = cards.length;

    // Card dimensions (from card-texture.ts)
    const cardBaseWidth = 0.7;
    const baseScale = 0.65;
    const baseCardWidth = cardBaseWidth * baseScale;

    // Calculate visible width at the hand's distance from camera
    const handDistance = 2.5;
    const perspCamera = camera as THREE.PerspectiveCamera;
    const fov = perspCamera.fov || 55;
    const aspect = size.width / size.height;

    const vFovRad = (fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFovRad / 2) * handDistance;
    const visibleWidth = visibleHeight * aspect;

    // Leave 15% padding on each side
    const availableWidth = visibleWidth * 0.7;

    const preferredSpacing = 0.28;

    let cardSpacing = preferredSpacing;
    let cardScale = baseScale;

    if (count > 1) {
      const maxSpacing = (availableWidth - baseCardWidth) / (count - 1);
      cardSpacing = Math.min(preferredSpacing, Math.max(0.08, maxSpacing));

      if (cardSpacing < 0.15) {
        const scaleRatio = Math.max(0.55, cardSpacing / 0.15);
        cardScale = baseScale * scaleRatio;
        const newCardWidth = cardBaseWidth * cardScale;
        cardSpacing = Math.min(preferredSpacing, Math.max(0.06, (availableWidth - newCardWidth) / (count - 1)));
      }
    }

    return { cardSpacing, cardScale, preferredSpacing };
  }, [cards.length, camera, size.width, size.height]);

  const cardPositions = useMemo(() => {
    const count = cards.length;
    if (count === 0) return [];

    const positions: {
      pos: [number, number, number];
      rot: [number, number, number];
      animOffset: { x: number; y: number; z: number; rotZ: number };
    }[] = [];

    const { cardSpacing, preferredSpacing } = handLayout;
    const totalWidth = (count - 1) * cardSpacing;
    const startX = -totalWidth / 2;
    const arcHeight = cardSpacing < preferredSpacing ? 0.2 : 0.15;

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const x = startX + i * cardSpacing;

      // Slight arc - middle cards higher
      const y = -Math.pow((t - 0.5) * 2, 2) * arcHeight + arcHeight;

      // Z stacking
      const z = i * 0.015;

      // Fan rotation
      const fanAngle = cardSpacing < preferredSpacing ? 0.25 : 0.15;
      const rotZ = (t - 0.5) * -fanAngle;

      positions.push({
        pos: [x, y, z],
        rot: [0, 0, rotZ],
        animOffset: { x: 0, y: 0, z: 0, rotZ: 0 },
      });
    }

    return positions;
  }, [cards.length, handLayout]);

  // Calculate per-card animation offsets
  const getCardAnimOffset = (index: number, cardId: string) => {
    if (animationProgress === 0 || animation === 'none') {
      return { x: 0, y: 0, z: 0, rotZ: 0 };
    }

    const easeOut = 1 - Math.pow(1 - animationProgress, 3);
    const bounce = Math.sin(animationProgress * Math.PI);

    if (animation === 'shuffle') {
      const hash = cardId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const randomX = ((hash % 100) / 100 - 0.5) * 0.8;
      const randomY = ((hash % 73) / 73) * 0.4;
      const randomRot = ((hash % 47) / 47 - 0.5) * 0.8;

      return {
        x: randomX * bounce * (1 - easeOut),
        y: randomY * bounce + 0.15 * bounce,
        z: 0.1 * bounce,
        rotZ: randomRot * bounce * (1 - easeOut),
      };
    } else if (animation === 'sort') {
      const waveDelay = index * 0.08;
      const waveProgress = Math.max(0, Math.min(1, (animationProgress - waveDelay) * 2));
      const waveBounce = Math.sin(waveProgress * Math.PI);

      return {
        x: 0,
        y: waveBounce * 0.2,
        z: waveBounce * 0.05,
        rotZ: 0,
      };
    }

    return { x: 0, y: 0, z: 0, rotZ: 0 };
  };

  // Drag handlers
  const handleDragStart = useCallback((cardId: string, worldPosition: THREE.Vector3, screenX: number, screenY: number) => {
    if (!groupRef.current) return;

    // Use the card's world position directly for accurate grab offset
    startDrag(cardId, worldPosition, screenX, screenY, camera, size.width, size.height);
    onDragStart?.();
    onCardSelect(cardId); // Auto-select on drag
  }, [startDrag, onDragStart, onCardSelect, camera, size.width, size.height]);

  const handleDragMove = useCallback((screenX: number, screenY: number) => {
    updateDrag(screenX, screenY, camera, size.width, size.height);
  }, [updateDrag, camera, size.width, size.height]);

  const handleDragEnd = useCallback(() => {
    const result = endDrag();
    onDragEnd?.();

    // If not played, card animates back to hand automatically
    if (!result.played && result.cardId) {
      // Card stays selected for easy retry
    }
  }, [endDrag, onDragEnd]);

  const handleDoubleTap = useCallback((cardId: string) => {
    if (isCurrentPlayer && playableCardIds.includes(cardId)) {
      onCardPlay(cardId);
    }
  }, [isCurrentPlayer, playableCardIds, onCardPlay]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {cards.map((card, index) => {
        const isPlayable = playableCardIds.includes(card.id);
        const isSelected = selectedCardId === card.id;
        const cardPos = cardPositions[index];

        if (!cardPos) return null;

        const animOffset = getCardAnimOffset(index, card.id);

        const animatedPos: [number, number, number] = [
          cardPos.pos[0] + animOffset.x,
          cardPos.pos[1] + animOffset.y,
          cardPos.pos[2] + animOffset.z,
        ];
        const animatedRot: [number, number, number] = [
          cardPos.rot[0],
          cardPos.rot[1],
          cardPos.rot[2] + animOffset.rotZ,
        ];

        // Is this card being dragged?
        const isThisCardDragging = dragState.isDragging && dragState.cardId === card.id;

        return (
          <Card3D
            key={card.id}
            card={card}
            position={animatedPos}
            rotation={animatedRot}
            scale={handLayout.cardScale}
            isPlayable={isCurrentPlayer && isPlayable}
            isSelected={isSelected}
            isDragging={isThisCardDragging}
            dragWorldPosition={isThisCardDragging ? dragState.worldPosition : undefined}
            playZoneProximity={isThisCardDragging ? dragState.playZoneProximity : 0}
            isInPlayZone={isThisCardDragging ? dragState.isInPlayZone : false}
            onClick={() => isCurrentPlayer && isPlayable && onCardSelect(card.id)}
            onDragStart={(worldPos, screenX, screenY) => handleDragStart(card.id, worldPos, screenX, screenY)}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDoubleTap={() => handleDoubleTap(card.id)}
            faceDown={card.id === 'hidden'}
          />
        );
      })}
    </group>
  );
}
