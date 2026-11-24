'use client';

import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { getScreenConstantScale } from './screen-size';

type GroupProps = Omit<ThreeElements['group'], 'ref' | 'children'>;

interface ScreenSizedBillboardProps extends GroupProps {
  /** Height of the content that should keep a constant on-screen size (world units, unscaled) */
  contentHeight: number;
  /** On-screen height of that content in CSS px */
  targetPx: number;
  children: ReactNode;
}

interface Scratch {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  forward: THREE.Vector3;
  toLabel: THREE.Vector3;
}

interface FitParams {
  outer: THREE.Group;
  inner: THREE.Group;
  camera: THREE.Camera;
  viewportHeightPx: number;
  contentHeight: number;
  targetPx: number;
  scratch: Scratch;
}

/** Turns `inner` to the camera and scales it so its content is `targetPx` tall on screen. */
function fitToScreen({ outer, inner, camera, viewportHeightPx, contentHeight, targetPx, scratch }: FitParams): void {
  outer.updateWorldMatrix(true, false);
  outer.matrixWorld.decompose(scratch.position, scratch.rotation, scratch.scale);
  // Face the camera regardless of the parent's rotation
  camera.getWorldQuaternion(inner.quaternion).premultiply(scratch.rotation.invert());

  const perspective = camera instanceof THREE.PerspectiveCamera ? camera : null;
  const depth = scratch.toLabel.copy(scratch.position).sub(camera.position).dot(camera.getWorldDirection(scratch.forward));
  const worldScale = getScreenConstantScale({
    worldHeight: contentHeight,
    targetPx,
    depth,
    fovDeg: perspective?.fov ?? 50,
    zoom: perspective?.zoom ?? 1,
    viewportHeightPx,
  });
  inner.scale.setScalar(worldScale / (scratch.scale.x || 1));
}

/**
 * Camera-facing group whose content keeps a constant on-screen size, whatever the camera
 * distance, zoom or parent transform (it may sit on a moving, rotated card). Its children are
 * ordinary depth-tested meshes, so cards and props in front of it still cover it.
 *
 * The frame fit reads the current camera and card pose after their negative-priority
 * callbacks. The layout effect also fits a newly mounted label before its first frame.
 */
export function ScreenSizedBillboard({ contentHeight, targetPx, children, ...props }: ScreenSizedBillboardProps) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const viewportHeightPx = useThree((state) => state.size.height);
  const scratch = useMemo<Scratch>(() => ({
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    toLabel: new THREE.Vector3(),
  }), []);

  function fit(fitCamera: THREE.Camera, heightPx: number) {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (outer && inner) fitToScreen({ outer, inner, camera: fitCamera, viewportHeightPx: heightPx, contentHeight, targetPx, scratch });
  }

  useLayoutEffect(() => fit(camera, viewportHeightPx));
  useFrame((state) => fit(state.camera, state.size.height));

  return (
    <group ref={outerRef} {...props}>
      <group ref={innerRef}>{children}</group>
    </group>
  );
}
