'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { FRAME_SCHEDULING } from '@/presentation/config/render-quality.config';
import { usePrefersReducedMotion } from '../themed-environments/primitives/usePrefersReducedMotion';
import { ambientIntervalMs, RenderScheduler } from './render-scheduler';
import { RenderSchedulerContext } from './render-scheduler-context';
import { SceneMotionMonitor } from './scene-motion-monitor';

/** Runs before every other frame callback, so shadow decisions are made before anything draws. */
const FRAME_SCHEDULER_PRIORITY = -1000;

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'touchstart', 'touchmove'] as const;

/** Any input anywhere on the page, a visible tab or a restored GPU context renders at once. */
function useWakeEvents(scheduler: RenderScheduler, canvas: HTMLCanvasElement): void {
  useEffect(() => {
    const onInput = () => scheduler.pulse(FRAME_SCHEDULING.INPUT_ACTIVE_MS);
    const onVisibilityChange = () => {
      scheduler.resetTiming();
      if (!document.hidden) scheduler.pulse(FRAME_SCHEDULING.INPUT_ACTIVE_MS);
    };
    // Restored contexts start with empty shadow maps (autoUpdate is off) and lost frame timing
    const onContextRestored = () => {
      scheduler.resetTiming();
      scheduler.requestShadowUpdate();
      scheduler.pulse(FRAME_SCHEDULING.MOUNT_ACTIVE_MS);
    };
    for (const type of INPUT_EVENTS) window.addEventListener(type, onInput, { passive: true, capture: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    return () => {
      for (const type of INPUT_EVENTS) window.removeEventListener(type, onInput, { capture: true });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }, [scheduler, canvas]);
}

/**
 * Per rendered frame: before drawing, whether the shadow map is re-rendered; after drawing (when
 * this frame's motion is visible in the world matrices), whether the next frame follows on the
 * next animation frame or at the ambient rate.
 */
function useFrameDecisions(scheduler: RenderScheduler, ambientMs: number) {
  const invalidate = useThree((state) => state.invalidate);
  const get = useThree((state) => state.get);
  const [monitor] = useState(() => new SceneMotionMonitor());
  const renderedRef = useRef(false);
  const ambientMsRef = useRef(ambientMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ambientMsRef.current = ambientMs;
    invalidate();
  }, [ambientMs, invalidate]);

  useEffect(() => scheduler.bind(() => invalidate()), [scheduler, invalidate]);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    const unsubscribe = addAfterEffect(() => {
      if (!renderedRef.current) return;
      renderedRef.current = false;
      clearTimer();
      const now = performance.now();
      const { scene, camera } = get();
      if (scheduler.endFrame(now, monitor.sample(scene, now, camera))) {
        // R3F's loop is still unwinding: an invalidate from here could be cancelled with it
        queueMicrotask(() => invalidate());
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        invalidate();
      }, ambientMsRef.current);
    });
    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [scheduler, monitor, get, invalidate]);

  useFrame((state) => {
    renderedRef.current = true;
    if (scheduler.beginFrame(performance.now()).updateShadows) state.gl.shadowMap.needsUpdate = true;
  }, FRAME_SCHEDULER_PRIORITY);
}

interface FrameSchedulerProps {
  /** Frame rate while nothing moves (ambient flourishes only) */
  ambientFps: number;
  children: ReactNode;
}

/**
 * Activity-aware frame loop for a Canvas with frameloop="demand": renders every animation frame
 * while something is active (input, state changes, animations, awake physics, scene or camera
 * motion), otherwise at the ambient rate, and re-renders the shadow map only on active frames
 * or on request (gl.shadowMap.autoUpdate is off).
 */
export function FrameScheduler({ ambientFps, children }: FrameSchedulerProps) {
  const gl = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const [scheduler] = useState(() => new RenderScheduler());
  const reducedMotion = usePrefersReducedMotion();
  useFrameDecisions(scheduler, ambientIntervalMs(ambientFps, reducedMotion));
  useWakeEvents(scheduler, gl.domElement);

  // Mounts and resizes resolve assets, bake contact shadows and re-frame the camera
  useEffect(() => {
    scheduler.pulse(FRAME_SCHEDULING.MOUNT_ACTIVE_MS);
  }, [scheduler, width, height]);

  return <RenderSchedulerContext.Provider value={scheduler}>{children}</RenderSchedulerContext.Provider>;
}
