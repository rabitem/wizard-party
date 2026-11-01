import type { SyncSlice } from '@/lib/account/settings-sync-engine';
import { soundManager } from '@/lib/sounds';
import { loadGameSettings, saveGameSettings, type GameSettings } from '@/presentation/components/settings';
import {
  TIMEOUT_SOUNDBOARD_CHANGED_EVENT,
  loadTimeoutSoundboardPreferences,
  saveTimeoutSoundboardPreferences,
  type TimeoutSoundboardPreferences,
} from '@/presentation/components/hud/timeout-soundboard-preferences';

function onWindowEvent(name: string, callback: () => void): () => void {
  window.addEventListener(name, callback);
  return () => window.removeEventListener(name, callback);
}

type SyncedGameSettings = Omit<GameSettings, 'customSounds' | 'customTrickWinAudio'>;

/** Visual and gameplay preferences. Custom sounds sync separately (binary, see custom-sound-sync). */
export const gameSettingsSlice: SyncSlice<SyncedGameSettings> = {
  key: 'game-settings',
  read() {
    const { customSounds: _sounds, customTrickWinAudio: _legacy, ...rest } = loadGameSettings();
    return rest;
  },
  apply(remote) {
    const local = loadGameSettings();
    // saveGameSettings normalizes unknown or outdated values from other app versions.
    saveGameSettings({ ...local, ...(remote as Partial<GameSettings>), customSounds: local.customSounds, customTrickWinAudio: local.customTrickWinAudio });
  },
  subscribe: (callback) => onWindowEvent('settings-changed', callback),
};

export const soundSettingsSlice: SyncSlice = {
  key: 'sound-settings',
  read: () => soundManager?.getSettings() ?? null,
  apply(remote) {
    if (!soundManager || typeof remote !== 'object' || remote === null) return;
    const value = remote as Record<string, unknown>;
    if (typeof value.enabled === 'boolean') soundManager.setSoundEnabled(value.enabled);
    if (typeof value.volume === 'number') soundManager.setSoundVolume(value.volume);
    if (typeof value.chaosMode === 'boolean') soundManager.setChaosMode(value.chaosMode);
  },
  subscribe: (callback) => soundManager?.onSettingsChange(callback) ?? (() => undefined),
};

export const soundboardSlice: SyncSlice<TimeoutSoundboardPreferences> = {
  key: 'soundboard',
  read: loadTimeoutSoundboardPreferences,
  apply: (remote) => void saveTimeoutSoundboardPreferences(remote as TimeoutSoundboardPreferences),
  subscribe: (callback) => onWindowEvent(TIMEOUT_SOUNDBOARD_CHANGED_EVENT, callback),
};

export const SETTINGS_SYNC_SLICES: readonly SyncSlice[] = [gameSettingsSlice, soundSettingsSlice, soundboardSlice];
