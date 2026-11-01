'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { publishRenderQuality } from '@/lib/client-telemetry/render-quality-snapshot';
import { useRenderScheduler } from '../frame-scheduling';
import { QualityGovernor } from './quality-governor';
import { useRenderQuality } from './RenderQualityProvider';

/**
 * Steps the render quality tier from measured frame times (inside the Canvas) and publishes the
 * active tier and pixel ratio for telemetry and diagnostics.
 */
export function AdaptiveQuality() {
  const { tier, adaptive, setTier } = useRenderQuality();
  const scheduler = useRenderScheduler();
  const dpr = useThree((state) => state.viewport.dpr);
  const [governor] = useState(() => new QualityGovernor());
  const tierRef = useRef(tier);

  useEffect(() => {
    tierRef.current = tier;
    // Same clock as the scheduler's frame timestamps
    governor.settle(performance.now());
  }, [governor, tier]);

  useEffect(() => {
    publishRenderQuality({ tier, dpr, adaptive });
  }, [tier, dpr, adaptive]);

  useEffect(() => () => publishRenderQuality(null), []);

  useEffect(() => {
    if (!adaptive) return undefined;
    return scheduler.onContinuousFrame((intervalMs, now) => {
      const next = governor.addFrame(intervalMs, tierRef.current, now);
      if (next) setTier(next);
    });
  }, [adaptive, governor, scheduler, setTier]);

  return null;
}
