/**
 * The render quality the game table currently runs at, published by the presentation layer
 * (RenderQualityProvider) so render.performance windows can be attributed to a tier and pixel
 * ratio, and so tools such as the animation sandbox can read it without touching the scene.
 */
export interface RenderQualitySnapshot {
  tier: string;
  /** Canvas pixel ratio actually rendered at */
  dpr: number;
  /** Whether the tier adapts to frame times (false when forced or in the sandbox) */
  adaptive: boolean;
}

let current: RenderQualitySnapshot | null = null;

export function publishRenderQuality(snapshot: RenderQualitySnapshot | null): void {
  current = snapshot;
}

export function getRenderQualitySnapshot(): RenderQualitySnapshot | null {
  return current;
}
