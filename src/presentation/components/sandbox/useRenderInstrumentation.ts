'use client';

import { useEffect, useMemo, useRef } from 'react';
import { addEffect, type RootState } from '@react-three/fiber';
import { GlInstrumentation, type GlFrameCounts } from './gl-instrumentation';
import { GpuFrameTimer } from './gpu-frame-timer';
import type { RenderSample } from './sandbox-report.types';

export interface RenderInstrumentation {
  /**
   * Closes the frame: reads renderer.info and the GL counters, resets them for the next frame.
   * `probeStartedAt` is the real time the probe began its own work, which ends the frame's CPU span.
   */
  takeSample(probeStartedAt: number): RenderSample;
}

const EMPTY_GL_COUNTS: GlFrameCounts = { shadowDrawCalls: 0, textureUploads: 0, boneUploads: 0, uploadBytes: 0, programLinks: 0 };

interface FrameState {
  gl: GlInstrumentation | null;
  gpu: GpuFrameTimer | null;
  frameStartedAt: number | null;
}

/**
 * Per-frame render accounting for the sandbox probe: renderer.info over all passes (the probe owns
 * the reset, since post-processing renders several passes per frame), shadow-pass draws, texture
 * uploads, shader links, main-thread frame time and GPU time where the timer extension exists.
 */
export function useRenderInstrumentation(get: () => RootState, realNow: () => number): RenderInstrumentation {
  const state = useRef<FrameState>({ gl: null, gpu: null, frameStartedAt: null });

  useEffect(() => {
    const { gl } = get();
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    const frame = state.current;
    frame.gl = new GlInstrumentation(gl);
    frame.gpu = GpuFrameTimer.create(gl.getContext());
    const removeEffect = addEffect(() => {
      frame.frameStartedAt = realNow();
      frame.gpu?.begin();
    });
    return () => {
      removeEffect();
      frame.gl?.dispose();
      frame.gpu?.dispose();
      frame.gl = null;
      frame.gpu = null;
      gl.info.autoReset = previousAutoReset;
    };
  }, [get, realNow]);

  return useMemo<RenderInstrumentation>(() => ({
    takeSample(probeStartedAt) {
      const frame = state.current;
      const { gl } = get();
      frame.gpu?.end();
      const counts = frame.gl?.takeFrame() ?? EMPTY_GL_COUNTS;
      const sample: RenderSample = {
        drawCalls: gl.info.render.calls,
        shadowDrawCalls: counts.shadowDrawCalls,
        triangles: gl.info.render.triangles,
        textures: gl.info.memory.textures,
        geometries: gl.info.memory.geometries,
        programs: gl.info.programs?.length ?? 0,
        textureUploads: counts.textureUploads,
        boneUploads: counts.boneUploads,
        uploadBytes: counts.uploadBytes,
        programLinks: counts.programLinks,
        cpuMs: frame.frameStartedAt === null ? null : Math.max(0, probeStartedAt - frame.frameStartedAt),
        probeMs: 0,
        gpuMs: frame.gpu?.poll() ?? null,
      };
      frame.frameStartedAt = null;
      gl.info.reset();
      return sample;
    },
  }), [get]);
}
