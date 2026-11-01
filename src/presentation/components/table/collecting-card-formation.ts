import { COLLECT_ANIMATION } from "../../config/physics.config";
import {
  BLADE_DANCE_FAN,
  type CollectionAnimationVariant,
} from "../../config/collection-animation.config";

interface WaitingFormationParams {
  variant: CollectionAnimationVariant;
  waitElapsed: number;
  stackIndex: number;
  collectingCardCount: number;
  seedAngle: number;
  gatherWobbleX: number;
  gatherWobbleZ: number;
}

/** Classic and comet hover as one pile, so their cards bob together instead of crossing. */
function isPiledFormation(variant: CollectionAnimationVariant): boolean {
  return variant === 'classic' || variant === 'comet';
}

/** Height of a stack slot in a hovering pile: the first card to fly sits on top. */
function getPileOffsetY(stackIndex: number): number {
  return -stackIndex * COLLECT_ANIMATION.HOVER_STACK_SPACING;
}

/** Fan angle of a stack slot, centred on the middle card and bounded for large tricks. */
function getBladeDanceFanAngle(stackIndex: number, collectingCardCount: number, seedAngle: number): {
  angle: number;
  relativeIndex: number;
} {
  const middle = (Math.max(1, collectingCardCount) - 1) / 2;
  const step = collectingCardCount > 1
    ? Math.min(BLADE_DANCE_FAN.MAX_STEP_RAD, (2 * BLADE_DANCE_FAN.MAX_HALF_SPAN_RAD) / (collectingCardCount - 1))
    : 0;
  const relativeIndex = stackIndex - middle;

  return { angle: relativeIndex * step + Math.sin(seedAngle) * 0.08, relativeIndex };
}

/** Where a card hovers relative to the trick centre while it waits for its flight slot. */
export function getWaitingFormationOffset({
  variant,
  waitElapsed,
  stackIndex,
  collectingCardCount,
  seedAngle,
  gatherWobbleX,
  gatherWobbleZ,
}: WaitingFormationParams): [number, number, number] {
  if (variant === 'bladeDance') {
    const { angle, relativeIndex } = getBladeDanceFanAngle(stackIndex, collectingCardCount, seedAngle);
    const spread = relativeIndex * 0.3;
    return [
      Math.sin(angle) * (0.3 + Math.abs(spread) * 0.35),
      stackIndex * 0.018,
      Math.cos(angle) * 0.2,
    ];
  }

  if (variant === 'spiral') {
    const angle = waitElapsed * 3.15 + seedAngle + stackIndex * 1.05;
    const radius = 0.26 + stackIndex * 0.025;
    return [Math.cos(angle) * radius, 0.04 + Math.sin(angle * 1.4) * 0.025, Math.sin(angle) * radius];
  }

  if (variant === 'comet') {
    const side = stackIndex % 2 === 0 ? 1 : -1;
    return [side * 0.035 + Math.cos(seedAngle) * 0.015, 0.03 + getPileOffsetY(stackIndex), -0.02 + stackIndex * 0.01];
  }

  return [gatherWobbleX * 0.3, getPileOffsetY(stackIndex), gatherWobbleZ * 0.3];
}

/** Hover bob phase: piles bob as a unit, spread formations bob card by card. */
export function getHoverBobPhase(variant: CollectionAnimationVariant, waitElapsed: number, stackIndex: number): number {
  const cardPhase = isPiledFormation(variant) ? 0 : stackIndex * 0.5;
  return waitElapsed * Math.PI * COLLECT_ANIMATION.HOVER_SPEED + cardPhase;
}
