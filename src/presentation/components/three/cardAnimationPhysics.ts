import { PLAY_ANIMATION, easeInOutCubic } from '../../config/physics.config';
import type { CardAnimationOffsets } from './physics-played-card.types';

/**
 * Calculate flip progress for opponent cards (face-down to face-up).
 * Local player cards always show face-up (flipProgress = 1).
 */
export function calculateFlipProgress(rawProgress: number, isLocalPlayer: boolean): number {
  if (isLocalPlayer) return 1;

  if (rawProgress > PLAY_ANIMATION.FLIP_START && rawProgress < PLAY_ANIMATION.FLIP_END) {
    return easeInOutCubic(
      (rawProgress - PLAY_ANIMATION.FLIP_START) /
      (PLAY_ANIMATION.FLIP_END - PLAY_ANIMATION.FLIP_START)
    );
  }
  return rawProgress >= PLAY_ANIMATION.FLIP_END ? 1 : 0;
}

/**
 * Calculate the parabolic arc height during flight.
 * Uses true parabolic physics with separate rise and fall phases.
 */
export function calculateArcHeight(
  rawProgress: number,
  isLocalPlayer: boolean,
  throwStrength: number
): number {
  const baseArcHeight = isLocalPlayer
    ? PLAY_ANIMATION.PEAK_HEIGHT_LOCAL
    : PLAY_ANIMATION.PEAK_HEIGHT_OPPONENT;
  const peakHeight = baseArcHeight * throwStrength;
  const peakTime = PLAY_ANIMATION.PEAK_TIME;

  if (rawProgress < peakTime) {
    const t = rawProgress / peakTime;
    return peakHeight * (2 * t - t * t);
  }
  const fallTime = (rawProgress - peakTime) / (1 - peakTime);
  return peakHeight * (1 - fallTime * fallTime);
}

/**
 * Apply air resistance simulation to the arc height.
 * Cards slow down more as they travel through air, especially near peak.
 */
export function applyAirResistance(arcY: number, rawProgress: number): number {
  const airResistanceFactor = 1 - (0.15 * Math.sin(rawProgress * Math.PI));
  return arcY * airResistanceFactor;
}

interface BounceResult {
  bounceY: number;
  bounceRotZ: number;
  bounceRotX: number;
}

/**
 * Calculate multi-bounce landing physics with tertiary bounce for realistic card landing.
 */
export function calculateBounce(rawProgress: number, bounceStrength: number): BounceResult {
  const bounceStart = PLAY_ANIMATION.BOUNCE_START;

  if (rawProgress <= bounceStart) {
    return { bounceY: 0, bounceRotZ: 0, bounceRotX: 0 };
  }

  const bounceProgress = (rawProgress - bounceStart) / (1 - bounceStart);
  const cor = PLAY_ANIMATION.COEFFICIENT_OF_RESTITUTION;
  const baseIntensity = PLAY_ANIMATION.BOUNCE_INTENSITY * bounceStrength;

  // Progressive decay for each bounce
  const primaryDecay = Math.exp(-bounceProgress * PLAY_ANIMATION.BOUNCE_DECAY);
  const secondaryDecay = primaryDecay * primaryDecay;
  const tertiaryDecay = secondaryDecay * primaryDecay;

  // Primary bounce - first impact
  const primaryBounce = Math.sin(bounceProgress * Math.PI * PLAY_ANIMATION.BOUNCE_FREQUENCY / 4) *
    baseIntensity * 4 * primaryDecay;

  // Secondary bounce - second smaller impact
  const secondaryBounce = Math.sin(bounceProgress * Math.PI * PLAY_ANIMATION.BOUNCE_FREQUENCY / 2) *
    baseIntensity * cor * PLAY_ANIMATION.SECONDARY_BOUNCE_FACTOR * secondaryDecay;

  // Tertiary bounce - subtle third bounce for realistic settling
  const tertiaryBounce = Math.sin(bounceProgress * Math.PI * PLAY_ANIMATION.BOUNCE_FREQUENCY) *
    baseIntensity * cor * cor * PLAY_ANIMATION.TERTIARY_BOUNCE_FACTOR * tertiaryDecay;

  const bounceY = Math.max(0, primaryBounce + secondaryBounce + tertiaryBounce);

  // Enhanced bounce rotation - card wobbles on each impact
  let bounceRotZ = Math.sin(bounceProgress * Math.PI * 4) * PLAY_ANIMATION.BOUNCE_INTENSITY * primaryDecay;
  let bounceRotX = Math.cos(bounceProgress * Math.PI * 3) * PLAY_ANIMATION.BOUNCE_INTENSITY * 0.5 * primaryDecay;

  // Add micro-wobble from tertiary bounce for realistic settling vibration
  const settleWobble = Math.sin(bounceProgress * Math.PI * 8) * 0.02 * tertiaryDecay;
  bounceRotZ += settleWobble;
  bounceRotX += settleWobble * 0.5;

  // The decays never reach zero, so fade the wobble out: the last frame is the flat rest pose
  // that getRotatedPlayedCardRestY assumes.
  const settle = 1 - bounceProgress ** 3;

  return { bounceY, bounceRotZ: bounceRotZ * settle, bounceRotX: bounceRotX * settle };
}

interface WobbleResult {
  wobbleX: number;
  wobbleZ: number;
}

/**
 * Calculate in-flight wobble with enhanced intensity during peak arc.
 */
export function calculateWobble(
  rawProgress: number,
  elapsedTime: number,
  wobbleDecay: number,
  randomOffsets: CardAnimationOffsets
): WobbleResult {
  const peakIntensityBoost = 1 + 0.3 * Math.sin(rawProgress * Math.PI);
  const timeOffset = elapsedTime * PLAY_ANIMATION.FLIGHT_WOBBLE_SPEED;

  const wobbleX = Math.sin(timeOffset) * PLAY_ANIMATION.FLIGHT_WOBBLE_INTENSITY *
    randomOffsets.flightWobbleX * wobbleDecay * peakIntensityBoost;
  const wobbleZ = Math.cos(timeOffset * 1.3) * PLAY_ANIMATION.FLIGHT_WOBBLE_INTENSITY *
    randomOffsets.flightWobbleZ * wobbleDecay * peakIntensityBoost;

  return { wobbleX, wobbleZ };
}

/**
 * Calculate in-flight spin with air resistance effect.
 */
export function calculateFlightSpin(
  rawProgress: number,
  spinDecay: number,
  flightSpinZ: number
): number {
  const airDragOnSpin = 1 - (0.1 * rawProgress);
  return flightSpinZ * PLAY_ANIMATION.FLIGHT_SPIN_SPEED * spinDecay * airDragOnSpin;
}

/**
 * In-plane spin for a card leaving the local player's hand, added to the landing angle.
 * It starts at the held angle (0), so the first frame matches the hand or dragged card it
 * replaces, and turns the whole revolutions nearest the seeded spin while settling on the
 * landing angle. Remote throws have no visible predecessor and keep calculateFlightSpin.
 */
export function calculateReleaseSpin(
  spinDecay: number,
  flightSpinZ: number,
  finalRotZ: number
): number {
  const fullTurn = Math.PI * 2;
  const seededSpin = flightSpinZ * PLAY_ANIMATION.FLIGHT_SPIN_SPEED;
  const wholeTurns = Math.round(seededSpin / fullTurn) * fullTurn;
  return (-wholeTurns - finalRotZ) * spinDecay;
}

interface TumbleResult {
  tumbleX: number;
  tumbleY: number;
}

/**
 * Calculate enhanced 3D tumble effect - more dramatic forward/backward rotation during flight.
 * Cards tumble more realistically with coupled X/Y rotation.
 */
export function calculateTumble(
  rawProgress: number,
  wobbleDecay: number,
  throwStrength: number
): TumbleResult {
  const tumblePhaseX = rawProgress * Math.PI * 2.5;
  const tumblePhaseY = rawProgress * Math.PI * 1.8;

  const tumbleX = Math.sin(tumblePhaseX) * PLAY_ANIMATION.TUMBLE_X_FACTOR *
    wobbleDecay * (1 + throwStrength * 0.3);
  const tumbleY = Math.sin(tumblePhaseY) * PLAY_ANIMATION.TUMBLE_Y_FACTOR *
    wobbleDecay * (1 + throwStrength * 0.2);

  return { tumbleX, tumbleY };
}

/**
 * Calculate velocity-dependent landing angle - card tilts based on descent speed.
 * As the card descends, it tilts slightly forward like a real thrown card, and it is level
 * again at touchdown so the tilt does not snap away on impact.
 */
export function calculateVelocityTilt(
  flightProgress: number,
  throwStrength: number
): number {
  const peakTime = PLAY_ANIMATION.PEAK_TIME;

  if (flightProgress > peakTime && flightProgress < 1) {
    const descentProgress = (flightProgress - peakTime) / (1 - peakTime);
    return Math.sin(descentProgress * Math.PI) * 0.15 * throwStrength;
  }
  return 0;
}
