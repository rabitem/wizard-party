import { describe, expect, it } from 'vitest';
import { THEMED_FX_IDS } from '@/presentation/config/theme-fx.config';
import { DEFAULT_STEP_PARAMS, ParticlePool, type ParticleSpawn } from './particle-pool';
import { createRng, getLandEffectId, seedFromPosition, shouldSpawnBat } from './land-fx-selection';
import { LAND_FX_DURATION } from './land-fx.constants';

const spawn = (overrides: Partial<ParticleSpawn> = {}): ParticleSpawn => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 0.1, r: 1, g: 1, b: 1, ...overrides,
});

describe('getLandEffectId', () => {
  it('should keep the classic dust for classic and unknown tables', () => {
    expect(getLandEffectId('forest')).toBe('dust');
    expect(getLandEffectId('does-not-exist')).toBe('dust');
    expect(getLandEffectId(null)).toBe('dust');
  });

  it('should map every seasonal and trend table to its own effect', () => {
    for (const id of THEMED_FX_IDS) {
      expect(getLandEffectId(id)).toBe(id);
      expect(LAND_FX_DURATION[id]).toBeGreaterThanOrEqual(0.6);
      expect(LAND_FX_DURATION[id]).toBeLessThanOrEqual(1.2);
    }
  });
});

describe('burst seeding', () => {
  it('should give the same landing point the same seed and sequence', () => {
    const seed = seedFromPosition([0.42, 0.03, -1.1]);
    expect(seed).toBe(seedFromPosition([0.42, 0.03, -1.1]));
    expect(seed).not.toBe(seedFromPosition([0.43, 0.03, -1.1]));
    const a = createRng(seed);
    const b = createRng(seed);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('should spawn the bat on roughly one drop in four', () => {
    let bats = 0;
    const drops = 4000;
    for (let i = 0; i < drops; i++) {
      if (shouldSpawnBat(createRng(seedFromPosition([i * 0.013, 0, i * -0.007])))) bats++;
    }
    expect(bats / drops).toBeGreaterThan(0.2);
    expect(bats / drops).toBeLessThan(0.3);
  });
});

describe('ParticlePool', () => {
  it('should cap spawns at capacity and reuse slots after reset', () => {
    const pool = new ParticlePool(3);
    expect([pool.spawn(spawn()), pool.spawn(spawn()), pool.spawn(spawn())]).toEqual([0, 1, 2]);
    expect(pool.spawn(spawn())).toBe(-1);
    const positionBuffer = pool.position;
    pool.reset();
    expect(pool.count).toBe(0);
    expect(pool.spawn(spawn({ x: 5 }))).toBe(0);
    expect(pool.position).toBe(positionBuffer);
    expect(pool.position[0]).toBe(5);
  });

  it('should move particles under gravity and settle them on the floor', () => {
    const pool = new ParticlePool(1);
    pool.spawn(spawn({ vx: 1, vy: 1 }));
    const params = { ...DEFAULT_STEP_PARAMS, gravity: -10, floorY: 0 };
    pool.step(0.05, params);
    expect(pool.position[0]).toBeGreaterThan(0);
    expect(pool.position[1]).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) pool.step(0.05, params);
    expect(pool.position[1]).toBe(0);
  });

  it('should hide particles during their delay and after their life', () => {
    const pool = new ParticlePool(1);
    pool.spawn(spawn({ delay: 0.2, life: 0.5 }));
    pool.step(0.1, DEFAULT_STEP_PARAMS);
    expect(pool.alpha[0]).toBe(0);
    expect(pool.aliveCount()).toBe(1);
    pool.step(0.2, DEFAULT_STEP_PARAMS);
    expect(pool.alpha[0]).toBeGreaterThan(0);
    pool.step(0.5, DEFAULT_STEP_PARAMS);
    expect(pool.alpha[0]).toBe(0);
    expect(pool.aliveCount()).toBe(0);
  });
});

describe('particle fade envelope', () => {
  const params = { ...DEFAULT_STEP_PARAMS, fadeIn: 0.1, fadePow: 1, twinkle: 0, alphaSteps: 0, gravity: 0, floorY: null };

  /** Alpha of one life-1 particle after each step, at the given cumulative ages */
  function alphasAt(ages: number[], stepParams: typeof params): number[] {
    const pool = new ParticlePool(1);
    pool.spawn(spawn({ life: 1 }));
    let age = 0;
    return ages.map((target) => {
      pool.step(target - age, stepParams);
      age = target;
      return pool.alpha[0];
    });
  }

  it('should fade in, then out', () => {
    const [rising, peak, fading, ended] = alphasAt([0.05, 0.1, 0.55, 1], params);
    expect(rising).toBeCloseTo(0.5);
    expect(peak).toBeCloseTo(1);
    expect(fading).toBeCloseTo(0.5);
    expect(ended).toBe(0);
  });

  it('should quantise alpha for retro stepped fades', () => {
    expect(alphasAt([0.55], { ...params, alphaSteps: 4 })).toEqual([0.5]);
  });
});
