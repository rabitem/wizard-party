import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  CARD_DIMENSIONS,
  TABLE_SURFACE,
  getCardRestY,
} from '@/presentation/config/physics.config';
import {
  STACKED_DECK_LAYOUT,
  getCollectingCardTargetLayout,
  getHiddenDeckBaseY,
  getStackedDeckCardLayout,
  getStackedDeckPosition,
  getVisibleDeckCardY,
} from './stacked-deck-layout';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Card face normal in card-local space (the box's thin axis) */
const CARD_FACE_NORMAL = new THREE.Vector3(0, 0, 1);
// Quaternion angleTo goes through acos near 1, so allow float rounding
const ROTATION_TOLERANCE_RAD = 1e-6;

/** World orientation of a deck card: deck group yaw, then the card's XYZ rotation prop */
function getDeckCardWorldQuaternion(
  deckRotation: number,
  cardRotation: [number, number, number]
): THREE.Quaternion {
  const deckYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, deckRotation);
  const card = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cardRotation, 'XYZ'));
  return deckYaw.multiply(card);
}

/** World orientation the collecting card ends on (PhysicsCollectingCard's flat 'YXZ' pose) */
function getCollectingCardWorldQuaternion(rotationY: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, rotationY, 0, 'YXZ'));
}

describe('stacked deck layout', () => {
  it('rests the first visible collected card on top of the felt instead of hovering at played-card height', () => {
    expect(getVisibleDeckCardY({ hiddenCount: 0, visibleIndex: 0 })).toBeCloseTo(
      getCardRestY(STACKED_DECK_LAYOUT.DECK_SCALE)
    );
  });

  it('raises the hidden-card block as it grows so the bottom never enters the table', () => {
    const hiddenCount = 14;
    const hiddenThickness = STACKED_DECK_LAYOUT.BASE_THICKNESS * hiddenCount;
    const centerY = getHiddenDeckBaseY(hiddenCount);
    const bottomY = centerY - hiddenThickness / 2;

    expect(bottomY).toBeGreaterThanOrEqual(TABLE_SURFACE.FELT_Y + TABLE_SURFACE.EPSILON);
  });

  it('places visible cards above the hidden block rather than intersecting it', () => {
    const hiddenCount = 8;
    const visibleCardHalfThickness = CARD_DIMENSIONS.THICKNESS * STACKED_DECK_LAYOUT.DECK_SCALE / 2;
    const hiddenTopY = getHiddenDeckBaseY(hiddenCount) + STACKED_DECK_LAYOUT.BASE_THICKNESS * hiddenCount / 2;
    const firstVisibleCardY = getVisibleDeckCardY({ hiddenCount, visibleIndex: 0 });

    expect(firstVisibleCardY - visibleCardHalfThickness).toBeGreaterThanOrEqual(
      hiddenTopY + TABLE_SURFACE.EPSILON
    );
  });

  it('targets collection cards to the same visible stack slot they will occupy after older cards are hidden', () => {
    // 13 cards after this trick, 6 stay visible: the 7 oldest hide, the first new card is visible slot 3
    const target = getCollectingCardTargetLayout({
      cardId: 'c',
      deckPosition: [0, 0, 0],
      deckRotation: 0,
      existingCardCount: 10,
      collectingCardCount: 3,
      collectingCardIndex: 0,
    });

    expect(target.hiddenCount).toBe(7);
    expect(target.visibleIndex).toBe(3);
    expect(target.position[1]).toBeCloseTo(
      getVisibleDeckCardY({ hiddenCount: 7, visibleIndex: 3 })
    );
  });

  it('targets collection cards to the same world slot, rotation, and scale as the persistent deck card', () => {
    const deckPosition = getStackedDeckPosition([2.6, -0.08, 0]);
    const deckRotation = Math.PI / 2;
    const cardId = 'card-collected-b';
    // 7 cards after this trick, 6 stay visible: 1 hides, the second new card lands in visible slot 4
    const deckCardLayout = getStackedDeckCardLayout({
      cardId,
      hiddenCount: 1,
      visibleIndex: 4,
    });
    const targetLayout = getCollectingCardTargetLayout({
      cardId,
      deckPosition,
      deckRotation,
      existingCardCount: 4,
      collectingCardCount: 3,
      collectingCardIndex: 1,
    });

    const cos = Math.cos(deckRotation);
    const sin = Math.sin(deckRotation);
    const expectedWorldX =
      deckPosition[0] + deckCardLayout.position[0] * cos + deckCardLayout.position[2] * sin;
    const expectedWorldZ =
      deckPosition[2] - deckCardLayout.position[0] * sin + deckCardLayout.position[2] * cos;

    expect([targetLayout.hiddenCount, targetLayout.visibleIndex]).toEqual([1, 4]);
    expect(targetLayout.position[0]).toBeCloseTo(expectedWorldX);
    expect(targetLayout.position[1]).toBeCloseTo(deckCardLayout.position[1]);
    expect(targetLayout.position[2]).toBeCloseTo(expectedWorldZ);
    expect(
      getCollectingCardWorldQuaternion(targetLayout.rotationY).angleTo(
        getDeckCardWorldQuaternion(deckRotation, deckCardLayout.rotation)
      )
    ).toBeLessThan(ROTATION_TOLERANCE_RAD);
    expect(targetLayout.scale).toBe(STACKED_DECK_LAYOUT.DECK_SCALE);
  });

  it('lays every deck card flat and turns its jitter in the felt plane instead of rolling it', () => {
    const deckRotation = -2 * Math.PI / 3;
    let maxJitter = 0;

    for (let visibleIndex = 0; visibleIndex < STACKED_DECK_LAYOUT.MAX_VISIBLE_PHYSICS_CARDS; visibleIndex++) {
      const { rotation } = getStackedDeckCardLayout({
        cardId: `card-${visibleIndex}`,
        hiddenCount: 3,
        visibleIndex,
      });
      const worldQuaternion = getDeckCardWorldQuaternion(deckRotation, rotation);
      const faceNormal = CARD_FACE_NORMAL.clone().applyQuaternion(worldQuaternion);
      const jitter = rotation[2];

      expect(faceNormal.angleTo(WORLD_UP)).toBeLessThan(ROTATION_TOLERANCE_RAD);
      expect(Math.abs(jitter)).toBeLessThanOrEqual(STACKED_DECK_LAYOUT.ROTATION_VARIANCE);
      expect(
        worldQuaternion.angleTo(getCollectingCardWorldQuaternion(deckRotation + jitter))
      ).toBeLessThan(ROTATION_TOLERANCE_RAD);
      maxJitter = Math.max(maxJitter, Math.abs(jitter));
    }

    // The jitter must be real for the flatness assertion to mean anything
    expect(maxJitter).toBeGreaterThan(0);
  });
});
