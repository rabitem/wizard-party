'use client';

import { useCallback, useLayoutEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_CONFIG } from '../../config/layout.config';
import { useRenderScheduler } from './frame-scheduling';
import { getCameraTransitionMs, interpolateCameraPose, type CameraPose } from './camera-transition';
import type { FittedCamera } from './camera-framing';

export type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

interface Glide {
  from: CameraPose;
  to: FittedCamera;
  durationMs: number;
  elapsedMs: number;
  release: () => void;
}

/** Runs before OrbitControls.update (priority -1), which then aims the camera at the eased target */
const GLIDE_FRAME_PRIORITY = -2;

function sameFraming(a: FittedCamera, b: FittedCamera): boolean {
  return a.zoom === b.zoom && a.distance === b.distance
    && a.position.every((value, i) => value === b.position[i])
    && a.target.every((value, i) => value === b.target[i]);
}

/**
 * The framing the camera props show. A new room (table theme) has its own envelope and, on
 * narrow screens, its own framing: the camera glides from where it is to that framing, and the
 * props follow once it arrives. Any other change (viewport, seats) applies at once.
 */
export function useRoomCameraTransition(framing: FittedCamera, roomId: string, controlsRef: RefObject<OrbitControlsHandle | null>) {
  const get = useThree((state) => state.get);
  const scheduler = useRenderScheduler();
  const [shown, setShown] = useState(framing);
  /** The framing shown, or the one the camera is gliding to */
  const destination = useRef(framing);
  const room = useRef(roomId);
  const glide = useRef<Glide | null>(null);

  const stopGlide = useCallback(() => {
    glide.current?.release();
    glide.current = null;
  }, []);

  useLayoutEffect(() => {
    const roomChanged = room.current !== roomId;
    room.current = roomId;
    if (sameFraming(destination.current, framing)) return;
    destination.current = framing;
    stopGlide();
    const { camera } = get();
    const controls = controlsRef.current;
    if (!roomChanged || !(camera instanceof THREE.PerspectiveCamera) || !controls) {
      setShown(framing);
      return;
    }
    const from: CameraPose = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: camera.zoom,
    };
    glide.current = { from, to: framing, durationMs: getCameraTransitionMs(from, framing), elapsedMs: 0, release: scheduler.hold() };
  }, [framing, roomId, get, controlsRef, scheduler, stopGlide]);

  useLayoutEffect(() => stopGlide, [stopGlide]);

  useFrame((state, delta) => {
    const current = glide.current;
    const controls = controlsRef.current;
    if (!current || !controls || !(state.camera instanceof THREE.PerspectiveCamera)) return;
    current.elapsedMs += Math.min(delta * 1000, CAMERA_CONFIG.FRAMING_TRANSITION.MAX_FRAME_MS);
    const pose = interpolateCameraPose(current.from, current.to, current.elapsedMs / current.durationMs);
    state.camera.position.set(...pose.position);
    controls.target.set(...pose.target);
    state.camera.zoom = pose.zoom;
    state.camera.updateProjectionMatrix();
    if (current.elapsedMs < current.durationMs) return;
    stopGlide();
    setShown(current.to);
  }, GLIDE_FRAME_PRIORITY);

  const isGliding = useCallback(() => glide.current !== null, []);
  return { shown, isGliding };
}
