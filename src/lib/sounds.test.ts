import { afterEach, describe, expect, it, vi } from 'vitest';

const MODULE_IMPORT_TIMEOUT_MS = 10000;

interface StoredSoundSettings {
  enabled: boolean;
  volume: number;
  chaosMode: boolean;
}

/**
 * Stubs the browser globals sounds.ts reads: HTMLAudioElement, the saved sound settings and,
 * optionally, Web Audio. Returns the audio elements and contexts the module creates.
 */
function stubAudioEnvironment({ storedSettings, withAudioContext = false }: { storedSettings?: StoredSoundSettings; withAudioContext?: boolean } = {}) {
  const audioElements: { src: string | undefined; volume: number; play: ReturnType<typeof vi.fn> }[] = [];
  const audioContexts: unknown[] = [];

  class FakeAudioContext {
    state: AudioContextState = 'suspended';
    resume = vi.fn(() => Promise.resolve());
    close = vi.fn(() => Promise.resolve());

    constructor() {
      audioContexts.push(this);
    }
  }

  class FakeAudio {
    src: string | undefined;
    volume = 1;
    onerror: ((event: unknown) => void) | null = null;
    play = vi.fn(() => Promise.resolve());

    constructor(src?: string) {
      this.src = src;
      audioElements.push(this);
    }
  }

  vi.stubGlobal('window', {
    ...(withAudioContext && { AudioContext: FakeAudioContext }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => (storedSettings ? JSON.stringify(storedSettings) : null)),
    setItem: vi.fn(),
  });
  vi.stubGlobal('Audio', FakeAudio);
  return { audioElements, audioContexts };
}

describe('useSound', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns a stable facade so effects do not replay sounds on unrelated rerenders', async () => {
    const { useSound } = await import('./sounds');

    expect(useSound()).toBe(useSound());
  }, MODULE_IMPORT_TIMEOUT_MS);

  it('can validate unknown sound names before attempting playback', async () => {
    const { isSoundName } = await import('./sounds');

    expect(isSoundName('trickWinChoir')).toBe(true);
    expect(isSoundName('missing-sound-file')).toBe(false);
  });

  it('still plays bundled audio files when Web Audio is unavailable', async () => {
    const { audioElements } = stubAudioEnvironment();

    const { useSound } = await import('./sounds');

    expect(() => useSound().play('wizardAirhorn')).not.toThrow();
    expect(audioElements).toHaveLength(1);
    expect(audioElements[0]?.src).toBe('/sounds/airhorn.mp3');
    expect(audioElements[0]?.play).toHaveBeenCalledOnce();
  });

  it('plays forced-volume sounds at the requested room volume', async () => {
    const { audioElements } = stubAudioEnvironment({ storedSettings: { enabled: false, volume: 0, chaosMode: true } });

    const { useSound } = await import('./sounds');

    useSound().playAtVolume('wizardAirhorn', 0.35);

    expect(audioElements).toHaveLength(1);
    expect(audioElements[0]?.volume).toBe(0.35);
    expect(audioElements[0]?.play).toHaveBeenCalledOnce();
  });

  it('plays custom audio at the requested room volume', async () => {
    const { audioElements } = stubAudioEnvironment({ storedSettings: { enabled: false, volume: 0, chaosMode: false } });

    const { useSound } = await import('./sounds');

    useSound().playCustomAudioAtVolume('data:audio/wav;base64,AAAA', 0.25);

    expect(audioElements).toHaveLength(1);
    expect(audioElements[0]?.volume).toBe(0.25);
    expect(audioElements[0]?.play).toHaveBeenCalledOnce();
  });

  it('does not request browser audio permissions for unknown sound names', async () => {
    const { audioElements, audioContexts } = stubAudioEnvironment({ withAudioContext: true });

    const { useSound } = await import('./sounds');

    useSound().play('missing-sound-file' as never, true);

    expect(audioContexts).toHaveLength(0);
    expect(audioElements).toHaveLength(0);
  });

  it('does not create or play audio when effective volume is zero', async () => {
    const { audioElements, audioContexts } = stubAudioEnvironment({
      storedSettings: { enabled: true, volume: 0, chaosMode: true },
      withAudioContext: true,
    });

    const { useSound } = await import('./sounds');

    useSound().play('wizardAirhorn', true);
    useSound().playAtVolume('wizardAirhorn', 0);
    useSound().playCustomAudioAtVolume('data:audio/wav;base64,AAAA', 0);
    useSound().playCustomAudio('data:audio/wav;base64,AAAA', true);

    expect(audioContexts).toHaveLength(0);
    expect(audioElements).toHaveLength(0);
  });
});
