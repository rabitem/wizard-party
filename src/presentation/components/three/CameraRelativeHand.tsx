'use client';

import { useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_STACKING } from '../../config/physics.config';
import { HAND_CONFIG } from '../../config/layout.config';

interface CameraRelativeHandProps {
  children: React.ReactNode;
}

/**
 * Hand placement in camera space: DISTANCE_FROM_CAMERA in front of the lens, below the view
 * centre. When the framing widens the view with zoom < 1 (a room envelope forced it), the
 * offset and the group scale grow by 1 / zoom so the hand keeps its size and place on screen.
 */
export function getCameraRelativeHandPlacement(aspect: number, zoom: number): { verticalOffset: number; scale: number } {
  const compensation = zoom > 0 ? 1 / zoom : 1;
  const offset = aspect < HAND_CONFIG.PORTRAIT_MAX_ASPECT ? HAND_CONFIG.VERTICAL_OFFSET.PORTRAIT : HAND_CONFIG.VERTICAL_OFFSET.LANDSCAPE;
  return { verticalOffset: offset * compensation, scale: compensation };
}

/**
 * Component that follows the camera - sticky at bottom of screen, always in front.
 * The hand cards themselves (Card3D renderOnTop) set their render order and disable depth
 * test whenever their materials are created, so the hand always renders on top of the table.
 */
export function CameraRelativeHand({ children }: CameraRelativeHandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const scratch = useMemo(() => ({ forward: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const perspective = camera instanceof THREE.PerspectiveCamera ? camera : null;
    const { verticalOffset, scale } = getCameraRelativeHandPlacement(perspective?.aspect ?? 1, perspective?.zoom ?? 1);
    const forward = scratch.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = scratch.up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    group.position.copy(camera.position)
      .addScaledVector(forward, HAND_CONFIG.DISTANCE_FROM_CAMERA)
      .addScaledVector(up, verticalOffset);
    group.quaternion.copy(camera.quaternion);
    group.scale.setScalar(scale);
    group.renderOrder = CARD_STACKING.HAND_RENDER_ORDER;
  });

  return <group ref={groupRef}>{children}</group>;
}
