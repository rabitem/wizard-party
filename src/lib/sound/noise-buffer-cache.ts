import { AUDIO_ENGINE_CONFIG } from './audio-engine.config';

export type NoiseType = 'white' | 'pink' | 'brown';

type RandomSource = () => number;

function fillWhiteNoise(data: Float32Array, random: RandomSource): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = random() * 2 - 1;
  }
}

/** Pink noise using Paul Kellet's refined method. */
function fillPinkNoise(data: Float32Array, random: RandomSource): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}

function fillBrownNoise(data: Float32Array, random: RandomSource): void {
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
}

const NOISE_FILLERS: Record<NoiseType, (data: Float32Array, random: RandomSource) => void> = {
  white: fillWhiteNoise,
  pink: fillPinkNoise,
  brown: fillBrownNoise,
};

/** Fills `data` with noise of `type`. Exported for tests. */
export function fillNoise(data: Float32Array, type: NoiseType, random: RandomSource = Math.random): void {
  NOISE_FILLERS[type](data, random);
}

/**
 * Noise buffers per (noise type, duration), generated once and reused. Card sounds play many
 * times per trick; regenerating ~4k-40k random samples on the main thread for each one was
 * wasted work. A few variants are rotated so rapid repeats do not sound identical.
 */
export class NoiseBufferCache {
  private readonly variants = new Map<string, AudioBuffer[]>();
  private readonly cursors = new Map<string, number>();
  private owner: BaseAudioContext | null = null;

  constructor(
    private readonly variantCount: number = AUDIO_ENGINE_CONFIG.NOISE_VARIANTS,
    private readonly random: RandomSource = Math.random
  ) {}

  get(context: BaseAudioContext, type: NoiseType, durationSeconds: number): AudioBuffer {
    if (context !== this.owner) {
      // Buffers carry their context's sample rate; a replacement context starts fresh.
      this.variants.clear();
      this.cursors.clear();
      this.owner = context;
    }
    const key = `${type}:${durationSeconds}`;
    let buffers = this.variants.get(key);
    if (!buffers) {
      buffers = [];
      this.variants.set(key, buffers);
    }
    const index = (this.cursors.get(key) ?? 0) % Math.max(1, this.variantCount);
    this.cursors.set(key, index + 1);
    let buffer = buffers[index];
    if (!buffer) {
      buffer = this.create(context, type, durationSeconds);
      buffers[index] = buffer;
    }
    return buffer;
  }

  private create(context: BaseAudioContext, type: NoiseType, durationSeconds: number): AudioBuffer {
    const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    fillNoise(buffer.getChannelData(0), type, this.random);
    return buffer;
  }
}
