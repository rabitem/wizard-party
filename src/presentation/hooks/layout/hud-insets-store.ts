import type { HudInsets } from '@/presentation/types/hud-layout.types';

type Listener = () => void;

/** Edges of a box in CSS px, as returned by getBoundingClientRect. */
export interface EdgeRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const ZERO_HUD_INSETS: HudInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

/**
 * Insets of the free stage inside the game viewport: how far each HUD-covered strip reaches
 * in from the matching viewport edge. Rounded to whole px so sub-pixel layout noise is ignored.
 */
export function getHudInsetsFromRects(viewport: EdgeRect, stage: EdgeRect): HudInsets {
  return {
    top: Math.max(0, Math.round(stage.top - viewport.top)),
    right: Math.max(0, Math.round(viewport.right - stage.right)),
    bottom: Math.max(0, Math.round(viewport.bottom - stage.bottom)),
    left: Math.max(0, Math.round(stage.left - viewport.left)),
  };
}

export function isSameHudInsets(a: HudInsets, b: HudInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

export interface HudInsetsStore {
  get: () => HudInsets;
  set: (next: HudInsets) => void;
  reset: () => void;
  subscribe: (listener: Listener) => () => void;
}

/**
 * Store for the screen insets the HUD reserves. `HudLayout` publishes them; the camera framing
 * (or anything outside React, e.g. a useFrame callback) reads them with `get()`.
 */
export function createHudInsetsStore(): HudInsetsStore {
  let current: HudInsets = ZERO_HUD_INSETS;
  const listeners = new Set<Listener>();
  const set = (next: HudInsets) => {
    if (isSameHudInsets(current, next)) return;
    current = next;
    listeners.forEach((listener) => listener());
  };
  return {
    get: () => current,
    set,
    reset: () => set(ZERO_HUD_INSETS),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The game's HUD insets (one game view at a time). */
export const hudInsetsStore = createHudInsetsStore();
