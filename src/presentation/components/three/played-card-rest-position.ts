import { calculateCardPosition, resolveCardAnimationPositions } from './cardAnimationHelpers';
import { createCardAnimationOffsets } from './useCardAnimationOffsets';
import type { CardAnimationOffsets, ServerPhysicsState } from './physics-played-card.types';
import type { DropInfo } from '../../hooks/useDragToPlay';

interface CalculatePlayedCardRestPositionParams {
  cardId: string;
  isLocalPlayer: boolean;
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  playOrder: number;
  totalCards: number;
  cardScale?: number;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
  /** Yaw of the owner's seat in this client's scene; maps synchronized positions onto it */
  seatRotation?: number;
  randomOffsets?: CardAnimationOffsets;
}

export function calculatePlayedCardRestPosition({
  cardId,
  isLocalPlayer,
  startPosition,
  targetPosition,
  playOrder,
  totalCards,
  cardScale = 0.9,
  dropInfo,
  physicsState,
  seatRotation = 0,
  randomOffsets,
}: CalculatePlayedCardRestPositionParams): [number, number, number] {
  const resolvedPositions = resolveCardAnimationPositions({
    isLocalPlayer,
    startPosition,
    targetPosition,
    dropInfo,
    physicsState,
    seatRotation,
  });

  const currentOffsets = randomOffsets ?? createCardAnimationOffsets({
    cardId,
    isLocalPlayer,
    physicsState,
  });

  const restPosition = calculateCardPosition({
    rawProgress: 1,
    posProgress: 1,
    effectiveStartPosition: resolvedPositions.effectiveStartPosition,
    effectiveTargetPosition: resolvedPositions.effectiveTargetPosition,
    randomOffsets: currentOffsets,
    playOrder,
    totalCards,
    cardScale,
    dropInfo,
    physicsState,
    isLocalPlayer,
  });

  return restPosition.toArray() as [number, number, number];
}
