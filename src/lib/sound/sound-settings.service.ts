/**
 * Sound Settings Service
 * Single responsibility: Manage sound settings persistence
 */

import { safeLocalStorage } from '../storage';

const STORAGE_KEY = 'wizard-party-sound-settings';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
  chaosMode: boolean; // Earrape wizard sounds - disabled by default
}

export const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  chaosMode: false, // Earrape sounds disabled by default
};

function sanitizeVolume(volume: unknown): number {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) {
    return DEFAULT_SETTINGS.volume;
  }
  return Math.max(0, Math.min(1, volume));
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeSettings(settings: unknown): SoundSettings {
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const partial = settings as Partial<Record<keyof SoundSettings, unknown>>;
  return {
    enabled: sanitizeBoolean(partial.enabled, DEFAULT_SETTINGS.enabled),
    volume: sanitizeVolume(partial.volume ?? DEFAULT_SETTINGS.volume),
    chaosMode: sanitizeBoolean(partial.chaosMode, DEFAULT_SETTINGS.chaosMode),
  };
}

export class SoundSettingsService {
  private settings: SoundSettings = { ...DEFAULT_SETTINGS };
  private changeListeners: ((settings: SoundSettings) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
    }
  }

  /**
   * Load settings from localStorage
   */
  load(): void {
    const saved = safeLocalStorage.readJson(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      this.settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...saved });
    }
  }

  /**
   * Save settings to localStorage (kept in memory for this visit when storage is blocked or full)
   */
  private save(): void {
    safeLocalStorage.writeJson(STORAGE_KEY, this.settings);
  }

  /**
   * Get current settings
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  /**
   * Check if sound is enabled
   */
  isSoundEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.settings.volume;
  }

  /**
   * Set sound enabled state
   */
  setSoundEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.save();
    this.notifyListeners();
  }

  /**
   * Set sound volume
   */
  setSoundVolume(volume: number): void {
    this.settings.volume = sanitizeVolume(volume);
    this.save();
    this.notifyListeners();
  }

  /**
   * Check if chaos mode is enabled (earrape wizard sounds)
   */
  isChaosMode(): boolean {
    return this.settings.chaosMode;
  }

  /**
   * Set chaos mode (earrape wizard sounds)
   */
  setChaosMode(enabled: boolean): void {
    this.settings.chaosMode = enabled;
    this.save();
    this.notifyListeners();
  }

  /**
   * Subscribe to settings changes
   */
  onSettingsChange(callback: (settings: SoundSettings) => void): () => void {
    this.changeListeners.push(callback);
    return () => {
      this.changeListeners = this.changeListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const settings = this.getSettings();
    this.changeListeners.forEach((cb) => cb(settings));
  }
}
