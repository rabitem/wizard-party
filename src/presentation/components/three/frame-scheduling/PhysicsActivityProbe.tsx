'use client';

import { useEffect } from 'react';
import { useRapier } from '@react-three/rapier';
import { hasAwakeDynamicBodies } from './physics-activity';
import { useRenderScheduler } from './render-scheduler-context';

/** Keeps full-rate frames while physics bodies are awake. Mount inside <Physics>. */
export function PhysicsActivityProbe() {
  const { world } = useRapier();
  const scheduler = useRenderScheduler();
  useEffect(() => scheduler.addProbe(() => hasAwakeDynamicBodies(world)), [scheduler, world]);
  return null;
}
