import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateAudioFile } from './audio-validation';

describe('audio validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubAudioLoading({
    canPlay = true,
    canPlayTypeResult = 'probably',
    duration: metadataDuration = 1.2,
  }: {
    canPlay?: boolean;
    canPlayTypeResult?: '' | 'maybe' | 'probably';
    duration?: number;
  } = {}) {
    const listeners = new Map<string, Set<() => void>>();

    class FakeAudio {
      duration = metadataDuration;
      readyState = canPlay ? 4 : 0;
      preload = '';
      muted = false;
      playsInline = false;

      addEventListener(type: string, listener: () => void) {
        listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
      }

      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener);
      }

      canPlayType() {
        return canPlayTypeResult;
      }

      load() {
        queueMicrotask(() => {
          listeners.get(canPlay ? 'canplay' : 'error')?.forEach((listener) => listener());
        });
      }

      set src(_value: string) {
        queueMicrotask(() => listeners.get('loadedmetadata')?.forEach((listener) => listener()));
      }
    }

    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:audio'),
      revokeObjectURL: vi.fn(),
    });
  }

  it('rejects files whose metadata reports a non-finite duration', async () => {
    stubAudioLoading({ duration: Number.NaN });

    const file = new File(['audio'], 'broken.mp3', { type: 'audio/mpeg' });
    const result = await validateAudioFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Could not read audio file/);
  });

  it('marks a fully loaded and decodable audio file as playable', async () => {
    stubAudioLoading({ canPlay: true });

    const file = new File(['audio'], 'party.mp3', { type: 'audio/mpeg' });
    const result = await validateAudioFile(file);

    expect(result.valid).toBe(true);
    expect(result.details).toMatchObject({
      duration: 1.2,
      playable: true,
    });
  });

  it('rejects accepted audio files when the browser cannot decode them for playback', async () => {
    stubAudioLoading({ canPlay: false });

    const file = new File(['audio'], 'broken.mp3', { type: 'audio/mpeg' });
    const result = await validateAudioFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot be played by this browser/i);
    expect(result.details).toMatchObject({
      playable: false,
    });
  });

  it('rejects accepted audio formats that the current browser reports as unsupported', async () => {
    stubAudioLoading({ canPlay: true, canPlayTypeResult: '' });

    const file = new File(['audio'], 'party.ogg', { type: 'audio/ogg' });
    const result = await validateAudioFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cannot be played by this browser/i);
    expect(result.details).toMatchObject({
      playable: false,
    });
  });
});
