'use client';

import { useMemo, useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Card3D } from './Card3D';
import { deriveHandCardVisualState } from './Card3D.motion';
import { ICard } from '@shared/domain';
import type { DropInfo } from '../hooks/useDragToPlay';
import { useHandAnimationClock, type HandAnimationType } from './PlayerHand.animation';
import { useHandDragSession } from './PlayerHand.hooks';
import type { DragStatePublication } from './PlayerHand.drag';
import { calcCardPositions, calcHandLayout, isCoarsePointer } from './PlayerHand.fit';
import { HAND_CONFIG } from '../config/layout.config';
import { useStageViewport } from './three/stage-viewport';
import { applyAnimRotation, getCardAnimOffset, toPositionOffset } from './PlayerHand.layout';

export type { DragStatePublication } from './PlayerHand.drag';

interface PlayerHandProps {
  cards: ICard[];
  playableCardIds: string[];
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onCardPlay: (cardId: string, dropInfo?: DropInfo) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragStateChange?: (publication: DragStatePublication) => void;
  onAnimationProgress?: (progress: number) => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isCurrentPlayer?: boolean;
  animation?: HandAnimationType;
}

export function PlayerHand({
  cards, playableCardIds, selectedCardId, onCardSelect, onCardPlay, onDragStart, onDragEnd, onDragStateChange,
  onAnimationProgress,
  position = [0, 0, 0], rotation = [0, 0, 0], isCurrentPlayer = false, animation = 'none',
}: PlayerHandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  // The hand spans the stage (beside a side dock), like the table the camera frames there.
  const stage = useStageViewport();

  const playableCardIdSet = useMemo(() => new Set(playableCardIds), [playableCardIds]);
  const animationProgress = useHandAnimationClock(animation, cards.length, onAnimationProgress);
  const { isCardLifted, handReturn, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel } = useHandDragSession({
    cards, playableCardIdSet, isCurrentPlayer, onCardPlay, onCardSelect, onDragStart, onDragEnd, onDragStateChange,
  });

  useFrame(() => {
    if (groupRef.current && isCurrentPlayer) {
      groupRef.current.position.y = position[1] + Math.sin(performance.now() * HAND_CONFIG.BREATHE_SPEED) * HAND_CONFIG.BREATHE_AMPLITUDE;
    }
  });

  const [coarsePointer] = useState(isCoarsePointer);
  const handLayout = useMemo(
    () => calcHandLayout(cards.length, camera, stage.width, stage.height, { coarsePointer }),
    [cards.length, camera, stage.width, stage.height, coarsePointer]
  );
  const cardPositions = useMemo(() => calcCardPositions(cards.length, handLayout), [cards.length, handLayout]);

  const handleDoubleTap = useCallback((cardId: string) => { if (isCurrentPlayer && playableCardIdSet.has(cardId)) onCardPlay(cardId); }, [isCurrentPlayer, playableCardIdSet, onCardPlay]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {cards.map((card, index) => {
        const cardPos = cardPositions[index];
        if (!cardPos) return null;
        const animOffset = getCardAnimOffset({
          index,
          cardId: card.id,
          animation,
          progress: animationProgress,
          cardCount: cards.length,
          layout: handLayout,
        });
        const isPlayable = playableCardIdSet.has(card.id);
        const visualState = deriveHandCardVisualState({ isCurrentPlayer, playableCount: playableCardIdSet.size, isPlayable });
        return (
          <Card3D key={card.id} card={card} position={cardPos.pos} positionOffset={toPositionOffset(animOffset)}
            rotation={applyAnimRotation(cardPos.rot, animOffset)} scale={handLayout.cardScale}
            isPlayable={isCurrentPlayer ? isPlayable : false} visualState={visualState} stackIndex={index} isSelected={selectedCardId === card.id} isDragging={isCardLifted(card.id)}
            returnFrom={handReturn?.cardId === card.id ? handReturn : undefined}
            onClick={() => isCurrentPlayer && isPlayable && onCardSelect(card.id)}
            onDragStart={(worldPos, screenX, screenY) => handleDragStart(card.id, worldPos, screenX, screenY)}
            onDragMove={handleDragMove} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}
            onDoubleTap={() => handleDoubleTap(card.id)} faceDown={card.id === 'hidden'} renderOnTop />
        );
      })}
    </group>
  );
}
