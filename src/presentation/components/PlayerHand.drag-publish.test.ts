import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { DRAG_CONFIG } from '../config/physics.config';
import type { DragState, DragStateRef } from '../hooks/useDragToPlay';
import {
  IDLE_DRAG_STATE,
  buildDragPublication,
  getDraggedCardPose,
  resolveHeldPlay,
  shouldPublishDragStateChange,
  type HeldPlay,
  type PublishedDragState,
} from './PlayerHand.drag';

const dragging = (overrides: Partial<PublishedDragState> = {}): PublishedDragState => ({
  isDragging: true,
  isHeld: false,
  proximity: 0,
  isInZone: false,
  cardId: 'card-1',
  ...overrides,
});

const dragState = (overrides: Partial<DragState> = {}): DragState => ({
  isDragging: false,
  cardId: null,
  worldPosition: new THREE.Vector3(),
  startWorldPosition: new THREE.Vector3(),
  grabOffset: new THREE.Vector3(),
  playZoneProximity: 0,
  isInPlayZone: false,
  velocity: new THREE.Vector3(),
  ...overrides,
});

describe('shouldPublishDragStateChange', () => {
  it('does not publish position or proximity-only changes while dragging', () => {
    expect(
      shouldPublishDragStateChange(
        dragging({ proximity: 0.1 }),
        dragging({ proximity: 0.8 })
      )
    ).toBe(false);
  });

  it('publishes drag lifecycle changes', () => {
    expect(shouldPublishDragStateChange(IDLE_DRAG_STATE, dragging())).toBe(true);
  });

  it('publishes play-zone boundary changes', () => {
    expect(
      shouldPublishDragStateChange(
        dragging({ isInZone: false }),
        dragging({ isInZone: true })
      )
    ).toBe(true);
  });

  it('publishes the hand-over from a drag to a held play of the same card', () => {
    expect(
      shouldPublishDragStateChange(
        dragging(),
        dragging({ isDragging: false, isHeld: true })
      )
    ).toBe(true);
  });
});

describe('buildDragPublication', () => {
  const dragStateRef = { current: dragState() } as DragStateRef;

  it('keeps showing a dropped card that was sent, at its drop pose, with the drag ref', () => {
    const heldPlay: HeldPlay = { cardId: 'card-1', position: new THREE.Vector3(0.5, 0.35, 1.2), heldAt: 0 };

    const publication = buildDragPublication(dragState(), heldPlay, dragStateRef);

    expect(publication).toMatchObject({ isDragging: false, isHeld: true, cardId: 'card-1', isInZone: false });
    expect(publication.worldPosition).toBe(heldPlay.position);
    expect(publication.dragStateRef).toBe(dragStateRef);
  });

  it('publishes the live drag over a held play', () => {
    const heldPlay: HeldPlay = { cardId: 'card-1', position: new THREE.Vector3(), heldAt: 0 };
    const live = dragState({ isDragging: true, cardId: 'card-2', isInPlayZone: true, playZoneProximity: 1 });

    expect(buildDragPublication(live, heldPlay, dragStateRef)).toMatchObject({
      isDragging: true, isHeld: false, cardId: 'card-2', isInZone: true, proximity: 1,
    });
  });

  it('publishes idle without a drag or a held play', () => {
    expect(buildDragPublication(dragState(), null, dragStateRef)).toEqual({
      ...IDLE_DRAG_STATE, worldPosition: null, dragStateRef: null,
    });
  });
});

describe('getDraggedCardPose', () => {
  it('returns the dragged card at its drawn elevation', () => {
    const pose = getDraggedCardPose(dragState({ worldPosition: new THREE.Vector3(1, DRAG_CONFIG.DRAG_PLANE_Y, 2), playZoneProximity: 1 }));

    expect(pose.x).toBe(1);
    expect(pose.z).toBe(2);
    expect(pose.y).toBeCloseTo(DRAG_CONFIG.DRAG_ELEVATION_BASE + DRAG_CONFIG.DRAG_ELEVATION_PROXIMITY);
  });
});

describe('resolveHeldPlay', () => {
  const heldPlay: HeldPlay = { cardId: 'card-1', position: new THREE.Vector3(), heldAt: 1000 };

  it('holds while the server has not answered', () => {
    expect(resolveHeldPlay({ heldPlay, handCardIds: ['card-1', 'card-2'], isCurrentPlayer: true, now: 1100 })).toBe('hold');
  });

  it('confirms when the card leaves the hand', () => {
    expect(resolveHeldPlay({ heldPlay, handCardIds: ['card-2'], isCurrentPlayer: false, now: 1100 })).toBe('confirmed');
  });

  it('returns the card when the turn moves on with the card still in hand', () => {
    expect(resolveHeldPlay({ heldPlay, handCardIds: ['card-1'], isCurrentPlayer: false, now: 1100 })).toBe('returned');
  });

  it('returns the card when no answer arrives in time', () => {
    const now = heldPlay.heldAt + DRAG_CONFIG.HELD_PLAY_TIMEOUT_MS;
    expect(resolveHeldPlay({ heldPlay, handCardIds: ['card-1'], isCurrentPlayer: true, now })).toBe('returned');
  });
});
