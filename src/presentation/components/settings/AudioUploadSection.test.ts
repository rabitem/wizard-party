import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  startCustomAudioPreview,
  stopCustomAudioPreview,
  type AudioPreviewElement,
} from './AudioUploadSection';

/** Stands in for the browser's Audio element; `playback` decides what `play()` does. */
let playback: () => Promise<void> = () => Promise.resolve();

class FakeAudio implements AudioPreviewElement {
  volume = 1;
  currentTime = 0;
  play = vi.fn(() => playback());
  pause = vi.fn();
  addEventListener = vi.fn();
}

describe('custom audio preview', () => {
  beforeEach(() => {
    playback = () => Promise.resolve();
    vi.stubGlobal('Audio', FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { volume: 0.25, expected: 0.25 },
    { volume: 2, expected: 1 },
    { volume: -0.5, expected: 0 },
  ])('clamps preview volume $volume to $expected and reports browser playback rejection', async ({ volume, expected }) => {
    const error = new Error('NotAllowedError');
    playback = () => Promise.reject(error);
    const onEnded = vi.fn();
    const onError = vi.fn();

    const preview = startCustomAudioPreview({ dataUrl: 'data:audio/wav;base64,AAAA', volume, onEnded, onError });
    await preview.playPromise;

    expect(preview.audio.volume).toBe(expected);
    expect(onError).toHaveBeenCalledWith(error);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it('stops preview playback and rewinds the audio element', () => {
    const audio = new FakeAudio();
    audio.currentTime = 3.5;

    stopCustomAudioPreview(audio);

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
  });
});
