'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { DRAG_CONFIG } from '../config/drag-drop.config';
import {
  capturePointer,
  cardGestureLock,
  isGesturePointer,
  type CardGestureClaim,
  type GesturePointer,
} from './card-gesture-pointer';

export type CardGesturePhase = 'idle' | 'pressed' | 'dragging';

interface ScreenPoint {
  x: number;
  y: number;
}

export interface CardDragGestureCallbacks {
  onDragStart?: (worldPosition: THREE.Vector3, screenX: number, screenY: number) => void;
  onDragMove?: (screenX: number, screenY: number) => void;
  onDragEnd?: () => void;
  onDragCancel?: () => void;
  onDoubleTap?: () => void;
}

interface UseCardDragGestureParams extends CardDragGestureCallbacks {
  groupRef: RefObject<THREE.Group | null>;
  isPlayable: boolean;
}

/** A press becomes a drag only once the pointer has really moved, so taps never lift the card. */
export function hasPassedDragThreshold(press: ScreenPoint, current: ScreenPoint): boolean {
  return Math.hypot(current.x - press.x, current.y - press.y) > DRAG_CONFIG.DRAG_START_THRESHOLD_PX;
}

export type GestureOutcome = 'none' | 'end' | 'cancel';

/** What releasing the pointer means for a gesture in `phase`: only a drag ends or cancels. */
export function getReleaseOutcome(phase: CardGesturePhase, isCancel: boolean): GestureOutcome {
  if (phase !== 'dragging') return 'none';
  return isCancel ? 'cancel' : 'end';
}

/**
 * Pointer gesture of one hand card: press, drag (after DRAG_START_THRESHOLD_PX), release
 * or system cancel (pointercancel or a lost pointer capture never plays the card), and double
 * tap. Window listeners are attached synchronously on press so no early move or release is
 * missed. The gesture follows only the pointer that pressed: other fingers are ignored, and
 * cardGestureLock keeps them from starting a second card gesture meanwhile.
 */
export function useCardDragGesture({ groupRef, isPlayable, ...callbacks }: UseCardDragGestureParams) {
  const [phase, setPhase] = useState<CardGesturePhase>('idle');
  const phaseRef = useRef<CardGesturePhase>('idle');
  const pressRef = useRef<ScreenPoint>({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const detachRef = useRef<(() => void) | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const claimRef = useRef<CardGestureClaim | null>(null);
  const latestRef = useRef({ callbacks, isPlayable });

  useEffect(() => {
    latestRef.current = { callbacks, isPlayable };
  });

  const transition = useCallback((next: CardGesturePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const release = useCallback((isCancel: boolean) => {
    const outcome = getReleaseOutcome(phaseRef.current, isCancel);
    detachRef.current?.();
    detachRef.current = null;
    activePointerRef.current = null;
    cardGestureLock.release(claimRef.current);
    claimRef.current = null;
    transition('idle');
    if (outcome === 'none') return;
    const { callbacks: latest, isPlayable: playable } = latestRef.current;
    document.body.style.cursor = playable ? 'pointer' : 'auto';
    if (outcome === 'cancel') latest.onDragCancel?.();
    else latest.onDragEnd?.();
  }, [transition]);

  const handleMove = useCallback((event: PointerEvent) => {
    if (!isGesturePointer(activePointerRef.current, event)) return;
    const { callbacks: latest } = latestRef.current;
    if (phaseRef.current === 'pressed') {
      const group = groupRef.current;
      if (!group || !hasPassedDragThreshold(pressRef.current, { x: event.clientX, y: event.clientY })) return;
      transition('dragging');
      lastTapRef.current = 0; // a drag is not a tap: the next press must not count as a double tap
      document.body.style.cursor = 'grabbing';
      latest.onDragStart?.(group.getWorldPosition(new THREE.Vector3()), pressRef.current.x, pressRef.current.y);
    }
    latest.onDragMove?.(event.clientX, event.clientY);
  }, [groupRef, transition]);

  const attach = useCallback((pointer: GesturePointer | undefined) => {
    detachRef.current?.();
    const onUp = (event: PointerEvent) => {
      if (isGesturePointer(activePointerRef.current, event)) release(false);
    };
    const onCancel = (event: PointerEvent) => {
      if (isGesturePointer(activePointerRef.current, event)) release(true);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    // Capture is released implicitly after pointerup, which detaches first; losing it any other
    // way (element removed, capture taken elsewhere) cancels the gesture.
    const capture = pointer ? capturePointer(pointer) : null;
    capture?.element.addEventListener('lostpointercapture', onCancel as EventListener);
    detachRef.current = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      capture?.element.removeEventListener('lostpointercapture', onCancel as EventListener);
      capture?.release();
    };
  }, [handleMove, release]);

  // A card removed from the hand mid-drag must not leave the drag running.
  useEffect(() => () => {
    if (phaseRef.current === 'dragging') latestRef.current.callbacks.onDragCancel?.();
    detachRef.current?.();
    detachRef.current = null;
    cardGestureLock.release(claimRef.current);
    claimRef.current = null;
    activePointerRef.current = null;
    phaseRef.current = 'idle';
  }, []);

  /** `pointer` (the native PointerEvent) ties the gesture to its pointer; omit it for a mouse-only caller. */
  const handlePointerDown = useCallback((screenX: number, screenY: number, pointer?: GesturePointer) => {
    const claim: CardGestureClaim = { pointerId: pointer?.pointerId ?? null, abandon: () => release(true) };
    // Another finger is already pressing or dragging a card: this press is not a gesture.
    if (!cardGestureLock.claim(claim)) return;
    const now = Date.now();
    if (now - lastTapRef.current < DRAG_CONFIG.DOUBLE_TAP_WINDOW_MS) {
      cardGestureLock.release(claim);
      lastTapRef.current = 0;
      latestRef.current.callbacks.onDoubleTap?.();
      return;
    }
    lastTapRef.current = now;
    claimRef.current = claim;
    activePointerRef.current = claim.pointerId;
    pressRef.current = { x: screenX, y: screenY };
    transition('pressed');
    attach(pointer);
  }, [attach, release, transition]);

  return { isDragging: phase === 'dragging', handlePointerDown };
}
