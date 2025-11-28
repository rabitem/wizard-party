// Sound effects manager for the game
// Uses Web Audio API for low-latency playback

type SoundName =
  | 'cardPlay'
  | 'cardDeal'
  | 'cardShuffle'
  | 'cardSort'
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

interface SoundConfig {
  frequency?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  notes?: number[];
}

const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  cardPlay: { frequency: 800, duration: 0.08, type: 'sine', volume: 0.3 },
  cardDeal: { frequency: 600, duration: 0.05, type: 'sine', volume: 0.2 },
  cardShuffle: { notes: [300, 400, 350, 450, 380], duration: 0.08, type: 'triangle', volume: 0.25 },
  cardSort: { notes: [500, 600, 700, 800], duration: 0.1, type: 'sine', volume: 0.25 },
  trickWin: { notes: [523, 659, 784], duration: 0.15, type: 'sine', volume: 0.4 },
  roundEnd: { notes: [392, 494, 587, 784], duration: 0.2, type: 'sine', volume: 0.4 },
  gameWin: { notes: [523, 659, 784, 1047], duration: 0.25, type: 'sine', volume: 0.5 },
  gameLose: { notes: [392, 349, 330, 294], duration: 0.3, type: 'sine', volume: 0.4 },
  yourTurn: { notes: [659, 784], duration: 0.12, type: 'sine', volume: 0.5 },
  bidPlace: { frequency: 700, duration: 0.1, type: 'sine', volume: 0.3 },
  playerJoin: { notes: [523, 659], duration: 0.1, type: 'sine', volume: 0.3 },
  playerLeave: { notes: [659, 523], duration: 0.1, type: 'sine', volume: 0.3 },
  buttonClick: { frequency: 1000, duration: 0.03, type: 'sine', volume: 0.15 },
  emote: { frequency: 880, duration: 0.1, type: 'sine', volume: 0.25 },
};

const STORAGE_KEY = 'wizard-party-sound-settings';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
  musicEnabled: boolean;
  musicVolume: number; // 0-1
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  musicEnabled: true,
  musicVolume: 0.3,
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private musicOscillator: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private isPlayingMusic = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load sound settings:', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save sound settings:', e);
    }
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.settings.enabled) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const finalVolume = volume * this.settings.volume;
      gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }

  private playNotes(notes: number[], duration: number, type: OscillatorType, volume: number) {
    if (!this.settings.enabled) return;

    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note, duration, type, volume);
      }, index * (duration * 1000 * 0.8));
    });
  }

  play(sound: SoundName) {
    const config = SOUND_CONFIGS[sound];
    if (!config) return;

    if (config.notes) {
      this.playNotes(
        config.notes,
        config.duration || 0.1,
        config.type || 'sine',
        config.volume || 0.3
      );
    } else if (config.frequency) {
      this.playTone(
        config.frequency,
        config.duration || 0.1,
        config.type || 'sine',
        config.volume || 0.3
      );
    }
  }

  // Ambient music using procedural generation
  startMusic() {
    if (!this.settings.musicEnabled || this.isPlayingMusic) return;

    try {
      const ctx = this.getContext();
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.settings.musicVolume * 0.1;
      this.musicGain.connect(ctx.destination);

      this.isPlayingMusic = true;
      this.playAmbientChord();
    } catch (e) {
      console.error('Failed to start music:', e);
    }
  }

  private playAmbientChord() {
    if (!this.isPlayingMusic || !this.musicGain) return;

    const ctx = this.getContext();
    const chords = [
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00], // D minor
      [329.63, 392.00, 493.88], // E minor
      [349.23, 440.00, 523.25], // F major
    ];

    const chord = chords[Math.floor(Math.random() * chords.length)];

    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.settings.musicVolume * 0.05, ctx.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 4);
    });

    // Schedule next chord
    setTimeout(() => {
      if (this.isPlayingMusic) {
        this.playAmbientChord();
      }
    }, 3500 + Math.random() * 1000);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicOscillator) {
      this.musicOscillator.stop();
      this.musicOscillator = null;
    }
  }

  // Settings getters/setters
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  setSoundEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  setSoundVolume(volume: number) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  setMusicEnabled(enabled: boolean) {
    this.settings.musicEnabled = enabled;
    this.saveSettings();
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicVolume * 0.1;
    }
  }

  // Resume audio context (required after user interaction on some browsers)
  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Singleton instance
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null;

// Hook for React components
export function useSound() {
  return {
    play: (sound: SoundName) => soundManager?.play(sound),
    startMusic: () => soundManager?.startMusic(),
    stopMusic: () => soundManager?.stopMusic(),
    getSettings: () => soundManager?.getSettings() || DEFAULT_SETTINGS,
    setSoundEnabled: (enabled: boolean) => soundManager?.setSoundEnabled(enabled),
    setSoundVolume: (volume: number) => soundManager?.setSoundVolume(volume),
    setMusicEnabled: (enabled: boolean) => soundManager?.setMusicEnabled(enabled),
    setMusicVolume: (volume: number) => soundManager?.setMusicVolume(volume),
    resume: () => soundManager?.resume(),
  };
}
