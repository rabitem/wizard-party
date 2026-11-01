// Sound effects manager for the game
// Uses Web Audio API for low-latency playback with realistic card sounds
// Follows Facade pattern - composes extracted services (SRP compliant)

import {
  GAME_WIN_SOUND_NAMES,
  JESTER_SOUND_NAMES,
  ROUND_WIN_SOUND_NAMES,
  TRICK_WIN_SOUND_NAMES,
  WIZARD_SOUND_NAMES,
  type GameWinSoundName,
  type JesterSoundName,
  type RoundWinSoundName,
  type SpecialCardSoundName,
  type TrickWinSoundName,
  type WizardSoundName,
} from '@shared/domain';
import {
  AudioContextService,
  AudioFilePlayer,
  SoundSettingsService,
  SoundSynthesizerService,
  browserAudioUnlockEnvironment,
  installAudioUnlock,
  type SoundSettings,
  DEFAULT_SETTINGS,
} from './sound';
import { SOUND_CONFIGS, type SoundConfig } from './sound-configs';

export type { SoundSettings, SoundConfig };
export { DEFAULT_SETTINGS };

export type SoundName =
  | 'cardPlay'
  // Wizard sounds
  | WizardSoundName
  // Jester sounds
  | JesterSoundName
  // Trick win sounds
  | TrickWinSoundName
  // Round win sounds (2 total)
  | RoundWinSoundName
  // Game win sounds (2 total)
  | GameWinSoundName
  // Card sounds
  | 'cardDeal'
  | 'cardShuffle'
  | 'cardSort'
  | 'cardSlide'
  | 'cardImpact'
  // Legacy sounds (for backward compatibility)
  | 'trickWin'
  | 'roundEnd'
  | 'gameWin'
  | 'gameLose'
  | 'yourTurn'
  | 'bidPlace'
  | 'playerJoin'
  | 'playerLeave'
  | 'buttonClick'
  | 'emote';

// Wizard sounds - randomly selected when playing a wizard
export const WIZARD_SOUNDS: SoundName[] = [
  ...WIZARD_SOUND_NAMES,
];

// Jester sounds - randomly selected when playing a jester
export const JESTER_SOUNDS: SoundName[] = [
  ...JESTER_SOUND_NAMES,
];

// Trick win sounds - played when a player wins a trick
export const TRICK_WIN_SOUNDS: SoundName[] = [
  ...TRICK_WIN_SOUND_NAMES,
];

// Round win sounds - played when a player wins a round
export const ROUND_WIN_SOUNDS: SoundName[] = [
  ...ROUND_WIN_SOUND_NAMES,
];

// Game win sounds - played when a player wins the game
export const GAME_WIN_SOUNDS: SoundName[] = [
  ...GAME_WIN_SOUND_NAMES,
];

export function getRandomWizardSound(): SoundName {
  return WIZARD_SOUNDS[Math.floor(Math.random() * WIZARD_SOUNDS.length)];
}

export function getRandomJesterSound(): SoundName {
  return JESTER_SOUNDS[Math.floor(Math.random() * JESTER_SOUNDS.length)];
}

export function getRandomTrickWinSound(): SoundName {
  return TRICK_WIN_SOUNDS[Math.floor(Math.random() * TRICK_WIN_SOUNDS.length)];
}

export function getRandomRoundWinSound(): SoundName {
  return ROUND_WIN_SOUNDS[Math.floor(Math.random() * ROUND_WIN_SOUNDS.length)];
}

export function getRandomGameWinSound(): SoundName {
  return GAME_WIN_SOUNDS[Math.floor(Math.random() * GAME_WIN_SOUNDS.length)];
}

// CHAOS MODE volume multiplier for earrape effect
const CHAOS_VOLUME_MULTIPLIER = 3.0;

// Sounds that get the chaos volume boost
const CHAOS_SOUNDS = new Set<SoundName>([
  ...WIZARD_SOUNDS,
  ...JESTER_SOUNDS,
  ...TRICK_WIN_SOUNDS,
  ...ROUND_WIN_SOUNDS,
  ...GAME_WIN_SOUNDS,
]);

function clampAudioVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_SETTINGS.volume;
  return Math.max(0, Math.min(1, volume));
}

function isAudibleVolume(volume: number): boolean {
  return Number.isFinite(volume) && volume > 0;
}

/**
 * SoundManager - Facade for sound system
 * Composes focused services following SRP
 */
class SoundManager {
  // Composed services (SRP compliant)
  private readonly audioContext: AudioContextService;
  private readonly settings: SoundSettingsService;
  private readonly synthesizer: SoundSynthesizerService;
  private readonly filePlayer: AudioFilePlayer;

  constructor() {
    this.audioContext = new AudioContextService();
    this.settings = new SoundSettingsService();
    this.synthesizer = new SoundSynthesizerService(this.audioContext);
    this.filePlayer = new AudioFilePlayer(this.audioContext);
    const unlockEnvironment = browserAudioUnlockEnvironment();
    if (unlockEnvironment) installAudioUnlock(this.audioContext, unlockEnvironment);
  }

  play(sound: SoundName, forcePlay = false) {
    if (!forcePlay && !this.settings.isSoundEnabled()) return;

    const config = SOUND_CONFIGS[sound];
    if (!config) {
      console.warn('[Sound] No config for:', sound);
      return;
    }

    const masterVolume = this.settings.getVolume();
    const chaosMultiplier = this.getChaosMultiplier(sound);
    const effectiveVolume = this.getEffectiveVolume(config, masterVolume, chaosMultiplier);
    if (!isAudibleVolume(effectiveVolume)) return;

    this.audioContext.resume();
    this.playSoundByType(config, masterVolume, chaosMultiplier);
  }

  playAtMaxVolume(sound: SoundName) {
    this.playAtVolume(sound, 1);
  }

  playAtVolume(sound: SoundName, volume: number) {
    const config = SOUND_CONFIGS[sound];
    if (!config) {
      console.warn('[Sound] No config for:', sound);
      return;
    }

    const masterVolume = clampAudioVolume(volume);
    const effectiveVolume = this.getEffectiveVolume(config, masterVolume, 1);
    if (!isAudibleVolume(effectiveVolume)) return;

    this.audioContext.resume();
    this.playSoundByType(config, masterVolume, 1);
  }

  playCustomAudio(dataUrl: string, forcePlay = false) {
    if (!dataUrl.startsWith('data:audio/')) {
      console.warn('[Sound] Invalid custom audio data URL');
      return;
    }
    if (!forcePlay && !this.settings.isSoundEnabled()) return;

    const volume = this.settings.getVolume();
    if (!isAudibleVolume(volume)) return;

    this.audioContext.resume();
    this.filePlayer.play(dataUrl, volume);
  }

  playCustomAudioAtVolume(dataUrl: string, volume: number) {
    if (!dataUrl.startsWith('data:audio/')) {
      console.warn('[Sound] Invalid custom audio data URL');
      return;
    }

    const playbackVolume = clampAudioVolume(volume);
    if (!isAudibleVolume(playbackVolume)) return;

    this.audioContext.resume();
    this.filePlayer.play(dataUrl, playbackVolume);
  }

  private getChaosMultiplier(sound: SoundName): number {
    const isChaos = this.settings.isChaosMode() && CHAOS_SOUNDS.has(sound);
    return isChaos ? CHAOS_VOLUME_MULTIPLIER : 1.0;
  }

  private getEffectiveVolume(config: SoundConfig, masterVolume: number, chaosMultiplier: number): number {
    if (config.audioFile) {
      return (config.audioVolume ?? 1.0) * masterVolume * chaosMultiplier;
    }
    return (config.volume ?? 0.3) * masterVolume;
  }

  private playSoundByType(config: SoundConfig, masterVolume: number, chaosMultiplier: number) {
    if (config.audioFile) {
      this.filePlayer.play(config.audioFile, (config.audioVolume ?? 1.0) * masterVolume * chaosMultiplier);
      return;
    }
    if (config.noiseType) {
      this.synthesizer.playNoise(
        {
          noiseType: config.noiseType,
          duration: config.duration ?? 0.1,
          volume: config.volume ?? 0.3,
          envelope: config.envelope,
          filter: config.filter,
        },
        masterVolume
      );
      return;
    }
    if (config.notes) {
      this.synthesizer.playNotes(
        {
          notes: config.notes,
          duration: config.duration ?? 0.1,
          type: config.type || 'sine',
          volume: config.volume ?? 0.3,
        },
        masterVolume
      );
      return;
    }
    if (config.frequency) {
      this.synthesizer.playTone(
        {
          frequency: config.frequency,
          duration: config.duration ?? 0.1,
          type: config.type || 'sine',
          volume: config.volume ?? 0.3,
        },
        masterVolume
      );
    }
  }

  // Settings getters/setters (delegate to settings service)
  getSettings(): SoundSettings {
    return this.settings.getSettings();
  }

  setSoundEnabled(enabled: boolean) {
    this.settings.setSoundEnabled(enabled);
  }

  setSoundVolume(volume: number) {
    this.settings.setSoundVolume(volume);
  }

  setChaosMode(enabled: boolean) {
    this.settings.setChaosMode(enabled);
  }

  isChaosMode(): boolean {
    return this.settings.isChaosMode();
  }

  onSettingsChange(callback: (settings: SoundSettings) => void): () => void {
    return this.settings.onSettingsChange(callback);
  }

  // Resume audio context (required after user interaction on some browsers)
  resume() {
    this.audioContext.resume();
  }
}

// Singleton instance
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null;

export function isSoundName(sound: unknown): sound is SoundName {
  return typeof sound === 'string' && Object.prototype.hasOwnProperty.call(SOUND_CONFIGS, sound);
}

export function isCardLandingSoundName(sound: unknown): sound is SpecialCardSoundName {
  if (typeof sound !== 'string') return false;
  return (
    WIZARD_SOUNDS.includes(sound as WizardSoundName) ||
    JESTER_SOUNDS.includes(sound as JesterSoundName)
  );
}

export function isTrickWinSoundName(sound: unknown): sound is TrickWinSoundName {
  return typeof sound === 'string' && TRICK_WIN_SOUNDS.includes(sound as TrickWinSoundName);
}

const soundFacade = {
  play: (sound: SoundName, forcePlay = false) => soundManager?.play(sound, forcePlay),
  playAtMaxVolume: (sound: SoundName) => soundManager?.playAtMaxVolume(sound),
  playAtVolume: (sound: SoundName, volume: number) => soundManager?.playAtVolume(sound, volume),
  playCustomAudio: (dataUrl: string, forcePlay = false) => soundManager?.playCustomAudio(dataUrl, forcePlay),
  playCustomAudioAtVolume: (dataUrl: string, volume: number) => soundManager?.playCustomAudioAtVolume(dataUrl, volume),
  getSettings: () => soundManager?.getSettings() || DEFAULT_SETTINGS,
  setSoundEnabled: (enabled: boolean) => soundManager?.setSoundEnabled(enabled),
  setSoundVolume: (volume: number) => soundManager?.setSoundVolume(volume),
  setChaosMode: (enabled: boolean) => soundManager?.setChaosMode(enabled),
  resume: () => soundManager?.resume(),
};

// Hook for React components
export function useSound() {
  return soundFacade;
}
