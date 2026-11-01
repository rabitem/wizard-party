import * as THREE from 'three';
import { HAND_CONFIG } from '../config/layout.config';
import { SHUFFLE_SORT_ANIMATION } from '../config/physics.config';
import type { HandLayoutResult } from './PlayerHand.fit';

export type AnimOffset = { x: number; y: number; z: number; rotZ: number; rotX: number };
export const ZERO_OFFSET: AnimOffset = { x: 0, y: 0, z: 0, rotZ: 0, rotX: 0 };

/** Get animation offset for a card based on current animation */
function getHandAnimationReadabilityScale(cardCount: number, layout?: HandLayoutResult): number {
  if (!layout || cardCount <= 5) return 1;
  const spacingRatio = layout.cardSpacing / layout.preferredSpacing;
  const countRatio = 5 / cardCount;
  const scaleRatio = (layout.cardScale / HAND_CONFIG.LAYOUT.CARD_SCALE.PORTRAIT) * 0.78;
  return THREE.MathUtils.clamp(Math.min(spacingRatio * 1.25, countRatio, scaleRatio), 0.25, 1);
}

interface CardAnimOffsetParams {
  index: number;
  cardId: string;
  animation: string;
  progress: number;
  cardCount: number;
  layout?: HandLayoutResult;
}

export function getCardAnimOffset({
  index,
  cardId,
  animation,
  progress,
  cardCount,
  layout,
}: CardAnimOffsetParams): AnimOffset {
  if (progress === 0 || animation === 'none') return ZERO_OFFSET;
  const readabilityScale = getHandAnimationReadabilityScale(cardCount, layout);
  if (animation === 'shuffle') return calcShuffleOffset(cardId, progress, readabilityScale);
  if (animation === 'sort') return calcSortOffset(index, cardCount, progress, readabilityScale);
  return ZERO_OFFSET;
}

/** Calculate base Z for shuffle animation */
function getBaseZ(oscillation: number, isOdd: boolean): number {
  if (oscillation > 0) return isOdd ? 0.05 : 0;
  return isOdd ? 0 : 0.05;
}

function hashCardId(cardId: string): number {
  return cardId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

/**
 * Calculate shuffle animation offset for a card. The slide direction comes from the
 * card id, not its slot index, so it stays continuous when the shuffle reorders the hand.
 */
function calcShuffleOffset(cardId: string, progress: number, readabilityScale: number): AnimOffset {
  const hash = hashCardId(cardId);
  const isOdd = hash % 2 === 1;
  const rand = ((hash % 100) / 100 - 0.5) * 0.05;
  const oscillation = Math.sin(progress * Math.PI * 4);
  const damping = 1 - progress;
  const direction = isOdd ? 1 : -1;
  const slideAmount = (0.12 + rand) * readabilityScale;
  const x = direction * oscillation * slideAmount * damping;
  const liftPhase = Math.abs(oscillation);
  const y = liftPhase * 0.08 * damping * readabilityScale;
  const baseZ = getBaseZ(oscillation, isOdd) * readabilityScale;
  const z = baseZ * damping;
  const rotZ = direction * oscillation * 0.04 * damping * readabilityScale;
  const settlePhase = Math.max(0, progress - 0.85) / 0.15;
  const bounce = settlePhase > 0 ? Math.sin(settlePhase * Math.PI * 3) * 0.02 * (1 - settlePhase) * readabilityScale : 0;
  return { x, y: y + bounce, z, rotZ, rotX: 0 };
}

/** Calculate sort animation offset for a card */
function calcSortOffset(index: number, cardCount: number, progress: number, readabilityScale: number): AnimOffset {
  const cfg = SHUFFLE_SORT_ANIMATION.SORT;
  const maxWaveDelay = cardCount > 1 ? Math.min(cfg.WAVE_DELAY_PER_CARD, 0.35 / (cardCount - 1)) : cfg.WAVE_DELAY_PER_CARD;
  const waveDelay = index * maxWaveDelay;
  const waveProgress = Math.max(0, Math.min(1, (progress - waveDelay) * cfg.WAVE_SPEED));

  if (waveProgress === 0) return ZERO_OFFSET;
  if (waveProgress >= 1) {
    const settleProgress = (progress - (waveDelay + 1 / cfg.WAVE_SPEED)) * 4;
    if (settleProgress > 0 && settleProgress < 1) {
      const wobble = cfg.SLAP_WOBBLE * Math.sin(settleProgress * 12) * (1 - settleProgress) * readabilityScale;
      return { x: 0, y: Math.abs(wobble), z: 0, rotZ: wobble * 0.5, rotX: 0 };
    }
    return ZERO_OFFSET;
  }

  let y = 0, rotX = 0, rotZ = 0;
  if (waveProgress < 0.4) {
    const riseProgress = waveProgress / 0.4;
    const riseEase = Math.sin(riseProgress * Math.PI * 0.5);
    y = cfg.WAVE_HEIGHT * riseEase * readabilityScale; rotX = -cfg.TILT_DURING_RISE * riseEase * readabilityScale;
  } else if (waveProgress < 0.7) {
    const slamProgress = (waveProgress - 0.4) / 0.3;
    const slamEase = Math.pow(slamProgress, 2);
    y = cfg.WAVE_HEIGHT * (1 - slamEase) * readabilityScale; rotX = -cfg.TILT_DURING_RISE * (1 - slamEase) * readabilityScale;
  } else {
    const bounceProgress = (waveProgress - 0.7) / 0.3;
    const bounceDecay = Math.exp(-bounceProgress * 5);
    y = cfg.SLAP_BOUNCE * Math.abs(Math.sin(bounceProgress * 15)) * bounceDecay * readabilityScale;
    rotZ = cfg.SLAP_WOBBLE * Math.sin(bounceProgress * 12) * bounceDecay * readabilityScale;
  }
  return { x: 0, y, z: waveProgress < 0.7 ? 0.03 * readabilityScale : 0, rotZ, rotX };
}

/** Animated rotation for a card: its slot rotation plus the animation's tilt. */
export function applyAnimRotation(rot: [number, number, number], offset: AnimOffset): [number, number, number] {
  return [rot[0] + (offset.rotX || 0), rot[1], rot[2] + offset.rotZ];
}

/** Animation position offset, applied on top of the smoothed slot position. */
export function toPositionOffset(offset: AnimOffset): [number, number, number] {
  return [offset.x, offset.y, offset.z];
}
