import type { CardAnimationOffsets } from './physics-played-card.types';

/** Seeded per-card variation switched off: no offset, spin, wobble or bounce, neutral multipliers */
export const ZERO_ANIMATION_OFFSETS: CardAnimationOffsets = {
  posX: 0,
  posZ: 0,
  posY: 0,
  finalRotZ: 0,
  finalRotX: 0,
  flightSpinZ: 0,
  flightWobbleX: 0,
  flightWobbleZ: 0,
  wobbleFreq: 0,
  throwStrength: 1,
  gravityMult: 1,
  bounceStrength: 0,
  durationMult: 1,
};
