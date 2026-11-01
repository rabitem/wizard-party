import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_DURATION_SECONDS, MAX_FILE_SIZE_BYTES, MIN_DURATION_SECONDS, formatFileSize, validateAudioFile } from './audio-validation';

describe('audio validation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function stubAudioLoading({
    canPlay = true,
    canPlayTypeResult = 'probably',
    duration: metadataDuration = 1.2,
    metadata = 'loaded',
  }: {
    canPlay?: boolean;
    canPlayTypeResult?: '' | 'maybe' | 'probably';
    duration?: number;
    /** What the element does once given a source: report metadata, fail to decode, or hang. */
    metadata?: 'loaded' | 'error' | 'never';
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
        if (metadata === 'never') return;
        const event = metadata === 'loaded' ? 'loadedmetadata' : 'error';
        queueMicrotask(() => listeners.get(event)?.forEach((listener) => listener()));
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
  const CORRUPTED = /Could not read audio file/;

  it.each([
    ['an MP3 by MIME type', 'clip.bin', 'audio/mpeg'],
    ['a WAV with a legacy MIME type', 'clip.wav', 'audio/x-wav'],
    ['an OGG whose browser reports no MIME type', 'clip.OGG', ''],
    ['an MP3 with an unknown MIME type', 'clip.mp3', 'application/octet-stream'],
  ])('accepts %s', async (_label, name, type) => {
    stubAudioLoading();

    const result = await validateAudioFile(new File(['audio'], name, { type }));

    expect(result.valid).toBe(true);
  });

  it.each([
    ['a text file', 'notes.txt', 'text/plain'],
    ['a FLAC file', 'song.flac', 'audio/flac'],
    ['a file without extension or type', 'sound', ''],
    ['a name ending in a dot', 'sound.', ''],
  ])('rejects %s as an invalid format before decoding it', async (_label, name, type) => {
    const createAudioElement = vi.fn();

    const result = await validateAudioFile(new File(['audio'], name, { type }), { createAudioElement });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid format. Accepted formats: MP3, WAV, or OGG');
    expect(createAudioElement).not.toHaveBeenCalled();
  });

  it('rejects a file over the upload limit with both sizes in the message', async () => {
    stubAudioLoading();
    const file = new File([new Uint8Array(3 * 1024 * 1024)], 'big.wav', { type: 'audio/wav' });

    const result = await validateAudioFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File too large. Maximum size: 2.0 MB (your file: 3.0 MB)');
    expect(result.details).toEqual({ fileSize: 3 * 1024 * 1024 });
  });

  it('accepts a file of exactly the upload limit', async () => {
    stubAudioLoading();
    const file = new File([new Uint8Array(MAX_FILE_SIZE_BYTES)], 'max.wav', { type: 'audio/wav' });

    expect((await validateAudioFile(file)).valid).toBe(true);
  });

  it('rejects audio longer than the maximum duration', async () => {
    stubAudioLoading({ duration: MAX_DURATION_SECONDS + 2 });

    const result = await validateAudioFile(new File(['audio'], 'long.mp3', { type: 'audio/mpeg' }));

    expect(result.valid).toBe(false);
    expect(result.error).toBe(`Audio too long. Maximum duration: ${MAX_DURATION_SECONDS}s (your file: ${(MAX_DURATION_SECONDS + 2).toFixed(1)}s)`);
  });

  it('rejects audio shorter than the minimum duration', async () => {
    stubAudioLoading({ duration: MIN_DURATION_SECONDS / 2 });

    const result = await validateAudioFile(new File(['audio'], 'blip.mp3', { type: 'audio/mpeg' }));

    expect(result.valid).toBe(false);
    expect(result.error).toBe(`Audio too short. Minimum duration: ${MIN_DURATION_SECONDS}s`);
  });

  it('honours stricter duration limits from the caller', async () => {
    stubAudioLoading({ duration: 3 });

    const result = await validateAudioFile(new File(['audio'], 'clip.mp3', { type: 'audio/mpeg' }), { maxDurationSeconds: 2 });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Audio too long. Maximum duration: 2s/);
  });

  it('rejects a file the browser cannot read metadata from as corrupted', async () => {
    stubAudioLoading({ metadata: 'error' });

    const result = await validateAudioFile(new File(['audio'], 'broken.mp3', { type: 'audio/mpeg' }));

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(CORRUPTED);
  });

  it('gives up on a file whose metadata never loads after the load timeout and releases its object URL', async () => {
    vi.useFakeTimers();
    stubAudioLoading({ metadata: 'never' });

    const pending = validateAudioFile(new File(['audio'], 'stuck.mp3', { type: 'audio/mpeg' }), { audioLoadTimeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(499);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(CORRUPTED);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  });

  it.each([
    [512, '512 B'],
    [1536, '1.5 KB'],
    [2 * 1024 * 1024, '2.0 MB'],
  ])('formats %i bytes as %s for the upload list', (bytes, text) => {
    expect(formatFileSize(bytes)).toBe(text);
  });
});
