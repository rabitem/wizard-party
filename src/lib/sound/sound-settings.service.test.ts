import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SoundSettingsService } from './sound-settings.service';

describe('SoundSettingsService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sanitizes persisted settings before exposing them to playback', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify({
        enabled: 'no',
        volume: 3,
        chaosMode: 'yes',
      })),
      setItem: vi.fn(),
    });

    const service = new SoundSettingsService();

    expect(service.getSettings()).toEqual({
      enabled: DEFAULT_SETTINGS.enabled,
      volume: 1,
      chaosMode: DEFAULT_SETTINGS.chaosMode,
    });
  });

  it('clamps negative persisted volume to silence', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => JSON.stringify({ volume: -2 })),
      setItem: vi.fn(),
    });

    const service = new SoundSettingsService();

    expect(service.getVolume()).toBe(0);
  });
});
