import { calculateCardRotation } from '../three/cardAnimationHelpers';
import { isSlowPlayedCardDrop } from '../three/cardAnimationMotion';
import { createCardAnimationOffsets } from '../three/useCardAnimationOffsets';
import type { ServerPhysicsState } from '../three/physics-played-card.types';
import type { DropInfo } from '../../hooks/useDragToPlay';

interface PlayedCardRestYawParams {
  /** Animation id of the played card (`${playerId}-${cardId}`), which seeds its rest offsets */
  cardId: string;
  isLocalPlayer: boolean;
  seatRotation: number;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
}

/**
 * Yaw at which an animated played card comes to rest, so the collecting card that replaces it
 * starts from the same orientation. The played card rests at YXZ(-PI/2 + tilt, seat, roll); lying
 * flat, Ry(seat) * Rx(-PI/2) * Rz(roll) = Ry(seat + roll) * Rx(-PI/2), so its roll reads as yaw.
 */
export function getPlayedCardRestYaw({
  cardId,
  isLocalPlayer,
  seatRotation,
  dropInfo,
  physicsState,
}: PlayedCardRestYawParams): number {
  const restRotation = calculateCardRotation({
    rawProgress: 1,
    posProgress: 1,
    elapsedTime: 0,
    isLocalPlayer,
    targetRotation: [-Math.PI / 2, seatRotation, 0],
    randomOffsets: createCardAnimationOffsets({ cardId, isLocalPlayer, physicsState }),
    isSlowDrop: isSlowPlayedCardDrop(dropInfo, physicsState),
  });

  return restRotation.y + restRotation.z;
}
