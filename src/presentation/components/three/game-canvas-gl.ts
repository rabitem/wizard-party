import type * as THREE from 'three';
import { COLOR_PIPELINE } from '@/presentation/config/render-quality.config';

export interface GameCanvasGlOptions {
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  failIfMajorPerformanceCaveat: boolean;
  alpha: boolean;
  preserveDrawingBuffer: boolean;
  /** Applied to the renderer by R3F before any component mounts (the composer restores it) */
  toneMapping: THREE.ToneMapping;
}

interface GameCanvasGlInput {
  /** Native MSAA (resolveAntialias: tier wants it and the screen is not dense enough) */
  antialias: boolean;
}

/**
 * WebGL context attributes for the game canvas.
 *
 * - antialias follows the quality tier: the scene renders straight to the default framebuffer
 *   (the bloom composer, when a room uses it, multisamples its own target), and native MSAA
 *   resolves on-tile on mobile GPUs. Context attributes cannot change later, so this is chosen
 *   once per canvas.
 * - preserveDrawingBuffer is off everywhere: it blocks buffer discard, which is costly on
 *   tile-based mobile GPUs. The animation sandbox reads frames back inside the render callback
 *   that drew them, so it measures and renders with exactly these production attributes.
 * - toneMapping makes the colour pipeline explicit (see render-quality.config.ts COLOR_PIPELINE).
 */
export function getGameCanvasGlOptions({ antialias }: GameCanvasGlInput): GameCanvasGlOptions {
  return {
    antialias,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
    alpha: false,
    preserveDrawingBuffer: false,
    toneMapping: COLOR_PIPELINE.RENDERER_TONE_MAPPING,
  };
}
