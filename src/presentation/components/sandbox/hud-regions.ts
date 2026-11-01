import { HUD_REGIONS } from '../../config/sandbox-budgets.config';
import { intersection, rectArea, rectHeight, rectWidth, unionRect, type ScreenRect } from './screen-geometry';

/** Elements of the sandbox's own chrome; excluded from game layout checks. */
export const SANDBOX_UI_ATTRIBUTE = 'data-sandbox-ui';

export const INTERACTIVE_SELECTOR = 'button, [role="button"], input, select, textarea, a[href]';

export interface HudRegion {
  name: string;
  rect: ScreenRect;
}

export function isRendered(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  for (let current: Element | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  }
  return true;
}

export function describeElement(element: Element): string {
  const tagged = element.getAttribute(HUD_REGIONS.ATTRIBUTE);
  if (tagged) return tagged;
  const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
  return `${element.tagName.toLowerCase()}${label ? ` "${label.slice(0, 40)}"` : ''}`;
}

function toRect(element: Element): ScreenRect {
  const { left, top, right, bottom } = element.getBoundingClientRect();
  return { left, top, right, bottom };
}

const COLOR_FUNCTION = /^[a-z-]+\((.*)\)$/;

function parseAlpha(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, raw.endsWith('%') ? value / 100 : value));
}

/**
 * Alpha of a computed CSS colour, in every syntax browsers serialise: legacy `rgba(r, g, b, a)`,
 * and the space-separated `/ alpha` form of rgb(), oklch(), oklab() and color() that Tailwind v4
 * palettes compute to. Colours without an alpha are opaque; `transparent` is not.
 */
export function cssColorAlpha(color: string): number {
  const value = color.trim().toLowerCase();
  if (!value || value === 'transparent' || value === 'none') return 0;
  const match = COLOR_FUNCTION.exec(value);
  if (!match) return 1;
  const body = match[1];
  const slash = body.lastIndexOf('/');
  if (slash >= 0) return parseAlpha(body.slice(slash + 1).trim());
  const legacy = body.split(',');
  return legacy.length === 4 ? parseAlpha(legacy[3].trim()) : 1;
}

function drawsPanel(style: CSSStyleDeclaration): boolean {
  const blur = Boolean(style.backdropFilter) && style.backdropFilter !== 'none';
  return blur || cssColorAlpha(style.backgroundColor) >= HUD_REGIONS.MIN_BACKGROUND_ALPHA;
}

/**
 * The R3F container of the scene canvas (<Canvas>'s outer div, which holds the canvas host).
 * drei <Html> labels portal into it: they are anchored to the 3D scene, not HUD panels.
 */
function sceneOverlayRoot(sceneCanvas: HTMLCanvasElement | null): Element | null {
  return sceneCanvas?.parentElement?.parentElement ?? null;
}

function isExcluded(element: Element, sceneRoot: Element | null): boolean {
  return !!element.closest(`[${SANDBOX_UI_ATTRIBUTE}]`) || !!element.closest(HUD_REGIONS.TRANSIENT_SELECTOR) ||
    element.querySelector('canvas') !== null || (sceneRoot !== null && sceneRoot.contains(element));
}

/** The part of a positioned layer the player sees as HUD: the layer itself, or its controls when it is transparent. */
function visibleRect(element: Element, style: CSSStyleDeclaration): ScreenRect | null {
  if (drawsPanel(style)) return toRect(element);
  const controls = [...element.querySelectorAll(INTERACTIVE_SELECTOR)].filter(isRendered).map(toRect);
  return unionRect(controls);
}

function isPanelSized(rect: ScreenRect, viewportArea: number): boolean {
  return rectWidth(rect) >= HUD_REGIONS.MIN_SIZE_PX && rectHeight(rect) >= HUD_REGIONS.MIN_SIZE_PX &&
    rectArea(rect) < HUD_REGIONS.OVERLAY_MIN_VIEWPORT_FRACTION * viewportArea;
}

/** Outermost positioned layers that draw a panel or hold controls (no data-hud-region tags in the page). */
function inferredRegions(viewportArea: number, sceneRoot: Element | null): HudRegion[] {
  const regions: Array<HudRegion & { element: Element }> = [];
  for (const element of document.body.querySelectorAll('*')) {
    if (regions.some((region) => region.element.contains(element))) continue;
    const style = getComputedStyle(element);
    if ((style.position !== 'fixed' && style.position !== 'absolute') || isExcluded(element, sceneRoot) || !isRendered(element)) continue;
    const rect = visibleRect(element, style);
    if (rect && isPanelSized(rect, viewportArea)) regions.push({ element, name: describeElement(element), rect });
  }
  return regions.map(({ name, rect }) => ({ name, rect }));
}

/**
 * HUD panels on screen now. Tagged regions (data-hud-region="scoreboard") are the contract the
 * HUD can opt into; until it does, panels are inferred from positioned layers. Full-screen
 * overlays (dialogs, round end) are meant to cover the table and are left out, and so are DOM
 * labels anchored in the scene of `sceneCanvas` (drei <Html>).
 */
export function collectHudRegions(sceneCanvas: HTMLCanvasElement | null = null): HudRegion[] {
  const viewportArea = window.innerWidth * window.innerHeight;
  const sceneRoot = sceneOverlayRoot(sceneCanvas);
  const tagged = [...document.querySelectorAll(`[${HUD_REGIONS.ATTRIBUTE}]`)]
    .filter((element) => !isExcluded(element, sceneRoot) && isRendered(element))
    .map((element) => ({ name: describeElement(element), rect: toRect(element) }))
    .filter((region) => rectArea(region.rect) < HUD_REGIONS.OVERLAY_MIN_VIEWPORT_FRACTION * viewportArea);
  return tagged.length > 0 ? tagged : inferredRegions(viewportArea, sceneRoot);
}

const CLIPPING_OVERFLOW = new Set(['hidden', 'clip', 'auto', 'scroll']);

/**
 * The part of `element` its scroll and clip containers let through, or null when none does. A
 * chip scrolled out of a scrolling row is clipped, not off screen: its layout box would otherwise
 * read as offscreen and as overlapping whatever sits beside the row.
 */
function clippedRect(element: Element): ScreenRect | null {
  let rect: ScreenRect | null = toRect(element);
  for (let ancestor = element.parentElement; ancestor && rect; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor);
    const clipsX = CLIPPING_OVERFLOW.has(style.overflowX);
    const clipsY = CLIPPING_OVERFLOW.has(style.overflowY);
    if (!clipsX && !clipsY) continue;
    const box = toRect(ancestor);
    rect = intersection(rect, {
      left: clipsX ? box.left : -Infinity,
      right: clipsX ? box.right : Infinity,
      top: clipsY ? box.top : -Infinity,
      bottom: clipsY ? box.bottom : Infinity,
    });
  }
  return rect;
}

/** Rendered game controls (buttons, inputs, links) outside the sandbox chrome, as far as they show. */
export function collectControls(): Array<{ element: Element; name: string; rect: ScreenRect }> {
  return [...document.querySelectorAll(INTERACTIVE_SELECTOR)]
    .filter((element) => !element.closest(`[${SANDBOX_UI_ATTRIBUTE}]`) && isRendered(element))
    .flatMap((element) => {
      const rect = clippedRect(element);
      return rect ? [{ element, name: describeElement(element), rect }] : [];
    });
}
