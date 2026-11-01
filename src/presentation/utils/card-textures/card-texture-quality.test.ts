import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CARD_TEXTURE_QUALITY, type CardTextureTier } from '@/presentation/config/card-render.config';
// Warm the module graph at collection time: every test re-imports it after vi.resetModules().
import './card-texture-quality';

type Quality = typeof import('./card-texture-quality');

/** A fresh module: the tier is detected once per page and the renderer limit only rises */
async function loadQuality(): Promise<Quality> {
  vi.resetModules();
  return import('./card-texture-quality');
}

interface TierRow {
  device: string;
  nav: Record<string, unknown> | undefined;
  tier: CardTextureTier;
}

const TIER_ROWS: TierRow[] = [
  { device: 'an iPhone', nav: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 }, tier: 'compact' },
  { device: 'an iPad reporting a Mac (iPadOS)', nav: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }, tier: 'compact' },
  { device: 'a phone reporting 4 GB of memory', nav: { userAgent: 'Android', platform: 'Linux armv8l', maxTouchPoints: 5, deviceMemory: 4 }, tier: 'compact' },
  { device: 'a phone reporting 8 GB of memory', nav: { userAgent: 'Android', platform: 'Linux armv8l', maxTouchPoints: 5, deviceMemory: 8 }, tier: 'standard' },
  { device: 'a Mac without touch', nav: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 }, tier: 'standard' },
  { device: 'a desktop that reports no memory', nav: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32', maxTouchPoints: 0 }, tier: 'standard' },
  { device: 'a page without navigator (server render)', nav: undefined, tier: 'standard' },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCardTextureTier', () => {
  it.each(TIER_ROWS)('should pick the $tier tier on $device', async ({ nav, tier }) => {
    vi.stubGlobal('navigator', nav);
    const quality = await loadQuality();
    expect(quality.getCardTextureTier()).toBe(tier);
  });
});

describe('card texture anisotropy', () => {
  it.each([
    { rendererLimit: 4, expected: Math.min(4, CARD_TEXTURE_QUALITY.MAX_ANISOTROPY) },
    { rendererLimit: 64, expected: CARD_TEXTURE_QUALITY.MAX_ANISOTROPY },
  ])(
    'should create card textures in sRGB with anisotropy $expected when the renderer allows $rendererLimit',
    async ({ rendererLimit, expected }) => {
      const quality = await loadQuality();
      quality.setCardTextureMaxAnisotropy(rendererLimit);
      const texture = new THREE.Texture();
      quality.applyCardTextureQuality(texture);
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(texture.anisotropy).toBe(expected);
    }
  );

  it('should notify caches once when the limit becomes known', async () => {
    const quality = await loadQuality();
    let calls = 0;
    const unsubscribe = quality.onCardTextureQualityChange(() => { calls += 1; });
    quality.setCardTextureMaxAnisotropy(16);
    quality.setCardTextureMaxAnisotropy(16);
    unsubscribe();
    expect(calls).toBe(1);
  });
});
