'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card3D } from './Card3D';
import { ICard } from '@shared/domain';

interface PlayerHandProps {
  cards: ICard[];
  playableCardIds: string[];
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onCardPlay: (cardId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isCurrentPlayer = false,
  animation = 'none',
}: PlayerHandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const animationStartRef = useRef(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Track animation start time - using performance.now() during render is intentional for animation timing
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

  const cardPositions = useMemo(() => {
    const count = cards.length;
    if (count === 0) return [];

    const positions: {
      pos: [number, number, number];
      rot: [number, number, number];
      animOffset: { x: number; y: number; z: number; rotZ: number };
    }[] = [];

    // Fan layout with tight overlap
    const cardSpacing = 0.28; // Tight overlap
    const totalWidth = (count - 1) * cardSpacing;
    const startX = -totalWidth / 2;
    const arcHeight = 0.15; // Slight arc

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const x = startX + i * cardSpacing;

      // Slight arc - middle cards higher
      const y = -Math.pow((t - 0.5) * 2, 2) * arcHeight + arcHeight;

      // Z stacking - cards in front overlap those behind
      const z = i * 0.015;

      // Slight rotation for fan effect
      const rotZ = (t - 0.5) * -0.15;

      // Animation offsets for shuffle/sort effects
      const animOffset = { x: 0, y: 0, z: 0, rotZ: 0 };

      positions.push({
        pos: [x, y, z],
        rot: [0, 0, rotZ],
        animOffset,
      });
    }

    return positions;
  }, [cards.length]);

  // Calculate per-card animation offsets
  const getCardAnimOffset = (index: number, cardId: string) => {
    if (animationProgress === 0 || animation === 'none') {
      return { x: 0, y: 0, z: 0, rotZ: 0 };
    }

    // Ease out cubic for smooth animation
    const easeOut = 1 - Math.pow(1 - animationProgress, 3);
    // Bounce effect in the middle of animation
    const bounce = Math.sin(animationProgress * Math.PI);

    if (animation === 'shuffle') {
      // Shuffle: cards scatter randomly then come back together
      // Use card id hash for consistent random offset per card
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
      // Sort: cards lift up in a wave pattern, then settle
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

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {cards.map((card, index) => {
        const isPlayable = playableCardIds.includes(card.id);
        const isSelected = selectedCardId === card.id;
        const cardPos = cardPositions[index];

        if (!cardPos) return null;

        // Get animation offset for this card
        const animOffset = getCardAnimOffset(index, card.id);

        // Apply animation offset to position and rotation
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

        return (
          <Card3D
            key={card.id}
            card={card}
            position={animatedPos}
            rotation={animatedRot}
            scale={0.65}
            isPlayable={isCurrentPlayer && isPlayable}
            isSelected={isSelected}
            onClick={() => isCurrentPlayer && isPlayable && onCardSelect(card.id)}
            onDragToTable={() => isCurrentPlayer && isPlayable && isSelected && onCardPlay(card.id)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            faceDown={card.id === 'hidden'}
          />
        );
      })}
    </group>
  );
}
