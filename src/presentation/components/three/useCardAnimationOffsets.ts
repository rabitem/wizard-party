import { useMemo } from 'react';
import { seededRandom, gaussianRandom } from '../../config/physics.config';
import type { CardAnimationOffsets, ServerPhysicsState } from './physics-played-card.types';

interface UseCardAnimationOffsetsParams {
  cardId: string;
  isLocalPlayer: boolean;
  physicsState?: ServerPhysicsState;
}

export function createCardAnimationOffsets({
  cardId,
  isLocalPlayer,
  physicsState,
}: UseCardAnimationOffsetsParams): CardAnimationOffsets {
  const physicsSeed = physicsState?.physicsSeed;
  const seedSource = (!isLocalPlayer && physicsSeed !== undefined)
    ? physicsSeed.toString()
    : cardId;
  const rand = seededRandom(seedSource);

  return {
    posX: gaussianRandom(rand, 0, 0.12),
    posZ: gaussianRandom(rand, 0, 0.12),
    posY: rand() * 0.02,
    finalRotZ: gaussianRandom(rand, 0, 0.15),
    finalRotX: gaussianRandom(rand, 0, 0.02),
    flightSpinZ: (rand() - 0.5) * Math.PI * 1.5,
    flightWobbleX: (rand() - 0.5) * 0.25,
    flightWobbleZ: (rand() - 0.5) * 0.2,
    wobbleFreq: 2 + rand() * 3,
    throwStrength: 0.7 + rand() * 0.5,
    gravityMult: 0.9 + rand() * 0.2,
    bounceStrength: 0.08 + rand() * 0.1,
    durationMult: 0.9 + rand() * 0.2,
  };
}

/**
 * Generates seeded random offsets for card animation.
 * Non-local players use server seed for multiplayer sync.
 */
export function useCardAnimationOffsets({
  cardId,
  isLocalPlayer,
  physicsState,
}: UseCardAnimationOffsetsParams): CardAnimationOffsets {
  const physicsSeed = physicsState?.physicsSeed;

  return useMemo(
    () => createCardAnimationOffsets({
      cardId,
      isLocalPlayer,
      physicsState: physicsSeed === undefined ? undefined : { physicsSeed },
    }),
    [cardId, isLocalPlayer, physicsSeed]
  );
}
