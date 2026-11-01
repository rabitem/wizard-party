'use client';

import { createContext, useContext, useEffect } from 'react';
import { INERT_RENDER_SCHEDULER, type RenderScheduler } from './render-scheduler';

export const RenderSchedulerContext = createContext<RenderScheduler>(INERT_RENDER_SCHEDULER);

/**
 * The table's frame scheduler. Animations that the scene-motion detection cannot see (shader
 * time uniforms, opacity fades) call hold()/pulse(); code that moves a shadow caster while
 * nothing else is active calls requestShadowUpdate().
 */
export function useRenderScheduler(): RenderScheduler {
  return useContext(RenderSchedulerContext);
}

/** Keeps the table at full frame rate while `active` is true. */
export function useRenderActivity(active: boolean): void {
  const scheduler = useRenderScheduler();
  useEffect(() => (active ? scheduler.hold() : undefined), [scheduler, active]);
}

/**
 * A window of full-rate frames whenever `trigger` changes identity (a new game state from the
 * server, a trick result): the animations it starts render at once and at full rate, even
 * before they move far enough for the scene-motion detection to see them.
 */
export function useRenderPulse(trigger: unknown, durationMs: number): void {
  const scheduler = useRenderScheduler();
  useEffect(() => {
    scheduler.pulse(durationMs);
  }, [scheduler, trigger, durationMs]);
}
