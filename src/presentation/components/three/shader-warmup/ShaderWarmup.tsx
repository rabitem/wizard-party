'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { SHADER_WARMUP } from '@/presentation/config/render-quality.config';
import { useRenderScheduler } from '../frame-scheduling';
import { warmUpScene } from './shader-warmup';

interface ShaderWarmupProps {
  /** Changes when the scene gains a new set of materials (another room, another light set) */
  warmupKey: string;
}

/** Bumps when the GPU context is restored in place: every program and upload is gone then. */
function useContextGeneration(canvas: HTMLCanvasElement): number {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const onRestored = () => setGeneration((value) => value + 1);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => canvas.removeEventListener('webglcontextrestored', onRestored);
  }, [canvas]);
  return generation;
}

/**
 * Compiles shader programs and uploads textures shortly after the table (or a new room) mounts,
 * while the deal and the HUD are still settling, instead of on the frame that first draws them.
 */
export function ShaderWarmup({ warmupKey }: ShaderWarmupProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const scheduler = useRenderScheduler();
  const generation = useContextGeneration(gl.domElement);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (gl.getContext().isContextLost()) return;
      warmUpScene(gl, scene, camera)
        .then(() => {
          if (!cancelled) scheduler.requestShadowUpdate();
        })
        .catch((error: unknown) => console.warn('[ShaderWarmup] Warm-up failed', error));
    }, SHADER_WARMUP.SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gl, scene, camera, scheduler, warmupKey, generation]);

  return null;
}
