import type { WebGlEnvironment } from './sandbox-report.types';

/** Renderer strings of software rasterisers: frame times on them say nothing about a player's GPU. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|apple software/i;

/** Console and page errors that mean the renderer could not start (rather than a game bug). */
const WEBGL_FAILURE = /webgl|getShaderPrecisionFormat|creating .*context|context lost|GL_|gpu process/i;

interface DebugRendererInfo {
  UNMASKED_RENDERER_WEBGL: number;
  UNMASKED_VENDOR_WEBGL: number;
}

function readStrings(context: WebGLRenderingContext | WebGL2RenderingContext): Pick<WebGlEnvironment, 'renderer' | 'vendor'> {
  const debug = context.getExtension('WEBGL_debug_renderer_info') as DebugRendererInfo | null;
  const read = (unmasked: number | undefined, masked: number) => {
    const value = context.getParameter(unmasked ?? masked) as unknown;
    return typeof value === 'string' ? value : null;
  };
  return {
    renderer: read(debug?.UNMASKED_RENDERER_WEBGL, context.RENDERER),
    vendor: read(debug?.UNMASKED_VENDOR_WEBGL, context.VENDOR),
  };
}

function releaseContext(context: WebGLRenderingContext | WebGL2RenderingContext): void {
  (context.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
}

export function isSoftwareRenderer(renderer: string | null): boolean {
  return renderer !== null && SOFTWARE_RENDERER.test(renderer);
}

/** True when an error message says the WebGL renderer failed rather than the game logic. */
export function isWebGlFailure(message: string): boolean {
  return WEBGL_FAILURE.test(message);
}

let detected: WebGlEnvironment | null = null;

/**
 * What WebGL this browser offers, read once per page from a throwaway canvas (so the game's
 * context is never touched, and runs do not pile up contexts): versions, renderer strings,
 * whether it rasterises in software, and GPU timer queries.
 */
export function detectWebGlEnvironment(): WebGlEnvironment {
  detected ??= probeWebGl();
  return detected;
}

function probeWebGl(): WebGlEnvironment {
  const empty: WebGlEnvironment = { webgl2: false, webgl1: false, renderer: null, vendor: null, software: false, timerQuery: false };
  if (typeof document === 'undefined') return empty;
  try {
    const webgl2 = document.createElement('canvas').getContext('webgl2');
    const webgl1 = webgl2 ? null : document.createElement('canvas').getContext('webgl');
    const context = webgl2 ?? webgl1;
    if (!context) return empty;
    const strings = readStrings(context);
    const environment: WebGlEnvironment = {
      webgl2: webgl2 !== null,
      webgl1: true,
      ...strings,
      software: isSoftwareRenderer(strings.renderer),
      timerQuery: webgl2 !== null && webgl2.getExtension('EXT_disjoint_timer_query_webgl2') !== null,
    };
    releaseContext(context);
    return environment;
  } catch {
    return empty;
  }
}
