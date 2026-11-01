/**
 * Pure helpers that decide which land effect plays and seed each burst.
 * Kept free of three.js so they are cheap to unit test.
 */

import { getThemeFx, type LandEffectId } from '@/presentation/config/theme-fx.config';
import { LAND_FX_TIMING } from './land-fx.constants';

export type Rng = () => number;

/** Land effect for a table theme id; unknown themes keep the classic dust. */
export function getLandEffectId(tableThemeId: string | null | undefined): LandEffectId {
  return getThemeFx(tableThemeId).landEffect;
}

/** Deterministic mulberry32 generator in [0, 1). */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seed from the landing point, so the same drop looks the same for every
 * client (and in the deterministic animation sandbox).
 */
export function seedFromPosition(position: readonly [number, number, number]): number {
  const qx = Math.round(position[0] * 1000);
  const qz = Math.round(position[2] * 1000);
  return (Math.imul(qx, 73856093) ^ Math.imul(qz, 19349663) ^ 0x9e3779b9) >>> 0;
}

/** Uniform float in [min, max). */
export function range(rand: Rng, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Uniform integer in [min, max]. */
export function rangeInt(rand: Rng, min: number, max: number): number {
  return Math.min(max, Math.floor(min + rand() * (max - min + 1)));
}

/** Random element of a non-empty list. */
export function pick<T>(rand: Rng, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

/** The Halloween bat shows up on roughly one drop in four. */
export function shouldSpawnBat(rand: Rng): boolean {
  return rand() < LAND_FX_TIMING.BAT_CHANCE;
}
