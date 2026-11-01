import * as THREE from 'three';
import { OPPONENT_HAND_LAYOUT, OPPONENT_HAND_WOBBLE } from '@/presentation/config/layout.config';

/** Resting pose of one face-down card in an opponent's fan (hand-local space). */
export interface OpponentCardPose {
  x: number;
  y: number;
  z: number;
  /** Fan rotation around the card's normal */
  rotZ: number;
  /** Tilt toward the opponent's seat */
  tiltX: number;
}

/** Cards lie flat on the table, fanned and stacked, tilted slightly toward their owner. */
export function computeOpponentHandLayout(cardCount: number): OpponentCardPose[] {
  if (cardCount <= 0) return [];
  const spreadPerCard = Math.min(
    OPPONENT_HAND_LAYOUT.SPREAD_PER_CARD_MAX,
    OPPONENT_HAND_LAYOUT.MAX_SPREAD / Math.max(cardCount - 1, 1),
  );
  const startX = -(spreadPerCard * (cardCount - 1)) / 2;
  const arcAngle = Math.min(OPPONENT_HAND_LAYOUT.MAX_ARC_ANGLE, OPPONENT_HAND_LAYOUT.ARC_ANGLE_MULTIPLIER * cardCount);

  return Array.from({ length: cardCount }, (_, i) => {
    const t = cardCount > 1 ? i / (cardCount - 1) : 0.5;
    return {
      x: startX + i * spreadPerCard,
      y: i * OPPONENT_HAND_LAYOUT.STACK_HEIGHT_PER_CARD,
      z: 0,
      rotZ: (t - 0.5) * arcAngle,
      tiltX: OPPONENT_HAND_LAYOUT.CARD_TILT_ANGLE,
    };
  });
}

/** Edge cards wobble more than the middle of the fan. */
function edgeFactor(index: number, count: number): number {
  if (count <= 1) return 1;
  return 1 + (Math.abs(index - (count - 1) / 2) / (count / 2)) * OPPONENT_HAND_WOBBLE.POSITION_INFLUENCE;
}

const W = OPPONENT_HAND_WOBBLE;
const _position = new THREE.Vector3();
const _euler = new THREE.Euler();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();

/**
 * Writes the breathing pose of card `index` at `timeSeconds` into `out` (no allocation): a slow
 * per-card phase-shifted bob, sway and rock around the resting pose.
 */
function composeOpponentCardMatrix(
  pose: OpponentCardPose,
  index: number,
  count: number,
  timeSeconds: number,
  out: THREE.Matrix4,
): THREE.Matrix4 {
  const phase = index * W.PHASE_SPREAD;
  const edge = edgeFactor(index, count);
  const yOffset = Math.sin(timeSeconds * W.SPEED + phase) * W.AMPLITUDE_Y * edge;
  const xOffset = Math.cos(timeSeconds * W.SPEED * 0.7 + phase * 1.1) * W.AMPLITUDE_X * edge;
  const rotXOffset = Math.sin(timeSeconds * W.SPEED * 0.8 + phase * 1.3) * W.AMPLITUDE_ROT * edge;
  const rotZOffset = Math.cos(timeSeconds * W.SPEED * 0.6 + phase * 0.9) * W.AMPLITUDE_ROT * 0.5;

  _position.set(pose.x + xOffset, pose.y + yOffset, pose.z);
  _euler.set(-Math.PI / 2 + pose.tiltX + rotXOffset, 0, pose.rotZ + rotZOffset);
  _quaternion.setFromEuler(_euler);
  return out.compose(_position, _quaternion, _scale);
}

/** Writes every card's instance matrix of the fan into `target` (16 floats per card) and flags the upload. */
export function writeOpponentHandMatrices(
  layout: readonly OpponentCardPose[],
  timeSeconds: number,
  target: THREE.InstancedBufferAttribute,
): void {
  const array = target.array as Float32Array;
  for (let i = 0; i < layout.length; i++) {
    composeOpponentCardMatrix(layout[i], i, layout.length, timeSeconds, _matrix);
    _matrix.toArray(array, i * 16);
  }
  target.needsUpdate = true;
}
