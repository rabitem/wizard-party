import * as THREE from 'three';
import { CARD_DIMENSIONS, DRAG_CONFIG, TABLE_SURFACE, clamp } from '../config/physics.config';
import { TRUMP_ZONE_PHYSICS } from '../config/rapier.config';
import {
  constrainToHorizontalRadius,
  getRectangularFootprintClearanceRadius,
} from '../utils/physics-boundary';

// Table surface height for dropped cards (use config value)
const TABLE_SURFACE_Y = TABLE_SURFACE.CARD_REST_Y;
const PLAYED_CARD_SCALE = 0.9;

export interface VelocitySample {
  position: THREE.Vector3;
  timestamp: number;
}

export interface DropInfo {
  dropPosition: THREE.Vector3;
  startPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  isSlowDrop: boolean;
}

export interface CreateDropInfoForPlayParams {
  dropPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  isSlowDrop: boolean;
}

export function createDropInfoForPlay({
  dropPosition,
  velocity,
  isSlowDrop,
}: CreateDropInfoForPlayParams): DropInfo {
  return {
    dropPosition: dropPosition.clone(),
    startPosition: new THREE.Vector3(
      dropPosition.x,
      DRAG_CONFIG.DRAG_PLANE_Y,
      dropPosition.z
    ),
    velocity: velocity.clone(),
    isSlowDrop,
  };
}

export function createDragPlane(): THREE.Plane {
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_CONFIG.DRAG_PLANE_Y);
}

export interface CursorOnDragPlaneParams {
  screenX: number;
  screenY: number;
  camera: THREE.Camera;
  canvasWidth: number;
  canvasHeight: number;
  raycaster: THREE.Raycaster;
  dragPlane: THREE.Plane;
}

export function getCursorOnDragPlane({
  screenX,
  screenY,
  camera,
  canvasWidth,
  canvasHeight,
  raycaster,
  dragPlane,
}: CursorOnDragPlaneParams): THREE.Vector3 | null {
  const ndcX = (screenX / canvasWidth) * 2 - 1;
  const ndcY = -(screenY / canvasHeight) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const cursorOnPlane = new THREE.Vector3();
  return raycaster.ray.intersectPlane(dragPlane, cursorOnPlane) ? cursorOnPlane : null;
}

/**
 * Point on the drag plane drawn at the same screen position as `point`: where the
 * camera ray through `point` meets the plane. The hand is camera-relative and floats
 * well above the table, so its own x/z are not under the card on screen.
 */
export function projectOntoDragPlane(
  point: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  dragPlane: THREE.Plane
): THREE.Vector3 | null {
  const direction = point.clone().sub(cameraPosition);
  if (direction.lengthSq() === 0) return null;
  const ray = new THREE.Ray(cameraPosition.clone(), direction.normalize());
  return ray.intersectPlane(dragPlane, new THREE.Vector3());
}

export interface DragStart {
  startPosition: THREE.Vector3;
  grabOffset: THREE.Vector3;
}

/**
 * Anchor a drag on the drag plane: the card starts where the hand card is on screen and
 * keeps the small offset between that point and where the pointer grabbed it.
 */
export function resolveDragStart(
  cardWorldPos: THREE.Vector3,
  cursorOnPlane: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  dragPlane: THREE.Plane
): DragStart {
  const cardOnPlane = projectOntoDragPlane(cardWorldPos, cameraPosition, dragPlane) ?? cursorOnPlane;
  return {
    startPosition: new THREE.Vector3(cardOnPlane.x, DRAG_CONFIG.DRAG_PLANE_Y, cardOnPlane.z),
    grabOffset: new THREE.Vector3(cursorOnPlane.x - cardOnPlane.x, 0, cursorOnPlane.z - cardOnPlane.z),
  };
}

/**
 * Card position for a pointer on the plane. The table-edge limit only keeps the card on
 * the table; it widens to include the pickup point so the card never jumps away from the
 * pointer when the hand projects beyond the edge (zoomed-out camera).
 */
export function getDraggedCardPosition(
  cursorOnPlane: THREE.Vector3,
  grabOffset: THREE.Vector3,
  startPosition: THREE.Vector3
): THREE.Vector3 {
  const limit = DRAG_CONFIG.TABLE_EDGE_LIMIT;
  return new THREE.Vector3(
    clamp(cursorOnPlane.x - grabOffset.x, Math.min(-limit, startPosition.x), Math.max(limit, startPosition.x)),
    DRAG_CONFIG.DRAG_PLANE_Y,
    clamp(cursorOnPlane.z - grabOffset.z, Math.min(-limit, startPosition.z), Math.max(limit, startPosition.z))
  );
}

/** Calculate velocity from position samples */
export function calculateVelocityFromSamples(samples: VelocitySample[]): THREE.Vector3 {
  const velocity = new THREE.Vector3();
  if (samples.length >= 2) {
    const oldest = samples[0];
    const newest = samples[samples.length - 1];
    const dt = (newest.timestamp - oldest.timestamp) / 1000;
    if (dt > 0.001) {
      velocity.subVectors(newest.position, oldest.position).divideScalar(dt);
    }
  }
  return velocity;
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** How far the card has moved toward the play zone centre since pickup. */
export function getTravelTowardCenter(
  cardPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  playZoneCenter: THREE.Vector3
): number {
  return horizontalDistance(startPosition, playZoneCenter) - horizontalDistance(cardPosition, playZoneCenter);
}

/**
 * Play zone state for a card on the drag plane. The card must both sit inside the zone
 * and have travelled toward the centre, so a grab-and-release never plays even when the
 * camera is zoomed in far enough for the hand to project inside the zone.
 */
export function evaluatePlayZone(
  cardPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  playZoneCenter: THREE.Vector3
): { proximity: number; isInZone: boolean } {
  const distance = horizontalDistance(cardPosition, playZoneCenter);
  const travelProgress = clamp(
    getTravelTowardCenter(cardPosition, startPosition, playZoneCenter) / DRAG_CONFIG.MIN_PLAY_TRAVEL,
    0,
    1
  );
  const ringProximity = clamp(
    1 - (distance - DRAG_CONFIG.PLAY_ZONE_RADIUS) / (DRAG_CONFIG.PLAY_ZONE_ENTRY_THRESHOLD - DRAG_CONFIG.PLAY_ZONE_RADIUS),
    0,
    1
  );
  return {
    proximity: Math.min(ringProximity, travelProgress),
    isInZone: distance <= DRAG_CONFIG.PLAY_ZONE_RADIUS && travelProgress >= 1,
  };
}

/** Check if flick gesture should trigger play */
export function checkFlickToPlay(
  velocity: THREE.Vector3,
  currentPosition: THREE.Vector3,
  startPosition: THREE.Vector3,
  playZoneCenter: THREE.Vector3
): boolean {
  if (getTravelTowardCenter(currentPosition, startPosition, playZoneCenter) < DRAG_CONFIG.MIN_FLICK_TRAVEL) return false;
  const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
  if (horizontalVelocity.length() <= DRAG_CONFIG.FLICK_VELOCITY_THRESHOLD) return false;
  const toCenter = new THREE.Vector3(playZoneCenter.x - currentPosition.x, 0, playZoneCenter.z - currentPosition.z).normalize();
  return horizontalVelocity.normalize().dot(toCenter) > DRAG_CONFIG.FLICK_DIRECTION_THRESHOLD;
}

/**
 * Constrain a position to be outside the trump collision zone
 */
export function constrainToCollisionBoundary(
  position: THREE.Vector3,
  fallbackPosition: THREE.Vector3
): THREE.Vector3 {
  const clearanceRadius = getRectangularFootprintClearanceRadius(
    TRUMP_ZONE_PHYSICS.HARD_RADIUS,
    CARD_DIMENSIONS.WIDTH,
    CARD_DIMENSIONS.HEIGHT,
    PLAYED_CARD_SCALE,
    TABLE_SURFACE.EPSILON
  );
  const boundedPosition = constrainToHorizontalRadius(
    position,
    clearanceRadius,
    fallbackPosition
  );

  return new THREE.Vector3(boundedPosition.x, TABLE_SURFACE_Y, boundedPosition.z);
}
