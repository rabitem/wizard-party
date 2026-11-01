const DEG_TO_RAD = Math.PI / 180;

export interface ScreenProjection {
  /** Distance from the camera along its view direction */
  depth: number;
  fovDeg: number;
  /** PerspectiveCamera.zoom */
  zoom: number;
  /** Canvas height in CSS px */
  viewportHeightPx: number;
}

/** CSS pixels covered by one world unit facing the camera at a depth */
export function getPixelsPerWorldUnit({ depth, fovDeg, zoom, viewportHeightPx }: ScreenProjection): number {
  if (!(depth > 0)) return Infinity;
  return (viewportHeightPx * zoom) / (2 * depth * Math.tan((fovDeg * DEG_TO_RAD) / 2));
}

/**
 * World scale that makes content `worldHeight` tall appear exactly `targetPx` tall on screen
 * (camera-facing content). 1 when the projection is degenerate (behind the camera, no size).
 */
export function getScreenConstantScale(params: ScreenProjection & { worldHeight: number; targetPx: number }): number {
  const pixelsPerUnit = getPixelsPerWorldUnit(params);
  const projected = params.worldHeight * pixelsPerUnit;
  if (!Number.isFinite(projected) || projected <= 0) return 1;
  return params.targetPx / projected;
}
