import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioContextService } from './audio-context.service';
import { NoiseBufferCache } from './noise-buffer-cache';
import { SoundSynthesizerService } from './sound-synthesizer.service';

function audioNode() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

function audioParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function createFakeContext() {
  const createBuffer = vi.fn((channels: number, length: number) => {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  });
  const context = {
    currentTime: 0,
    sampleRate: 1000,
    destination: {},
    createBuffer,
    createBufferSource: () => ({ ...audioNode(), buffer: null, start: vi.fn(), stop: vi.fn() }),
    createBiquadFilter: () => ({ ...audioNode(), type: 'lowpass', frequency: audioParam(), Q: audioParam() }),
    createGain: () => ({ ...audioNode(), gain: audioParam() }),
    createOscillator: () => ({
      ...audioNode(),
      type: 'sine',
      frequency: audioParam(),
      detune: audioParam(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
  } as unknown as AudioContext;
  return { context, createBuffer };
}

function serviceWith(context: AudioContext | null): AudioContextService {
  return {
    isSupported: () => context !== null,
    tryGetPlayableContext: () => context,
  } as unknown as AudioContextService;
}

const NOISE = { noiseType: 'white' as const, duration: 0.1, volume: 0.3 };

describe('SoundSynthesizerService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is a silent no-op where Web Audio is unavailable', () => {
    vi.stubGlobal('window', {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error');
    const synthesizer = new SoundSynthesizerService(new AudioContextService());

    expect(() => {
      synthesizer.playNoise(NOISE, 1);
      synthesizer.playTone({ frequency: 440, duration: 0.1, type: 'sine', volume: 0.3 }, 1);
      synthesizer.playEarrape({ frequencies: [100, 200], duration: 0.2, volume: 1, distortionAmount: 0.5 }, 1);
    }).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  it('reuses noise buffers instead of regenerating them for every card sound', () => {
    const { context, createBuffer } = createFakeContext();
    const synthesizer = new SoundSynthesizerService(serviceWith(context), new NoiseBufferCache(1));

    synthesizer.playNoise(NOISE, 1);
    synthesizer.playNoise(NOISE, 1);
    synthesizer.playNoise({ ...NOISE, filter: { type: 'highpass', frequency: 2000, Q: 1 } }, 1);

    expect(createBuffer).toHaveBeenCalledOnce();
  });

  it('warns instead of logging an error when the audio graph fails', () => {
    const { context } = createFakeContext();
    (context as unknown as { createGain: () => never }).createGain = () => {
      throw new Error('graph failure');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error');
    const synthesizer = new SoundSynthesizerService(serviceWith(context));

    expect(() => synthesizer.playTone({ frequency: 440, duration: 0.1, type: 'sine', volume: 0.3 }, 1)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
