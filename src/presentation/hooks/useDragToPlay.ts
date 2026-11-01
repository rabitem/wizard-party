'use client';

import { useRef, useCallback, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { DRAG_CONFIG } from '../config/physics.config';
import {
  calculateVelocityFromSamples,
  checkFlickToPlay,
  constrainToCollisionBoundary,
  createDragPlane,
  createDropInfoForPlay,
  evaluatePlayZone,
  getCursorOnDragPlane,
  getDraggedCardPosition,
  resolveDragStart,
  type DropInfo,
  type VelocitySample,
} from './drag-to-play-math';

export type { DropInfo } from './drag-to-play-math';

export interface DragState {
  isDragging: boolean;
  cardId: string | null;
  worldPosition: THREE.Vector3;
  startWorldPosition: THREE.Vector3;
  grabOffset: THREE.Vector3;
  playZoneProximity: number;
  isInPlayZone: boolean;
  velocity: THREE.Vector3;
}

export interface DragStateSnapshot {
  isDragging: boolean;
  cardId: string | null;
  worldPosition: THREE.Vector3;
  playZoneProximity: number;
  isInPlayZone: boolean;
}

export type DragStateRef = MutableRefObject<DragState>;

interface UseDragToPlayOptions {
  /** Sends the play. Return false when the play was not sent, so the drop is not treated as committed. */
  onPlay: (cardId: string, dropInfo: DropInfo) => boolean | void;
  playZoneCenter?: THREE.Vector3;
}

export interface StartDragParams {
  cardId: string;
  cardWorldPos: THREE.Vector3;
  screenX: number;
  screenY: number;
  camera: THREE.Camera;
  canvasWidth: number;
  canvasHeight: number;
}

export interface EndDragResult {
  played: boolean;
  cardId: string | null;
  dropPosition: THREE.Vector3 | null;
  isSlowDrop: boolean;
}

const NOT_PLAYED: EndDragResult = { played: false, cardId: null, dropPosition: null, isSlowDrop: false };

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

const createDragSnapshot = (state: DragState): DragStateSnapshot => ({
  isDragging: state.isDragging,
  cardId: state.cardId,
  worldPosition: state.worldPosition,
  playZoneProximity: state.playZoneProximity,
  isInPlayZone: state.isInPlayZone,
});

const DEFAULT_PLAY_ZONE_CENTER = new THREE.Vector3(0, 0.15, 0);

function resetMutableDragState(
  dragStateRef: DragStateRef,
  setDragStateSnapshot: (snapshot: DragStateSnapshot) => void,
  velocitySamplesRef: MutableRefObject<VelocitySample[]>,
  grabOffsetRef: MutableRefObject<THREE.Vector3>
): void {
  const resetState = createInitialState();
  dragStateRef.current = resetState;
  setDragStateSnapshot(createDragSnapshot(resetState));
  velocitySamplesRef.current = [];
  grabOffsetRef.current.set(0, 0, 0);
}

interface DragRefs {
  dragStateRef: DragStateRef;
  velocitySamplesRef: MutableRefObject<VelocitySample[]>;
  raycasterRef: MutableRefObject<THREE.Raycaster>;
  dragPlaneRef: MutableRefObject<THREE.Plane>;
  grabOffsetRef: MutableRefObject<THREE.Vector3>;
  setDragStateSnapshot: (snapshot: DragStateSnapshot) => void;
}

function useStartDrag({
  dragStateRef,
  velocitySamplesRef,
  raycasterRef,
  dragPlaneRef,
  grabOffsetRef,
  setDragStateSnapshot,
}: DragRefs) {
  return useCallback((params: StartDragParams) => {
    const { cardId, cardWorldPos, screenX, screenY, camera, canvasWidth, canvasHeight } = params;
    velocitySamplesRef.current = [];
    const cursorOnPlane = getCursorOnDragPlane({
      screenX, screenY, camera, canvasWidth, canvasHeight,
      raycaster: raycasterRef.current, dragPlane: dragPlaneRef.current,
    });
    if (!cursorOnPlane) return;

    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    const { startPosition, grabOffset } = resolveDragStart(cardWorldPos, cursorOnPlane, cameraPosition, dragPlaneRef.current);
    grabOffsetRef.current.copy(grabOffset);
    const nextState = {
      isDragging: true,
      cardId,
      worldPosition: startPosition.clone(),
      startWorldPosition: startPosition.clone(),
      grabOffset: grabOffset.clone(),
      playZoneProximity: 0,
      isInPlayZone: false,
      velocity: new THREE.Vector3(),
    };

    dragStateRef.current = nextState;
    setDragStateSnapshot(createDragSnapshot(nextState));
  }, [dragPlaneRef, dragStateRef, grabOffsetRef, raycasterRef, setDragStateSnapshot, velocitySamplesRef]);
}

function useUpdateDrag({
  dragStateRef,
  velocitySamplesRef,
  raycasterRef,
  dragPlaneRef,
  grabOffsetRef,
  setDragStateSnapshot,
}: DragRefs, playZoneCenter: THREE.Vector3) {
  return useCallback((screenX: number, screenY: number, camera: THREE.Camera, canvasWidth: number, canvasHeight: number) => {
    const current = dragStateRef.current;
    if (!current.isDragging || !current.cardId) return;

    const cursorOnPlane = getCursorOnDragPlane({
      screenX, screenY, camera, canvasWidth, canvasHeight,
      raycaster: raycasterRef.current, dragPlane: dragPlaneRef.current,
    });
    if (!cursorOnPlane) return;

    const cardPosition = getDraggedCardPosition(cursorOnPlane, grabOffsetRef.current, current.startWorldPosition);

    velocitySamplesRef.current.push({ position: cardPosition.clone(), timestamp: performance.now() });
    while (velocitySamplesRef.current.length > DRAG_CONFIG.VELOCITY_SAMPLE_COUNT) velocitySamplesRef.current.shift();

    const velocity = calculateVelocityFromSamples(velocitySamplesRef.current);
    const { proximity, isInZone } = evaluatePlayZone(cardPosition, current.startWorldPosition, playZoneCenter);
    const enteredOrLeftPlayZone = current.isInPlayZone !== isInZone;
    current.worldPosition.copy(cardPosition);
    current.playZoneProximity = proximity;
    current.isInPlayZone = isInZone;
    current.velocity.copy(velocity);
    if (enteredOrLeftPlayZone) setDragStateSnapshot(createDragSnapshot(current));
  }, [dragPlaneRef, dragStateRef, grabOffsetRef, playZoneCenter, raycasterRef, setDragStateSnapshot, velocitySamplesRef]);
}

function useEndDrag({
  dragStateRef,
  velocitySamplesRef,
  grabOffsetRef,
  setDragStateSnapshot,
}: Pick<DragRefs, 'dragStateRef' | 'velocitySamplesRef' | 'grabOffsetRef' | 'setDragStateSnapshot'>, playZoneCenter: THREE.Vector3, onPlay: UseDragToPlayOptions['onPlay']) {
  return useCallback((): EndDragResult => {
    const current = dragStateRef.current;
    if (!current.isDragging || !current.cardId) return NOT_PLAYED;

    const cardId = current.cardId;
    const dropPosition = constrainToCollisionBoundary(current.worldPosition, current.startWorldPosition);
    const velocity = current.velocity.clone();
    const isFlickPlay = velocitySamplesRef.current.length >= 2
      && checkFlickToPlay(velocity, current.worldPosition, current.startWorldPosition, playZoneCenter);
    const shouldPlay = current.isInPlayZone || isFlickPlay;
    const isSlowDrop = velocity.length() < DRAG_CONFIG.SLOW_DROP_VELOCITY_THRESHOLD;

    resetMutableDragState(dragStateRef, setDragStateSnapshot, velocitySamplesRef, grabOffsetRef);

    if (!shouldPlay) return NOT_PLAYED;
    const sent = onPlay(cardId, createDropInfoForPlay({ dropPosition, velocity, isSlowDrop })) !== false;
    if (!sent) return NOT_PLAYED;
    return { played: true, cardId, dropPosition, isSlowDrop };
  }, [dragStateRef, grabOffsetRef, onPlay, playZoneCenter, setDragStateSnapshot, velocitySamplesRef]);
}

export function useDragToPlay({
  onPlay,
  playZoneCenter = DEFAULT_PLAY_ZONE_CENTER,
}: UseDragToPlayOptions) {
  const dragStateRef = useRef<DragState>(createInitialState());
  const [dragState, setDragStateSnapshot] = useState<DragStateSnapshot>(() => createDragSnapshot(createInitialState()));

  const velocitySamplesRef = useRef<VelocitySample[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragPlaneRef = useRef(createDragPlane());
  const grabOffsetRef = useRef(new THREE.Vector3());
  const dragRefs = {
    dragStateRef,
    velocitySamplesRef,
    raycasterRef,
    dragPlaneRef,
    grabOffsetRef,
    setDragStateSnapshot,
  };
  const startDrag = useStartDrag(dragRefs);
  const updateDrag = useUpdateDrag(dragRefs, playZoneCenter);
  const endDrag = useEndDrag(dragRefs, playZoneCenter, onPlay);

  // Cancel drag without playing
  const cancelDrag = useCallback(() => {
    resetMutableDragState(dragStateRef, setDragStateSnapshot, velocitySamplesRef, grabOffsetRef);
  }, []);

  return {
    dragState,
    dragStateRef,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
}
