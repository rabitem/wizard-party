'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { useRenderScheduler } from '../frame-scheduling';
import { StaticBatchContext } from './static-batch-context';
import { StaticSceneBatchCoordinator } from './static-scene-batch';

/** One shared draw batch across static assemblies; animated siblings stay untouched. */
export function StaticSceneBatch({ children }: { children?: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const invalidate = useThree(state => state.invalidate);
  const scheduler = useRenderScheduler();
  const [coordinator] = useState(() => new StaticSceneBatchCoordinator());
  const register = useCallback((group: THREE.Group) => {
    const release = coordinator.register(group);
    invalidate();
    return () => { release(); invalidate(); };
  }, [coordinator, invalidate]);
  useFrame(() => {
    if (root.current && coordinator.update(root.current)) scheduler.requestShadowUpdate();
  }, -3000);
  useEffect(() => () => coordinator.dispose(), [coordinator]);
  return <StaticBatchContext.Provider value={register}><group ref={root}>{children}</group></StaticBatchContext.Provider>;
}
