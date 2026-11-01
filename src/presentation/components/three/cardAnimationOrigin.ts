import * as THREE from 'three';
import { PLAY_ANIMATION, clamp, easeOutCubic } from '../../config/physics.config';
import type { PlayedCardOriginPose } from './physics-played-card.types';

const flightOrientation = new THREE.Quaternion();

/**
 * Scale while the card flies: it grows from the size it was rendered at when it left the
 * hand (or the default launch size) to its table size.
 */
export function calculateCardScale(
  rawProgress: number,
  targetScale: number,
  startScale: number = PLAY_ANIMATION.START_SCALE
): number {
  const scaleProgress = easeOutCubic(Math.min(rawProgress * PLAY_ANIMATION.SCALE_IN_SPEED, 1));
  return THREE.MathUtils.lerp(startScale, targetScale, scaleProgress);
}

/**
 * Weight of the held orientation: 1 on the first frame, 0 once the card has fully taken on
 * its flight orientation.
 */
function calculateOriginBlendWeight(rawProgress: number): number {
  const blendProgress = clamp(rawProgress / PLAY_ANIMATION.ORIGIN_BLEND_END, 0, 1);
  return 1 - easeOutCubic(blendProgress);
}

export function toOriginQuaternion(originPose: PlayedCardOriginPose | undefined): THREE.Quaternion | null {
  if (!originPose) return null;
  return new THREE.Quaternion().fromArray(originPose.quaternion).normalize();
}

/**
 * Turn the scripted flight orientation (in place) so the card starts in the orientation it was
 * held in. Without an origin, the flight orientation is left untouched.
 */
export function blendFromOriginOrientation(
  flightQuaternion: THREE.Quaternion,
  originQuaternion: THREE.Quaternion | null,
  rawProgress: number
): THREE.Quaternion {
  if (!originQuaternion) return flightQuaternion;

  const originWeight = calculateOriginBlendWeight(rawProgress);
  if (originWeight <= 0) return flightQuaternion;

  flightOrientation.copy(flightQuaternion);
  return flightQuaternion.slerpQuaternions(originQuaternion, flightOrientation, 1 - originWeight);
}
