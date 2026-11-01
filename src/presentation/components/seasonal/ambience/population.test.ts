import { describe, expect, it } from 'vitest';
import {
  MAX_TOTAL_PARTICLES,
  SEASONAL_PACKS,
  type AmbientLayerConfig,
} from '@/presentation/config/seasonal-ambience.config';
import { resolveDeviceTier } from './device-tier';
import { createRandom, type Particle } from './particle';
import { activeLayers, layerRuntime, resolveLayerCounts, resolveParticleCount, syncPopulation } from './population';
import { createWind, stepWind } from './wind';

const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 844 };

const add = (a: number, b: number): number => a + b;
const sum = (counts: number[]): number => counts.reduce(add, 0);
const isShooting = (l: AmbientLayerConfig): boolean => l.behaviour === 'shooting';
const isBat = (l: AmbientLayerConfig): boolean => l.behaviour === 'bat';

function winterLayers(): readonly AmbientLayerConfig[] {
  const pack = SEASONAL_PACKS.winter;
  if (!pack) throw new Error('winter pack missing');
  return pack.layers;
}

describe('ambience population', () => {
  describe('resolveParticleCount', () => {
    it('should scale with viewport area and device tier', () => {
      const far = winterLayers()[0];
      const desktop = resolveParticleCount(far, DESKTOP, 1);
      const phone = resolveParticleCount(far, PHONE, 1);
      expect(desktop).toBeGreaterThan(phone);
      expect(resolveParticleCount(far, PHONE, 0.5)).toBeLessThan(phone);
    });

    it('should respect maxCount and minCount', () => {
      const far = winterLayers()[0];
      expect(resolveParticleCount(far, { width: 8000, height: 8000 }, 1)).toBe(far.maxCount);
      const shooting = SEASONAL_PACKS.celestial?.layers.find(isShooting);
      expect(shooting && resolveParticleCount(shooting, PHONE, 0.5)).toBe(1);
    });

    it('should be zero for a hidden (zero-size) canvas', () => {
      expect(resolveParticleCount(winterLayers()[3], { width: 0, height: 900 }, 1)).toBe(0);
    });
  });

  describe('resolveLayerCounts', () => {
    it('should keep every pack under the total cap', () => {
      for (const pack of Object.values(SEASONAL_PACKS)) {
        const total = sum(resolveLayerCounts(pack?.layers ?? [], { width: 3840, height: 2160 }, 1));
        expect(total).toBeLessThanOrEqual(MAX_TOTAL_PARTICLES);
      }
    });

    it('should scale all layers down together when over a custom cap', () => {
      const counts = resolveLayerCounts(winterLayers(), DESKTOP, 1, 40);
      expect(sum(counts)).toBeLessThanOrEqual(40);
      expect(counts[0]).toBeGreaterThan(counts[2]);
    });
  });

  describe('activeLayers', () => {
    it('should drop motion-only layers under reduced motion', () => {
      const halloween = SEASONAL_PACKS.halloween?.layers ?? [];
      expect(activeLayers(halloween, false).some(isBat)).toBe(true);
      expect(activeLayers(halloween, true).some(isBat)).toBe(false);
    });
  });

  describe('syncPopulation', () => {
    it('should grow with spawned particles and shrink keeping survivors', () => {
      const runtime = layerRuntime(winterLayers()[1]);
      const particles: Particle[] = [];
      syncPopulation(particles, runtime, 10, createRandom(1), DESKTOP);
      expect(particles).toHaveLength(10);
      const first = particles[0];
      syncPopulation(particles, runtime, 4, createRandom(2), DESKTOP);
      expect(particles).toHaveLength(4);
      expect(particles[0]).toBe(first);
    });
  });
});

describe('stepWind', () => {
  it('should produce gusts that rise above the base and settle back', () => {
    const config = { base: 10, gustStrength: 80, gustEvery: [1, 2], gustDuration: [2, 3] } as const;
    const rng = createRandom(5);
    const wind = createWind(config, rng);
    let peak = 0;
    let sawCalm = false;
    for (let i = 0; i < 60 * 30; i++) {
      stepWind(wind, config, rng, 1 / 60);
      peak = Math.max(peak, wind.value);
      if (!wind.gusting) sawCalm = true;
      expect(wind.gust).toBeGreaterThanOrEqual(0);
      expect(wind.gust).toBeLessThanOrEqual(1);
    }
    expect(peak).toBeGreaterThan(config.base * 1.35 + 20);
    expect(sawCalm).toBe(true);
  });

  it('should never gust without gust strength', () => {
    const config = { base: 0, gustStrength: 0, gustEvery: [0.1, 0.2], gustDuration: [0.1, 0.2] } as const;
    const rng = createRandom(9);
    const wind = createWind(config, rng);
    for (let i = 0; i < 600; i++) stepWind(wind, config, rng, 1 / 60);
    expect(wind.value).toBe(0);
  });
});

describe('resolveDeviceTier', () => {
  it('should rank devices by their hints', () => {
    expect(resolveDeviceTier({ cores: 16, memoryGb: 16, coarsePointer: false })).toBe('high');
    expect(resolveDeviceTier({ cores: 4, coarsePointer: false })).toBe('mid');
    expect(resolveDeviceTier({ cores: 6, coarsePointer: true })).toBe('mid');
    expect(resolveDeviceTier({ cores: 8, memoryGb: 3, coarsePointer: true })).toBe('low');
    expect(resolveDeviceTier({ cores: 2, coarsePointer: false })).toBe('low');
    expect(resolveDeviceTier({ cores: 16, coarsePointer: false, saveData: true })).toBe('low');
  });
});
