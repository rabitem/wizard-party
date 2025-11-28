'use client';

import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRelativeHandProps {
  children: React.ReactNode;
}

/**
 * Component that follows the camera - sticky at bottom of screen, always in front
 */
export function CameraRelativeHand({ children }: CameraRelativeHandProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      // Get camera's local coordinate system
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

      // Position fixed distance from camera, at bottom of view
      const pos = camera.position.clone()
        .add(forward.clone().multiplyScalar(2.5))  // Fixed distance in front
        .add(up.clone().multiplyScalar(-1.2));     // Show more of cards

      groupRef.current.position.copy(pos);
      groupRef.current.quaternion.copy(camera.quaternion);
      groupRef.current.renderOrder = 999;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
