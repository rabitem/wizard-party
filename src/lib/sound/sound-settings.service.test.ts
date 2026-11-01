import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SoundSettingsService, type SoundSettings } from './sound-settings.service';

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
  describe('changes', () => {
    /** Players' browsers already hold their sound settings under this key. */
    const STORAGE_KEY = 'wizard-party-sound-settings';
    let stored: Map<string, string>;

    beforeEach(() => {
      stored = new Map();
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => void stored.set(key, value),
        removeItem: (key: string) => void stored.delete(key),
      });
    });

    it('starts with sound on at 70% volume and chaos mode off', () => {
      expect(new SoundSettingsService().getSettings()).toEqual({ enabled: true, volume: 0.7, chaosMode: false });
    });

    it('remembers every change for the next visit', () => {
      const service = new SoundSettingsService();

      service.setSoundEnabled(false);
      service.setSoundVolume(0.25);
      service.setChaosMode(true);

      expect(JSON.parse(stored.get(STORAGE_KEY) ?? 'null')).toEqual({ enabled: false, volume: 0.25, chaosMode: true });
      const nextVisit = new SoundSettingsService();
      expect(nextVisit.isSoundEnabled()).toBe(false);
      expect(nextVisit.getVolume()).toBe(0.25);
      expect(nextVisit.isChaosMode()).toBe(true);
    });

    it.each([
      [1.5, 1],
      [-0.5, 0],
      [Number.NaN, DEFAULT_SETTINGS.volume],
      [Number.POSITIVE_INFINITY, DEFAULT_SETTINGS.volume],
    ])('keeps a requested volume of %s within range as %s', (requested, expected) => {
      const service = new SoundSettingsService();

      service.setSoundVolume(requested);

      expect(service.getVolume()).toBe(expected);
    });

    it('tells subscribers about each change with a copy they cannot use to change the settings', () => {
      const service = new SoundSettingsService();
      const seen: SoundSettings[] = [];
      const recordAndTamper = (settings: SoundSettings) => {
        seen.push({ ...settings });
        settings.volume = 0;
      };
      service.onSettingsChange(recordAndTamper);

      service.setSoundVolume(0.4);
      service.setChaosMode(true);

      expect(seen).toEqual([
        { enabled: true, volume: 0.4, chaosMode: false },
        { enabled: true, volume: 0.4, chaosMode: true },
      ]);
      expect(service.getVolume()).toBe(0.4);
    });

    it('stops telling a subscriber after it unsubscribes', () => {
      const service = new SoundSettingsService();
      const listener = vi.fn();
      const unsubscribe = service.onSettingsChange(listener);

      service.setSoundEnabled(false);
      unsubscribe();
      service.setSoundEnabled(true);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
