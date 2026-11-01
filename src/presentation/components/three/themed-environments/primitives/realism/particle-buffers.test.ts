import { describe, expect, it } from 'vitest';
import { PARTICLE_KINDS } from '@/presentation/config/realism.config';
import {
  buildParticleBuffers,
  buildParticleColors,
  particleCountForTier,
  splitLayerCounts,
} from './particle-buffers';

const SNOW = PARTICLE_KINDS.snow;

describe('particleCountForTier', () => {
  it('should keep the base count on high tier and thin it out on weaker tiers', () => {
    const [low, medium, high] = (['low', 'medium', 'high'] as const).map((tier) => particleCountForTier(100, tier, false, 1000));
    expect(high).toBe(100);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
  });

  it('should make reduced-motion fields sparse', () => {
    const full = particleCountForTier(SNOW.baseCount, 'high', false, SNOW.maxCount);
    const reduced = particleCountForTier(SNOW.baseCount, 'high', true, SNOW.maxCount);
    expect(reduced).toBeLessThan(full * 0.5);
    expect(reduced).toBeGreaterThan(0);
  });

  it('should clamp to the cap and never go negative', () => {
    expect(particleCountForTier(5000, 'high', false, 900)).toBe(900);
    expect(particleCountForTier(-10, 'high', false, 900)).toBe(0);
  });
});

describe('splitLayerCounts', () => {
  it('should split proportionally and sum to the total', () => {
    const counts = splitLayerCounts(100, SNOW.layers);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(counts[0]).toBeGreaterThan(counts[2]);
  });

  it('should return zeros for an empty total', () => {
    expect(splitLayerCounts(0, SNOW.layers)).toEqual([0, 0, 0]);
  });
});

describe('buildParticleBuffers', () => {
  it('should be deterministic for the same seed', () => {
    const a = buildParticleBuffers(64, SNOW.layers, 3);
    const b = buildParticleBuffers(64, SNOW.layers, 3);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(Array.from(a.shapes)).toEqual(Array.from(b.shapes));
  });

  it('should differ for different seeds', () => {
    const a = buildParticleBuffers(64, SNOW.layers, 3);
    const b = buildParticleBuffers(64, SNOW.layers, 4);
    expect(Array.from(a.positions)).not.toEqual(Array.from(b.positions));
  });

  it('should keep normalised positions inside the unit box', () => {
    const { positions } = buildParticleBuffers(200, SNOW.layers, 9);
    for (const value of positions) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should write layers far -> near with sizes inside each layer range', () => {
    const { shapes, layerCounts } = buildParticleBuffers(120, SNOW.layers, 2);
    let index = 0;
    SNOW.layers.forEach((layer, layerIndex) => {
      for (let n = 0; n < layerCounts[layerIndex]; n++, index++) {
        const size = shapes[index * 4];
        expect(size).toBeGreaterThanOrEqual(layer.size[0] - 1e-6);
        expect(size).toBeLessThanOrEqual(layer.size[1] + 1e-6);
        expect(shapes[index * 4 + 3]).toBeCloseTo(layer.blur, 5);
      }
    });
    expect(index).toBe(120);
  });
});

describe('buildParticleColors', () => {
  it('should pick only palette colours', () => {
    const { seeds } = buildParticleBuffers(50, SNOW.layers, 5);
    const palette = [[1, 0, 0], [0, 1, 0]] as const;
    const allowed = new Set(palette.map((rgb) => rgb.join(',')));
    const colors = buildParticleColors(seeds, palette);
    for (let i = 0; i < 50; i++) {
      expect(allowed.has(Array.from(colors.slice(i * 3, i * 3 + 3)).join(','))).toBe(true);
    }
  });
});
