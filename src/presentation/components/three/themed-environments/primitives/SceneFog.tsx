'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SceneFogProps {
  color: string;
  near: number;
  far: number;
}

/**
 * Linear fog on the scene itself. A JSX `<fog attach="fog" />` nested in a
 * <group> attaches to that group and never reaches the renderer, so themed
 * rooms set scene.fog here and restore the previous value on unmount.
 */
export function SceneFog({ color, near, far }: SceneFogProps) {
  const getState = useThree((state) => state.get);

  useEffect(() => {
    const { scene } = getState();
    const previous = scene.fog;
    scene.fog = new THREE.Fog(color, near, far);
    return () => {
      scene.fog = previous;
    };
  }, [getState, color, near, far]);

  return null;
}
