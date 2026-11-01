'use client';

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { CAMERA_CONFIG, HAND_CONFIG } from '../../config/layout.config';
import { getCameraEnvelope } from '../../config/themed-environment.config';
import { useSelectedTableTheme } from '../table/table-theme';
import { frameCamera, getEnvelopeClampScale } from './camera-framing';
import { useStageViewport, type StageViewport } from './stage-viewport';
import { getTableFitPoints } from './table-fit-points';
import { useRoomCameraTransition, type OrbitControlsHandle } from './useRoomCameraTransition';

interface SceneCameraProps {
  /** Whether the user is on a mobile device */
  isMobile: boolean;
  /** Seats at the table; the framing fits the actual table instead of the worst case */
  playerCount?: number;
  /** Locks rotation and zoom during card drags: a second finger must not pinch-zoom the table away */
  lockCamera?: boolean;
}

type Vec3 = [number, number, number];

function useStableVec3([x, y, z]: readonly number[]): Vec3 {
  return useMemo<Vec3>(() => [x, y, z], [x, y, z]);
}

/** Vertical position of the table centre: portrait frames it between the HUD and the hand */
function getTableCenterNdcY(aspect: number): number {
  if (!(aspect < HAND_CONFIG.PORTRAIT_MAX_ASPECT)) return 0;
  const { TOP, BOTTOM } = CAMERA_CONFIG.FRAMING.PORTRAIT_RESERVE;
  return BOTTOM - TOP;
}

/**
 * Moves the projection centre into the middle of the stage (off-axis, the view stays straight):
 * with a side dock open, the table and the camera-relative hand sit beside it, not under it.
 */
function useStageViewOffset(stage: StageViewport): void {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (stage.offsetX === 0) camera.clearViewOffset();
    else camera.setViewOffset(width, height, stage.offsetX, 0, width, height);
    invalidate();
  }, [camera, width, height, stage.offsetX, invalidate]);
}

/**
 * Camera setup for the 3D game scene. The camera is framed for the viewport, the table size
 * and the room: narrow screens pull it back, but never above the room's beams (it flattens the
 * view or widens it with zoom instead), and orbiting is kept inside the same envelope.
 */
export function SceneCamera({ isMobile, playerCount = 0, lockCamera = false }: SceneCameraProps) {
  const preset = isMobile ? CAMERA_CONFIG.MOBILE : CAMERA_CONFIG.DESKTOP;
  const stage = useStageViewport();
  const aspect = stage.width / stage.height;
  const get = useThree((state) => state.get);
  const tableTheme = useSelectedTableTheme();
  const envelope = useMemo(() => getCameraEnvelope(tableTheme.id), [tableTheme.id]);
  const fitPoints = useMemo(() => getTableFitPoints(playerCount), [playerCount]);

  const framing = frameCamera({
    presetPosition: preset.POSITION,
    target: CAMERA_CONFIG.TARGET,
    fovDeg: preset.FOV,
    aspect,
    fitPoints,
    envelope,
    tableCenterNdcY: getTableCenterNdcY(aspect),
  });
  useStageViewOffset(stage);
  const controlsRef = useRef<OrbitControlsHandle>(null);
  // A new room's framing is glided to; until the camera arrives the props keep the old one.
  const { shown, isGliding } = useRoomCameraTransition(framing, tableTheme.id, controlsRef);
  // Keyed on the coordinates, not the aspect: resizing a wide window keeps the user's orbit.
  const cameraPosition = useStableVec3(shown.position);
  const target = useStableVec3(shown.target);
  const presetMaxDistance = isMobile ? CAMERA_CONFIG.MAX_DISTANCE.MOBILE : CAMERA_CONFIG.MAX_DISTANCE.DESKTOP;

  // Zooming out or tilting up stops at the envelope: the camera slides back along its view ray.
  // A glide between rooms passes through both envelopes and is left alone.
  const keepInsideEnvelope = useCallback(() => {
    if (isGliding()) return;
    const { camera } = get();
    const position = camera.position;
    const scale = getEnvelopeClampScale([position.x, position.y, position.z], target, envelope);
    if (scale >= 1) return;
    position.set(
      target[0] + (position.x - target[0]) * scale,
      target[1] + (position.y - target[1]) * scale,
      target[2] + (position.z - target[2]) * scale
    );
  }, [get, target, envelope, isGliding]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={cameraPosition}
        fov={preset.FOV}
        zoom={shown.zoom}
        near={0.1}
        far={100}
      />
      <OrbitControls
        ref={controlsRef}
        target={target}
        minDistance={isMobile ? CAMERA_CONFIG.MIN_DISTANCE.MOBILE : CAMERA_CONFIG.MIN_DISTANCE.DESKTOP}
        maxDistance={Math.max(presetMaxDistance, shown.distance, framing.distance)}
        maxPolarAngle={CAMERA_CONFIG.MAX_POLAR_ANGLE}
        minPolarAngle={CAMERA_CONFIG.MIN_POLAR_ANGLE}
        enablePan={false}
        enableRotate={!lockCamera}
        enableZoom={!lockCamera}
        rotateSpeed={CAMERA_CONFIG.ROTATE_SPEED}
        zoomSpeed={CAMERA_CONFIG.ZOOM_SPEED}
        enableDamping
        dampingFactor={CAMERA_CONFIG.DAMPING_FACTOR}
        onChange={keepInsideEnvelope}
      />
    </>
  );
}
