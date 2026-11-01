'use client';

import { useRef, forwardRef, useImperativeHandle, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TABLE_SHAKE } from '../../config/physics.config';
import { settleShakeAngle } from './table-shake';

export interface TableShakeHandle {
  shake: () => void;
}

interface TableShakeWrapperProps {
  children: ReactNode;
  config?: Partial<typeof TABLE_SHAKE>;
}

export const TableShakeWrapper = forwardRef<TableShakeHandle, TableShakeWrapperProps>(
  ({ children, config = {} }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const shakeStartTime = useRef<number | null>(null);
    const isShaking = useRef(false);
    const seedRef = useRef(0);

    const intensity = config.INTENSITY ?? TABLE_SHAKE.INTENSITY;
    const duration = config.DURATION ?? TABLE_SHAKE.DURATION;
    const frequency = config.FREQUENCY ?? TABLE_SHAKE.FREQUENCY;
    const decay = config.DECAY ?? TABLE_SHAKE.DECAY;

    useImperativeHandle(ref, () => ({
      shake: () => {
        shakeStartTime.current = null;
        isShaking.current = true;
        seedRef.current = Math.random() * 1000;
      },
    }), []);

    useFrame((state, delta) => {
      if (!groupRef.current) return;

      if (!isShaking.current) {
        // Smoothly return to rest, then stop: an endless decay tail would move the whole table
        // (and every shadow caster on it) every frame and keep the frame scheduler busy
        const { rotation } = groupRef.current;
        rotation.x = settleShakeAngle(rotation.x, delta);
        rotation.z = settleShakeAngle(rotation.z, delta);
        return;
      }

      if (shakeStartTime.current === null) {
        shakeStartTime.current = state.clock.elapsedTime;
      }

      const elapsed = state.clock.elapsedTime - shakeStartTime.current;
      const progress = elapsed / duration;

      if (progress >= 1) {
        isShaking.current = false;
        shakeStartTime.current = null;
        return;
      }

      // Decaying amplitude
      const amplitude = intensity * Math.exp(-elapsed * decay);

      // Multi-frequency wobble for organic feel
      const time = elapsed * frequency;
      const seed = seedRef.current;

      // Primary shake with variation
      const shakeX = Math.sin(time * 1.0 + seed) * amplitude;
      const shakeZ = Math.cos(time * 1.3 + seed * 0.7) * amplitude * 0.7;

      // Higher frequency detail
      const detailX = Math.sin(time * 2.5 + seed * 1.5) * amplitude * 0.3;
      const detailZ = Math.cos(time * 2.8 + seed * 1.2) * amplitude * 0.2;

      groupRef.current.rotation.x = shakeX + detailX;
      groupRef.current.rotation.z = shakeZ + detailZ;
    });

    return (
      <group ref={groupRef}>
        {children}
      </group>
    );
  }
);

TableShakeWrapper.displayName = 'TableShakeWrapper';
