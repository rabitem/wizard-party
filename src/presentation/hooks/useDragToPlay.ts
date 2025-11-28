'use client';

import { useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { DRAG_CONFIG, clamp } from '../config/physics.config';

// Re-export for components that need visual radius
export const PLAY_ZONE_VISUAL_RADIUS = DRAG_CONFIG.PLAY_ZONE_VISUAL_RADIUS;
export const DRAG_SCALE_MULTIPLIER = DRAG_CONFIG.SCALE_MULTIPLIER;

interface VelocitySample {
  position: THREE.Vector3;
  timestamp: number;
}

interface DragState {
  isDragging: boolean;
  cardId: string | null;
  worldPosition: THREE.Vector3;
  startWorldPosition: THREE.Vector3;
  grabOffset: THREE.Vector3;
  playZoneProximity: number;
  isInPlayZone: boolean;
  velocity: THREE.Vector3;
}

interface UseDragToPlayOptions {
  onPlay: (cardId: string) => void;
  playZoneCenter?: THREE.Vector3;
}

const createInitialState = (): DragState => ({
  isDragging: false,
  cardId: null,
  worldPosition: new THREE.Vector3(),
  startWorldPosition: new THREE.Vector3(),
  grabOffset: new THREE.Vector3(),
  playZoneProximity: 0,
  isInPlayZone: false,
  velocity: new THREE.Vector3(),
});

export function useDragToPlay({
  onPlay,
  playZoneCenter = new THREE.Vector3(0, 0.15, 0),
}: UseDragToPlayOptions) {
  const [dragState, setDragState] = useState<DragState>(createInitialState);

  const velocitySamplesRef = useRef<VelocitySample[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragPlaneRef = useRef(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_CONFIG.DRAG_PLANE_Y)
  );
  const grabOffsetRef = useRef(new THREE.Vector3());

  // Start dragging a card
  const startDrag = useCallback((
    cardId: string,
    cardWorldPos: THREE.Vector3,
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    velocitySamplesRef.current = [];

    // Calculate where cursor intersects drag plane
    const ndcX = (screenX / canvasWidth) * 2 - 1;
    const ndcY = -(screenY / canvasHeight) * 2 + 1;
    raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const cursorOnPlane = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, cursorOnPlane);

    // Offset = cursor position minus card center (so card stays under finger)
    grabOffsetRef.current.set(
      cursorOnPlane.x - cardWorldPos.x,
      0,
      cursorOnPlane.z - cardWorldPos.z
    );

    // Start position is where the card currently is
    const startPosition = new THREE.Vector3(
      cardWorldPos.x,
      DRAG_CONFIG.DRAG_PLANE_Y,
      cardWorldPos.z
    );

    setDragState({
      isDragging: true,
      cardId,
      worldPosition: startPosition.clone(),
      startWorldPosition: startPosition.clone(),
      grabOffset: grabOffsetRef.current.clone(),
      playZoneProximity: 0,
      isInPlayZone: false,
      velocity: new THREE.Vector3(),
    });
  }, []);

  // Update drag position from screen coordinates
  const updateDrag = useCallback((
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    if (!dragState.isDragging || !dragState.cardId) return;

    // Convert screen to NDC
    const ndcX = (screenX / canvasWidth) * 2 - 1;
    const ndcY = -(screenY / canvasHeight) * 2 + 1;

    // Raycast to drag plane
    raycasterRef.current.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const cursorOnPlane = new THREE.Vector3();

    if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, cursorOnPlane)) {
      // Apply grab offset so card center follows where user grabbed
      const cardPosition = new THREE.Vector3(
        cursorOnPlane.x - grabOffsetRef.current.x,
        DRAG_CONFIG.DRAG_PLANE_Y,
        cursorOnPlane.z - grabOffsetRef.current.z
      );

      // Clamp to table bounds
      cardPosition.x = clamp(cardPosition.x, -3.5, 3.5);
      cardPosition.z = clamp(cardPosition.z, -3.5, 3.5);

      const now = performance.now();

      // Track velocity samples
      velocitySamplesRef.current.push({
        position: cardPosition.clone(),
        timestamp: now,
      });

      // Keep only recent samples
      while (velocitySamplesRef.current.length > DRAG_CONFIG.VELOCITY_SAMPLE_COUNT) {
        velocitySamplesRef.current.shift();
      }

      // Calculate velocity from samples
      const velocity = new THREE.Vector3();
      if (velocitySamplesRef.current.length >= 2) {
        const oldest = velocitySamplesRef.current[0];
        const newest = velocitySamplesRef.current[velocitySamplesRef.current.length - 1];
        const dt = (newest.timestamp - oldest.timestamp) / 1000;

        if (dt > 0.001) {
          velocity.subVectors(newest.position, oldest.position).divideScalar(dt);
        }
      }

      // Calculate distance to play zone (horizontal only)
      const horizontalDist = Math.sqrt(
        Math.pow(cardPosition.x - playZoneCenter.x, 2) +
        Math.pow(cardPosition.z - playZoneCenter.z, 2)
      );

      // Proximity: 0 = far, 1 = in zone
      const proximity = clamp(
        1 - (horizontalDist - DRAG_CONFIG.PLAY_ZONE_RADIUS) /
            (DRAG_CONFIG.PLAY_ZONE_ENTRY_THRESHOLD - DRAG_CONFIG.PLAY_ZONE_RADIUS),
        0,
        1
      );

      const isInZone = horizontalDist <= DRAG_CONFIG.PLAY_ZONE_RADIUS;

      setDragState(prev => ({
        ...prev,
        worldPosition: cardPosition,
        playZoneProximity: proximity,
        isInPlayZone: isInZone,
        velocity,
      }));
    }
  }, [dragState.isDragging, dragState.cardId, playZoneCenter]);

  // End drag and determine if card should be played
  const endDrag = useCallback((): { played: boolean; cardId: string | null } => {
    if (!dragState.isDragging || !dragState.cardId) {
      return { played: false, cardId: null };
    }

    const cardId = dragState.cardId;
    let shouldPlay = dragState.isInPlayZone;

    // Check for flick toward center
    if (!shouldPlay && velocitySamplesRef.current.length >= 2) {
      const velocity = dragState.velocity;
      const speed = velocity.length();

      // Direction toward play zone center
      const toCenter = new THREE.Vector3()
        .subVectors(playZoneCenter, dragState.worldPosition)
        .normalize();

      const velocityDir = velocity.clone().normalize();
      const alignment = velocityDir.dot(toCenter);

      // Fast flick toward center = play
      if (speed > DRAG_CONFIG.FLICK_VELOCITY_THRESHOLD &&
          alignment > DRAG_CONFIG.FLICK_DIRECTION_THRESHOLD) {
        shouldPlay = true;
      }
    }

    // Reset state
    setDragState(createInitialState());
    velocitySamplesRef.current = [];
    grabOffsetRef.current.set(0, 0, 0);

    if (shouldPlay) {
      onPlay(cardId);
      return { played: true, cardId };
    }

    return { played: false, cardId };
  }, [dragState, playZoneCenter, onPlay]);

  // Cancel drag without playing
  const cancelDrag = useCallback(() => {
    setDragState(createInitialState());
    velocitySamplesRef.current = [];
    grabOffsetRef.current.set(0, 0, 0);
  }, []);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
}
