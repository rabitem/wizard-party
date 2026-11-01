import { describe, expect, it, vi } from 'vitest';
import { NoiseBufferCache, fillNoise } from './noise-buffer-cache';

function createFakeContext(sampleRate = 1000) {
  const createBuffer = vi.fn((channels: number, length: number, rate: number) => {
    const data = new Float32Array(length);
    return { channels, length, rate, getChannelData: () => data };
  });
  const context = { sampleRate, createBuffer } as unknown as BaseAudioContext;
  return { context, createBuffer };
}

describe('NoiseBufferCache', () => {
  it('generates each (type, duration) variant once and reuses it', () => {
    const { context, createBuffer } = createFakeContext();
    const cache = new NoiseBufferCache(1);

    const first = cache.get(context, 'white', 0.1);
    const second = cache.get(context, 'white', 0.1);

    expect(second).toBe(first);
    expect(createBuffer).toHaveBeenCalledOnce();
    expect(createBuffer).toHaveBeenCalledWith(1, 100, 1000);
  });

  it('rotates through its variants so rapid repeats differ', () => {
    const { context, createBuffer } = createFakeContext();
    const cache = new NoiseBufferCache(2);

    const a = cache.get(context, 'pink', 0.05);
    const b = cache.get(context, 'pink', 0.05);
    const c = cache.get(context, 'pink', 0.05);

    expect(b).not.toBe(a);
    expect(c).toBe(a);
    expect(createBuffer).toHaveBeenCalledTimes(2);
  });

  it('keeps separate buffers per noise type and duration', () => {
    const { context, createBuffer } = createFakeContext();
    const cache = new NoiseBufferCache(1);

    cache.get(context, 'white', 0.1);
    cache.get(context, 'brown', 0.1);
    cache.get(context, 'white', 0.2);

    expect(createBuffer).toHaveBeenCalledTimes(3);
  });

  it('starts fresh for a replacement context', () => {
    const first = createFakeContext();
    const second = createFakeContext(2000);
    const cache = new NoiseBufferCache(1);

    const original = cache.get(first.context, 'white', 0.1);
    const replacement = cache.get(second.context, 'white', 0.1);

    expect(replacement).not.toBe(original);
    expect(second.createBuffer).toHaveBeenCalledWith(1, 200, 2000);
  });

  it('never creates an empty buffer for tiny durations', () => {
    const { context, createBuffer } = createFakeContext();
    new NoiseBufferCache(1).get(context, 'white', 0.0001);
    expect(createBuffer).toHaveBeenCalledWith(1, 1, 1000);
  });
});

describe('fillNoise', () => {
  it('maps the random source to [-1, 1] for white noise', () => {
    const data = new Float32Array(3);
    fillNoise(data, 'white', () => 0.75);
    expect(Array.from(data)).toEqual([0.5, 0.5, 0.5]);
  });

  it.each(['white', 'pink', 'brown'] as const)('keeps %s noise finite and bounded', (type) => {
    const data = new Float32Array(2048);
    fillNoise(data, type);
    for (const sample of data) {
      expect(Number.isFinite(sample)).toBe(true);
      expect(Math.abs(sample)).toBeLessThanOrEqual(4);
    }
  });
});
