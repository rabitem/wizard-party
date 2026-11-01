import * as THREE from 'three';
import { CARD_DIMENSIONS, DRAG_CONFIG } from '../config/physics.config';
import type { DragState, DragStateRef } from '../hooks/useDragToPlay';

export interface PublishedDragState {
  isDragging: boolean;
  /** The card was dropped and sent; the dragged card stays on the table until the server answers. */
  isHeld: boolean;
  proximity: number;
  isInZone: boolean;
  cardId: string | null;
}

export interface DragStatePublication extends PublishedDragState {
  worldPosition: THREE.Vector3 | null;
  dragStateRef: DragStateRef | null;
}

export const IDLE_DRAG_STATE: PublishedDragState = { isDragging: false, isHeld: false, proximity: 0, isInZone: false, cardId: null };

/** A dropped card that was sent to the server and is shown at its drop pose until confirmed. */
export interface HeldPlay {
  cardId: string;
  position: THREE.Vector3;
  heldAt: number;
}

/** Pose a card returning to the hand starts from: where the dragged card was drawn. */
export interface HandReturn {
  cardId: string;
  position: THREE.Vector3;
  scale: number;
}

/** World scale of the dragged card (DraggedCard's default base scale times the drag zoom). */
export const DRAGGED_CARD_SCALE = CARD_DIMENSIONS.BASE_SCALE * DRAG_CONFIG.SCALE_MULTIPLIER;

export function shouldPublishDragStateChange(previous: PublishedDragState, current: PublishedDragState): boolean {
  return (
    current.isDragging !== previous.isDragging ||
    current.isHeld !== previous.isHeld ||
    current.isInZone !== previous.isInZone ||
    current.cardId !== previous.cardId
  );
}

/** Scene-facing drag state: the live drag, else the held play, else idle. */
export function buildDragPublication(state: DragState, heldPlay: HeldPlay | null, dragStateRef: DragStateRef): DragStatePublication {
  if (state.isDragging) {
    return {
      isDragging: true,
      isHeld: false,
      proximity: state.playZoneProximity,
      isInZone: state.isInPlayZone,
      cardId: state.cardId,
      worldPosition: state.worldPosition,
      dragStateRef,
    };
  }
  if (heldPlay) {
    return { ...IDLE_DRAG_STATE, isHeld: true, cardId: heldPlay.cardId, worldPosition: heldPlay.position, dragStateRef };
  }
  return { ...IDLE_DRAG_STATE, worldPosition: null, dragStateRef: null };
}

/** Where the dragged card is drawn (matches DraggedCard's elevation target). */
export function getDraggedCardPose(state: DragState): THREE.Vector3 {
  const elevation = DRAG_CONFIG.DRAG_ELEVATION_BASE + state.playZoneProximity * DRAG_CONFIG.DRAG_ELEVATION_PROXIMITY;
  return new THREE.Vector3(state.worldPosition.x, elevation, state.worldPosition.z);
}

export type HeldPlayResolution = 'hold' | 'confirmed' | 'returned';

interface ResolveHeldPlayParams {
  heldPlay: HeldPlay;
  handCardIds: readonly string[];
  isCurrentPlayer: boolean;
  now: number;
}

/**
 * Decide what happens to a held play. The server confirms a play by removing the card
 * from the hand; the turn moving on with the card still in hand, or no answer at all
 * (rejected or dropped play), sends the card back.
 */
export function resolveHeldPlay({ heldPlay, handCardIds, isCurrentPlayer, now }: ResolveHeldPlayParams): HeldPlayResolution {
  if (!handCardIds.includes(heldPlay.cardId)) return 'confirmed';
  if (!isCurrentPlayer) return 'returned';
  if (now - heldPlay.heldAt >= DRAG_CONFIG.HELD_PLAY_TIMEOUT_MS) return 'returned';
  return 'hold';
}
