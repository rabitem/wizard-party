import * as THREE from 'three';
import {
  SPRING_CONFIG,
  DRAG_CONFIG,
  FEEDBACK_CONFIG,
  frameLerp,
  springForce,
} from '../config/physics.config';

export type Vec3Tuple = [number, number, number];

export const ZERO_POSITION_OFFSET: Vec3Tuple = [0, 0, 0];

/** World pose a card starts from when it comes back to the hand (where the dragged card was drawn). */
export interface CardReturnPose {
  position: THREE.Vector3;
  scale: number;
}

export interface AnimationTargets {
  targetY: number;
  targetScale: number;
  targetTiltX: number;
  wobbleIntensity: number;
}

/** Calculate animation targets based on card state */
export function getAnimationTargets(isSelected: boolean, isDragging: boolean, isActive: boolean, scale: number): AnimationTargets {
  if (isSelected && !isDragging) {
    return {
      targetY: DRAG_CONFIG.SELECT_ELEVATION,
      targetScale: scale * FEEDBACK_CONFIG.SELECT_SCALE,
      targetTiltX: FEEDBACK_CONFIG.HOVER_TILT_X * 0.7,
      wobbleIntensity: FEEDBACK_CONFIG.WOBBLE_INTENSITY.SELECT,
    };
  }
  if (isActive) {
    return {
      targetY: DRAG_CONFIG.HOVER_ELEVATION,
      targetScale: scale * FEEDBACK_CONFIG.HOVER_SCALE,
      targetTiltX: FEEDBACK_CONFIG.HOVER_TILT_X,
      wobbleIntensity: FEEDBACK_CONFIG.WOBBLE_INTENSITY.HOVER,
    };
  }
  return {
    targetY: 0,
    targetScale: scale,
    targetTiltX: 0,
    wobbleIntensity: FEEDBACK_CONFIG.WOBBLE_INTENSITY.IDLE,
  };
}

/**
 * How a hand card presents itself. Interaction (may this card be dragged now) and the rules hint
 * (is it a legal play) are separate: outside your playing turn (bidding, other players' turns)
 * every card is 'idle' and fully readable; on your turn legal cards lift a little and illegal
 * ones are darkened and lowered. Cards are never see-through.
 */
export type HandCardVisualState = 'idle' | 'legal' | 'illegal';

export interface HandCardVisualStateInput {
  /** It is the local player's turn */
  isCurrentPlayer: boolean;
  /** Number of cards the rules allow right now (0 outside a play decision: bidding, trick resolving) */
  playableCount: number;
  /** This card is one of them */
  isPlayable: boolean;
}

/**
 * A play decision is open only on the local turn while at least one card is legal; bidding,
 * trump selection, other players' turns and a resolving trick all leave every card 'idle'.
 */
export function deriveHandCardVisualState({ isCurrentPlayer, playableCount, isPlayable }: HandCardVisualStateInput): HandCardVisualState {
  if (!isCurrentPlayer || playableCount === 0) return 'idle';
  return isPlayable ? 'legal' : 'illegal';
}

/** Brightness multiplier of the card face (material colour), 1 = untouched */
export function getCardVisualTint(state: HandCardVisualState): number {
  return state === 'illegal' ? DRAG_CONFIG.ILLEGAL_CARD.TINT : 1;
}

/** Resting lift of the card in the hand (local units) */
export function getCardVisualLift(state: HandCardVisualState): number {
  if (state === 'legal') return DRAG_CONFIG.LEGAL_CARD_LIFT;
  if (state === 'illegal') return -DRAG_CONFIG.ILLEGAL_CARD.DROP;
  return 0;
}

export interface CardMotionState {
  /** Smoothed slot position and its velocity; the group is drawn at slot + animation offset + lift. */
  slotX: number; slotY: number; slotZ: number;
  slotVX: number; slotVY: number; slotVZ: number;
  y: number; yVelocity: number; scale: number; scaleVelocity: number;
  wobbleX: number; wobbleZ: number; tiltX: number; wobblePhase: number;
  /** Smoothed face brightness and the value last written to the material */
  tint: number; appliedTint: number;
}

export function createCardMotionState(position: Vec3Tuple, scale: number, visualState: HandCardVisualState, wobblePhase: number): CardMotionState {
  return {
    slotX: position[0], slotY: position[1], slotZ: position[2],
    slotVX: 0, slotVY: 0, slotVZ: 0,
    y: getCardVisualLift(visualState), yVelocity: 0, scale, scaleVelocity: 0,
    wobbleX: 0, wobbleZ: 0, tiltX: 0, wobblePhase,
    tint: getCardVisualTint(visualState),
    appliedTint: Number.NaN,
  };
}

export function applyCard3DRotation({
  group,
  rotation,
  wobbleX,
  wobbleZ,
  tiltX,
}: {
  group: THREE.Group;
  rotation: Vec3Tuple;
  wobbleX: number;
  wobbleZ: number;
  tiltX: number;
}): void {
  group.rotation.order = 'YXZ';
  group.rotation.set(
    rotation[0] + wobbleX + tiltX,
    rotation[1],
    rotation[2] + wobbleZ
  );
}

/**
 * One step of the slot glide: a critically damped spring solved exactly over dt, so it settles in
 * the same time at any frame rate and never overshoots. Returns the new value and velocity.
 */
export function glideToSlot(value: number, velocity: number, target: number, dt: number): [number, number] {
  const omega = SPRING_CONFIG.SLOT_GLIDE_FREQUENCY;
  const offset = value - target;
  const drive = velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  return [target + (offset + drive * dt) * decay, (velocity - omega * drive * dt) * decay];
}

export interface CardFrameParams {
  group: THREE.Group; physics: CardMotionState;
  targets: AnimationTargets; isSelected: boolean; isDragging: boolean;
  position: Vec3Tuple; positionOffset: Vec3Tuple; rotation: Vec3Tuple;
  visualState: HandCardVisualState; dt: number; time: number;
}

/**
 * Advance one frame of hand-card motion and write the group transform. The slot glides
 * toward `position` (re-layout, reorder, return from a drag); the shuffle/sort offset is
 * added on top unfiltered so the animation keeps its shape. All smoothing is scaled by dt.
 */
export function updateCardMotion(params: CardFrameParams): void {
  const { group, physics: p, targets, isSelected, isDragging, position, positionOffset, rotation, visualState, dt, time } = params;

  const ySpring = springForce({ current: p.y, target: targets.targetY + getCardVisualLift(visualState), velocity: p.yVelocity, stiffness: SPRING_CONFIG.STIFFNESS, damping: SPRING_CONFIG.DAMPING, dt });
  p.y = ySpring.value;
  p.yVelocity = ySpring.velocity;

  const scaleSpring = springForce({ current: p.scale, target: targets.targetScale, velocity: p.scaleVelocity, stiffness: SPRING_CONFIG.STIFFNESS * 0.6, damping: SPRING_CONFIG.DAMPING * 1.2, dt });
  p.scale = scaleSpring.value;
  p.scaleVelocity = scaleSpring.velocity;

  p.tiltX += (targets.targetTiltX - p.tiltX) * frameLerp(DRAG_CONFIG.HOVER_TILT_LERP, dt);
  p.tint += (getCardVisualTint(visualState) - p.tint) * frameLerp(DRAG_CONFIG.VISUAL_STATE_LERP, dt);

  p.wobblePhase += dt * FEEDBACK_CONFIG.WOBBLE_SPEED.X;
  p.wobbleX = Math.sin(p.wobblePhase) * targets.wobbleIntensity;
  p.wobbleZ = Math.cos(p.wobblePhase * (FEEDBACK_CONFIG.WOBBLE_SPEED.Z / FEEDBACK_CONFIG.WOBBLE_SPEED.X)) * targets.wobbleIntensity * 0.8;

  [p.slotX, p.slotVX] = glideToSlot(p.slotX, p.slotVX, position[0], dt);
  [p.slotY, p.slotVY] = glideToSlot(p.slotY, p.slotVY, position[1], dt);
  [p.slotZ, p.slotVZ] = glideToSlot(p.slotZ, p.slotVZ, position[2], dt);
  const bob = isSelected && !isDragging ? Math.sin(time * 2.5) * 0.01 : 0;
  group.position.set(
    p.slotX + positionOffset[0],
    p.slotY + positionOffset[1] + p.y + bob,
    p.slotZ + positionOffset[2]
  );

  group.scale.setScalar(p.scale);
  applyCard3DRotation({
    group,
    rotation,
    wobbleX: p.wobbleX,
    wobbleZ: p.wobbleZ,
    tiltX: p.tiltX,
  });
}

/**
 * Start a card's return to the hand from where the dragged card was drawn: the slot is
 * moved to that point (in the hand's local space) and the slot glide brings it home.
 */
export function applyReturnPose(group: THREE.Group, p: CardMotionState, pose: CardReturnPose, positionOffset: Vec3Tuple): void {
  if (!group.parent) return;
  group.parent.updateWorldMatrix(true, false);
  const local = group.parent.worldToLocal(pose.position.clone());
  p.slotX = local.x - positionOffset[0];
  p.slotY = local.y - positionOffset[1] - p.y;
  p.slotZ = local.z - positionOffset[2];
  p.slotVX = 0; p.slotVY = 0; p.slotVZ = 0;
  p.scale = pose.scale;
  p.scaleVelocity = 0;
}
