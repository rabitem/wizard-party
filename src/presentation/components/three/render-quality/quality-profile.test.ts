import { describe, expect, it } from 'vitest';
import { MSAA_MAX_DPR, RENDER_QUALITY_TIERS, RUNTIME_QUALITY, STRUCTURAL_QUALITY } from '@/presentation/config/render-quality.config';
import { resolveAntialias, resolveRenderProfile, stepTier } from './quality-profile';
import { readLearnedTier, readTierOverride, writeLearnedTier, type TierStorage } from './quality-tier-storage';

function memoryStorage(initial: Record<string, string> = {}): TierStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('render quality profiles', () => {
  it('should order tiers so every step up costs more GPU time', () => {
    for (let i = 1; i < RENDER_QUALITY_TIERS.length; i++) {
      const lower = RUNTIME_QUALITY[RENDER_QUALITY_TIERS[i - 1]];
      const higher = RUNTIME_QUALITY[RENDER_QUALITY_TIERS[i]];
      expect(higher.dprMax).toBeGreaterThanOrEqual(lower.dprMax);
      expect(higher.shadowMapSize).toBeGreaterThanOrEqual(lower.shadowMapSize);
    }
  });

  it('should take runtime settings from the current tier and structural ones from the context tier', () => {
    const profile = resolveRenderProfile('ultra', 'low');
    expect(profile.dprMax).toBe(RUNTIME_QUALITY.low.dprMax);
    expect(profile.shadows).toBe(STRUCTURAL_QUALITY.ultra.shadows);
    expect(profile.antialias).toBe(STRUCTURAL_QUALITY.ultra.antialias);
  });

  it('should keep every program-changing setting out of the runtime half', () => {
    // Toggling these relinks every lit material, so the governor must never change them
    for (const key of ['shadows', 'fillLights', 'roomAccentLights', 'bloom'] as const) {
      expect(Object.keys(RUNTIME_QUALITY.high)).not.toContain(key);
      expect(resolveRenderProfile('high', 'low')[key]).toBe(STRUCTURAL_QUALITY.high[key]);
    }
  });

  it('should step between neighbouring tiers and stop at both ends', () => {
    expect(stepTier('medium', 1)).toBe('high');
    expect(stepTier('medium', -1)).toBe('low');
    expect(stepTier('low', -1)).toBeNull();
    expect(stepTier('ultra', 1)).toBeNull();
  });

  it('should skip native MSAA on dense screens', () => {
    expect(resolveAntialias({ antialias: true }, 1)).toBe(true);
    expect(resolveAntialias({ antialias: true }, MSAA_MAX_DPR)).toBe(false);
    expect(resolveAntialias({ antialias: false }, 1)).toBe(false);
  });
});

describe('quality tier storage', () => {
  it('should read a forced tier and ignore "auto" or garbage', () => {
    expect(readTierOverride(memoryStorage({ 'wizard-party-render-quality': 'low' }))).toBe('low');
    expect(readTierOverride(memoryStorage({ 'wizard-party-render-quality': 'auto' }))).toBeNull();
    expect(readTierOverride(memoryStorage({ 'wizard-party-render-quality': 'potato' }))).toBeNull();
    expect(readTierOverride(memoryStorage())).toBeNull();
  });

  it('should remember the tier the governor settled on', () => {
    const storage = memoryStorage();
    writeLearnedTier('medium', storage);
    expect(readLearnedTier(storage)).toBe('medium');
  });

  it('should survive blocked storage', () => {
    const blocked: TierStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readLearnedTier(blocked)).toBeNull();
    expect(() => writeLearnedTier('high', blocked)).not.toThrow();
    expect(readTierOverride(null)).toBeNull();
  });
});
