import type { NdcBounds } from './sandbox.types';

/** A rectangle in client (CSS pixel) coordinates. */
export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function rectWidth(rect: ScreenRect): number {
  return Math.max(0, rect.right - rect.left);
}

export function rectHeight(rect: ScreenRect): number {
  return Math.max(0, rect.bottom - rect.top);
}

export function rectArea(rect: ScreenRect): number {
  return rectWidth(rect) * rectHeight(rect);
}

export function intersection(a: ScreenRect, b: ScreenRect): ScreenRect | null {
  const rect = { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) };
  return rect.right > rect.left && rect.bottom > rect.top ? rect : null;
}

/** True when the rectangles overlap by more than `tolerancePx` on both axes (touching borders do not count). */
export function overlaps(a: ScreenRect, b: ScreenRect, tolerancePx: number): boolean {
  const shared = intersection(a, b);
  return !!shared && rectWidth(shared) > tolerancePx && rectHeight(shared) > tolerancePx;
}

/** Share of `target` that `cover` hides (0-1). */
export function coverFraction(target: ScreenRect, cover: ScreenRect): number {
  const area = rectArea(target);
  if (area <= 0) return 0;
  const shared = intersection(target, cover);
  return shared ? rectArea(shared) / area : 0;
}

export function unionRect(rects: readonly ScreenRect[]): ScreenRect | null {
  if (rects.length === 0) return null;
  return rects.reduce((union, rect) => ({
    left: Math.min(union.left, rect.left),
    top: Math.min(union.top, rect.top),
    right: Math.max(union.right, rect.right),
    bottom: Math.max(union.bottom, rect.bottom),
  }));
}

/** Client rectangle of normalised-device-coordinate bounds drawn into `canvas` (y points up in NDC). */
export function ndcToClientRect(ndc: NdcBounds, canvas: ScreenRect): ScreenRect {
  const width = rectWidth(canvas);
  const height = rectHeight(canvas);
  return {
    left: canvas.left + ((ndc.minX + 1) / 2) * width,
    right: canvas.left + ((ndc.maxX + 1) / 2) * width,
    top: canvas.top + ((1 - ndc.maxY) / 2) * height,
    bottom: canvas.top + ((1 - ndc.minY) / 2) * height,
  };
}

/** Share of `rect` outside the viewport (0 = fully visible). */
export function outsideFraction(rect: ScreenRect, viewport: { width: number; height: number }): number {
  const area = rectArea(rect);
  if (area <= 0) return 0;
  const visible = intersection(rect, { left: 0, top: 0, right: viewport.width, bottom: viewport.height });
  return 1 - (visible ? rectArea(visible) / area : 0);
}

/**
 * Width of the strip each card of a fanned hand exposes to a tap, in the order given.
 * Neighbouring cards overlap, so whichever is on top, a card owns at most the distance to its
 * neighbours' centres; the outermost cards own their full width on the open side.
 */
export function exposedTapWidths(rects: readonly ScreenRect[]): number[] {
  const order = rects.map((rect, index) => ({ index, centre: (rect.left + rect.right) / 2 }))
    .sort((a, b) => a.centre - b.centre);
  const widths = new Array<number>(rects.length).fill(0);
  order.forEach((entry, position) => {
    const width = rectWidth(rects[entry.index]);
    const previous = order[position - 1];
    const next = order[position + 1];
    const gapLeft = previous ? entry.centre - previous.centre : width;
    const gapRight = next ? next.centre - entry.centre : width;
    widths[entry.index] = Math.min(width, Math.max(gapLeft, gapRight));
  });
  return widths;
}

export function roundRect(rect: ScreenRect): ScreenRect {
  return { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) };
}
