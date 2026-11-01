import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AudioFilePlayer,
  type AudioContextProvider,
  type AudioFilePlayerDependencies,
  type FallbackAudioElement,
} from './audio-file-player';

const flush = () => new Promise<void>((resolve) => {
  setTimeout(resolve, 0);
});

interface FakeSource {
  buffer: unknown;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

function createFakeContext(options: { decodeFails?: boolean; frames?: number } = {}) {
  const sources: FakeSource[] = [];
  const gains: Array<{ gain: { value: number } }> = [];
  const decodeAudioData = vi.fn(() => (options.decodeFails
    ? Promise.reject(new Error('bad file'))
    : Promise.resolve({ length: options.frames ?? 100, numberOfChannels: 2 })));
  const context = {
    destination: {},
    decodeAudioData,
    createBufferSource: () => {
      const source: FakeSource = { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), onended: null };
      sources.push(source);
      return source;
    },
    createGain: () => {
      const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
      gains.push(gain);
      return gain;
    },
  } as unknown as AudioContext;
  return { context, sources, gains, decodeAudioData };
}

function createPlayer(
  context: AudioContext | null,
  overrides: Partial<AudioFilePlayerDependencies> & { playable?: boolean } = {}
) {
  const elements: Array<FallbackAudioElement & { url: string }> = [];
  const loadBytes = vi.fn(async () => new ArrayBuffer(8));
  const provider: AudioContextProvider = {
    tryGetContext: () => context,
    canPlayNow: () => overrides.playable ?? true,
  };
  const deps: AudioFilePlayerDependencies = {
    loadBytes,
    createElement: (url) => {
      const element = { url, volume: 1, onerror: null, play: vi.fn(() => Promise.resolve()) };
      elements.push(element);
      return element;
    },
    now: () => 0,
    maxDecodedBytes: 1_000_000,
    maxFirstPlayDelayMs: 1500,
    ...overrides,
  };
  return { player: new AudioFilePlayer(provider, deps), elements, loadBytes };
}

describe('AudioFilePlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('decodes a file once and replays it from the cache through a gain node', async () => {
    const { context, sources, gains, decodeAudioData } = createFakeContext();
    const { player, loadBytes } = createPlayer(context);

    player.play('/sounds/a.mp3', 0.4);
    await flush();
    player.play('/sounds/a.mp3', 2.5);

    expect(loadBytes).toHaveBeenCalledOnce();
    expect(decodeAudioData).toHaveBeenCalledOnce();
    expect(sources).toHaveLength(2);
    expect(sources.every((source) => source.start.mock.calls.length === 1)).toBe(true);
    // Gains above 1 (chaos mode) are kept: Web Audio can amplify, media elements cannot.
    expect(gains.map((gain) => gain.gain.value)).toEqual([0.4, 2.5]);
  });

  it('disconnects the graph when a sound ends', async () => {
    const { context, sources } = createFakeContext();
    const { player } = createPlayer(context);

    player.play('/sounds/a.mp3', 1);
    await flush();
    sources[0].onended?.();

    expect(sources[0].disconnect).toHaveBeenCalledOnce();
  });

  it('falls back to a media element where Web Audio is unavailable', () => {
    const { player, elements, loadBytes } = createPlayer(null);

    player.play('/sounds/a.mp3', 3);

    expect(loadBytes).not.toHaveBeenCalled();
    expect(elements).toHaveLength(1);
    expect(elements[0].volume).toBe(1);
    expect(elements[0].play).toHaveBeenCalledOnce();
  });

  it('falls back to a media element for files it cannot decode, without retrying', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error');
    const { context } = createFakeContext({ decodeFails: true });
    const { player, elements, loadBytes } = createPlayer(context);

    player.play('/sounds/broken.mp3', 0.5);
    await flush();
    player.play('/sounds/broken.mp3', 0.5);

    expect(loadBytes).toHaveBeenCalledOnce();
    expect(elements).toHaveLength(2);
    expect(elements[0].volume).toBe(0.5);
    expect(error).not.toHaveBeenCalled();
  });

  it('drops a first play whose decode finished too late', async () => {
    const { context, sources } = createFakeContext();
    let time = 0;
    const { player } = createPlayer(context, { now: () => time });

    player.play('/sounds/a.mp3', 1);
    time = 5000;
    await flush();

    expect(sources).toHaveLength(0);
  });

  it('drops sounds while audio is locked instead of queueing them', async () => {
    const { context, sources } = createFakeContext();
    const { player, elements, loadBytes } = createPlayer(context, { playable: false });

    player.play('/sounds/a.mp3', 1);
    await flush();

    expect(loadBytes).not.toHaveBeenCalled();
    expect(sources).toHaveLength(0);
    expect(elements).toHaveLength(0);
  });

  it('evicts the least recently used decoded files beyond the byte budget', async () => {
    // 100 frames x 2 channels x 4 bytes = 800 bytes per file; the budget holds two.
    const { context, decodeAudioData } = createFakeContext({ frames: 100 });
    const { player } = createPlayer(context, { maxDecodedBytes: 1600 });

    player.play('/a.mp3', 1);
    await flush();
    player.play('/b.mp3', 1);
    await flush();
    player.play('/a.mp3', 1); // a is now the most recently used
    player.play('/c.mp3', 1);
    await flush();

    expect(player.cachedBytes).toBe(1600);
    player.play('/a.mp3', 1);
    await flush();
    expect(decodeAudioData).toHaveBeenCalledTimes(3);
    player.play('/b.mp3', 1);
    await flush();
    expect(decodeAudioData).toHaveBeenCalledTimes(4);
  });
});
