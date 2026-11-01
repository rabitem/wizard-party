import { safeLocalStorage } from '@/lib/storage';
import { RENDER_QUALITY_STORAGE_KEYS, type RenderQualityTier } from '@/presentation/config/render-quality.config';
import { isRenderQualityTier } from './quality-profile';

/** Minimal Storage surface (injectable for tests). */
export type TierStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Never throws: blocked site data or a sandboxed frame falls back to memory. */
function defaultStorage(): TierStorage | null {
  return typeof window === 'undefined' ? null : safeLocalStorage;
}

function readTier(key: string, storage: TierStorage | null): RenderQualityTier | null {
  try {
    const value = storage?.getItem(key) ?? null;
    return isRenderQualityTier(value) ? value : null;
  } catch {
    return null;
  }
}

/** A tier the viewer forced (anything else, including 'auto', means adaptive). */
export function readTierOverride(storage: TierStorage | null = defaultStorage()): RenderQualityTier | null {
  return readTier(RENDER_QUALITY_STORAGE_KEYS.OVERRIDE, storage);
}

/** The tier the governor last settled on for this device. */
export function readLearnedTier(storage: TierStorage | null = defaultStorage()): RenderQualityTier | null {
  return readTier(RENDER_QUALITY_STORAGE_KEYS.LEARNED, storage);
}

export function writeLearnedTier(tier: RenderQualityTier, storage: TierStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(RENDER_QUALITY_STORAGE_KEYS.LEARNED, tier);
  } catch {
    // Quota or blocked storage: the next visit simply detects again
  }
}
