import type { RenderDeviceSignals } from './select-initial-tier';

/** What a throwaway WebGL2 context tells us before the game canvas is created. */
export interface GraphicsProbe {
  webgl2: boolean;
  /** WebGL2 exists only without failIfMajorPerformanceCaveat: software or blocklisted GPU. */
  majorPerformanceCaveat: boolean;
  renderer: string | null;
}

const UNAVAILABLE: GraphicsProbe = { webgl2: false, majorPerformanceCaveat: false, renderer: null };

let cachedProbe: GraphicsProbe | null = null;

function createContext(failIfMajorPerformanceCaveat: boolean): WebGL2RenderingContext | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.getContext('webgl2', { failIfMajorPerformanceCaveat, powerPreference: 'default' });
  } catch {
    return null;
  }
}

function readRenderer(gl: WebGL2RenderingContext): string | null {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const value: unknown = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Releases the probe context at once: browsers cap live contexts per page. */
function release(gl: WebGL2RenderingContext): void {
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Nothing to release
  }
}

/** Probes WebGL2 once per page (cached). SSR and test environments report "unavailable". */
export function probeGraphics(): GraphicsProbe {
  if (cachedProbe) return cachedProbe;
  if (typeof document === 'undefined') return UNAVAILABLE;
  const fast = createContext(true);
  const gl = fast ?? createContext(false);
  if (!gl) {
    cachedProbe = UNAVAILABLE;
    return cachedProbe;
  }
  cachedProbe = { webgl2: true, majorPerformanceCaveat: fast === null, renderer: readRenderer(gl) };
  release(gl);
  return cachedProbe;
}

/** Device signals for selectInitialTier(). */
export function readRenderDeviceSignals(): RenderDeviceSignals {
  const probe = probeGraphics();
  const nav = (typeof navigator === 'undefined' ? {} : navigator) as Partial<Navigator> & { deviceMemory?: number };
  const hasWindow = typeof window !== 'undefined';
  return {
    renderer: probe.renderer,
    majorPerformanceCaveat: probe.majorPerformanceCaveat,
    cores: nav.hardwareConcurrency ?? 0,
    memoryGb: nav.deviceMemory ?? 0,
    coarsePointer: hasWindow && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    devicePixelRatio: hasWindow ? window.devicePixelRatio || 1 : 1,
  };
}
