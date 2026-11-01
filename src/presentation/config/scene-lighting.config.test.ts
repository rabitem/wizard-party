import { describe, expect, it } from 'vitest';
import { SURFACE_LAYOUT } from '@/presentation/components/table/surfaces/surface.config';
import { RUNTIME_QUALITY } from './render-quality.config';
import { SCENE_LIGHTING } from './scene-lighting.config';

/** HSV saturation of a #rrggbb colour (0 grey .. 1 fully saturated) */
function getColorSaturation(hexColor: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColor.trim());
  if (!match) throw new Error(`Expected a #rrggbb colour, got ${hexColor}`);
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  return max === 0 ? 0 : (max - min) / max;
}

describe('scene lighting config', () => {
  it('keeps ambient light low enough for card and table shadows to read', () => {
    expect(SCENE_LIGHTING.ambient.intensity).toBeLessThanOrEqual(0.18);
    expect(getColorSaturation(SCENE_LIGHTING.ambient.color)).toBeLessThan(0.25);
  });

  it('should fit the key light shadow camera to the table instead of the whole room', () => {
    expect(SCENE_LIGHTING.key.shadowCameraSize).toBeGreaterThan(SURFACE_LAYOUT.RIM_OUTER);
    expect(SCENE_LIGHTING.key.shadowCameraSize).toBeLessThan(SURFACE_LAYOUT.RIM_OUTER * 1.5);
    expect(SCENE_LIGHTING.key.shadowRadius).toBeGreaterThanOrEqual(4);
  });

  it('should give the high and ultra tiers at least the old shadow texel density on the table', () => {
    const oldTexelsPerUnit = 2048 / (2 * 8);
    for (const tier of ['high', 'ultra'] as const) {
      const texelsPerUnit = RUNTIME_QUALITY[tier].shadowMapSize / (2 * SCENE_LIGHTING.key.shadowCameraSize);
      expect(texelsPerUnit).toBeGreaterThanOrEqual(oldTexelsPerUnit);
    }
  });

  it('should keep the fill and rim lights faint enough to fold into the hemisphere light', () => {
    const folded = SCENE_LIGHTING.fill.intensity + SCENE_LIGHTING.rim.intensity;
    expect(SCENE_LIGHTING.hemisphere.fillFallbackHemisphereBoost).toBeLessThanOrEqual(folded);
    expect(getColorSaturation(SCENE_LIGHTING.fill.color)).toBeLessThan(0.75);
    expect(getColorSaturation(SCENE_LIGHTING.rim.color)).toBeLessThan(0.75);
  });
});
