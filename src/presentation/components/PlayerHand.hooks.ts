'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import { DRAG_CONFIG } from '../config/physics.config';
import { useDragToPlay, type DropInfo } from '../hooks/useDragToPlay';
import {
  DRAGGED_CARD_SCALE,
  IDLE_DRAG_STATE,
  buildDragPublication,
  getDraggedCardPose,
  resolveHeldPlay,
  shouldPublishDragStateChange,
  type DragStatePublication,
  type HandReturn,
  type HeldPlay,
  type HeldPlayResolution,
  type PublishedDragState,
} from './PlayerHand.drag';

interface UseHandDragSessionParams {
  cards: ICard[];
  playableCardIdSet: Set<string>;
  isCurrentPlayer: boolean;
  onCardPlay: (cardId: string, dropInfo?: DropInfo) => void;
  onCardSelect: (cardId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragStateChange?: (publication: DragStatePublication) => void;
}

function toPublishedState({ isDragging, isHeld, proximity, isInZone, cardId }: PublishedDragState): PublishedDragState {
  return { isDragging, isHeld, proximity, isInZone, cardId };
}

/**
 * Drag lifecycle of the local hand: the live drag, the dropped card held on the table
 * until the server confirms the play, and the return of a card that was not played.
 * Lifecycle changes are published synchronously from the pointer handlers, so the hand
 * card hides and the dragged card appears (or disappears) in the same commit.
 */
export function useHandDragSession({
  cards, playableCardIdSet, isCurrentPlayer, onCardPlay, onCardSelect, onDragStart, onDragEnd, onDragStateChange,
}: UseHandDragSessionParams) {
  const { camera, size } = useThree();
  const [heldPlay, setHeldPlay] = useState<HeldPlay | null>(null);
  const [handReturn, setHandReturn] = useState<HandReturn | null>(null);
  const heldPlayRef = useRef<HeldPlay | null>(null);
  const publishedRef = useRef<PublishedDragState>(IDLE_DRAG_STATE);

  const { dragState, dragStateRef, startDrag, updateDrag, endDrag, cancelDrag } = useDragToPlay({
    onPlay: (cardId, dropInfo) => {
      if (!isCurrentPlayer || !playableCardIdSet.has(cardId)) return false;
      onCardPlay(cardId, dropInfo);
      return true;
    },
  });

  const publish = useCallback(() => {
    const publication = buildDragPublication(dragStateRef.current, heldPlayRef.current, dragStateRef);
    if (!shouldPublishDragStateChange(publishedRef.current, publication)) return;
    publishedRef.current = toPublishedState(publication);
    onDragStateChange?.(publication);
  }, [dragStateRef, onDragStateChange]);

  const holdPlay = useCallback((next: HeldPlay | null) => {
    heldPlayRef.current = next;
    setHeldPlay(next);
  }, []);

  // Play-zone entry and exit happen between pointer events; publish them from the frame loop.
  useFrame(publish);

  const returnToHand = useCallback((cardId: string, position: THREE.Vector3) => {
    setHandReturn({ cardId, position, scale: DRAGGED_CARD_SCALE });
  }, []);

  const handleDragStart = useCallback((cardId: string, worldPosition: THREE.Vector3, screenX: number, screenY: number) => {
    startDrag({ cardId, cardWorldPos: worldPosition, screenX, screenY, camera, canvasWidth: size.width, canvasHeight: size.height });
    publish();
    onDragStart?.(); onCardSelect(cardId);
  }, [startDrag, publish, onDragStart, onCardSelect, camera, size.width, size.height]);

  const handleDragMove = useCallback((screenX: number, screenY: number) => updateDrag(screenX, screenY, camera, size.width, size.height), [updateDrag, camera, size.width, size.height]);

  const handleDragEnd = useCallback(() => {
    const cardId = dragStateRef.current.cardId;
    const pose = getDraggedCardPose(dragStateRef.current);
    const result = endDrag();
    if (result.played && result.cardId) holdPlay({ cardId: result.cardId, position: pose, heldAt: performance.now() });
    else if (cardId) returnToHand(cardId, pose);
    publish();
    onDragEnd?.();
  }, [dragStateRef, endDrag, holdPlay, returnToHand, publish, onDragEnd]);

  const handleDragCancel = useCallback(() => {
    const cardId = dragStateRef.current.cardId;
    const pose = getDraggedCardPose(dragStateRef.current);
    cancelDrag();
    if (cardId) returnToHand(cardId, pose);
    publish();
    onDragEnd?.();
  }, [dragStateRef, cancelDrag, returnToHand, publish, onDragEnd]);

  const handCardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  useEffect(() => {
    if (!heldPlay) return;
    const release = (resolution: Exclude<HeldPlayResolution, 'hold'>) => {
      holdPlay(null);
      if (resolution === 'returned') returnToHand(heldPlay.cardId, heldPlay.position);
      publish();
    };
    const resolution = resolveHeldPlay({ heldPlay, handCardIds, isCurrentPlayer, now: performance.now() });
    if (resolution !== 'hold') {
      release(resolution);
      return;
    }
    // Any hand or turn update re-runs this effect; reaching the timeout means no answer came.
    const timer = setTimeout(() => release('returned'), Math.max(0, heldPlay.heldAt + DRAG_CONFIG.HELD_PLAY_TIMEOUT_MS - performance.now()));
    return () => clearTimeout(timer);
  }, [heldPlay, handCardIds, isCurrentPlayer, holdPlay, returnToHand, publish]);

  const isCardLifted = useCallback((cardId: string) => (
    (dragState.isDragging && dragState.cardId === cardId) || heldPlay?.cardId === cardId
  ), [dragState.isDragging, dragState.cardId, heldPlay]);

  return { isCardLifted, handReturn, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel };
}
