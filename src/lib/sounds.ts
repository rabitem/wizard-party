// Sound effects manager for the game
// Uses Web Audio API for low-latency playback with realistic card sounds

type SoundName =
  | 'cardPlay'
  | 'cardDeal'
  | 'cardShuffle'
  | 'cardSort'
  | 'cardSlide'
  | 'cardImpact'
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
  // Enhanced sound config
  noiseType?: 'white' | 'pink' | 'brown';
  envelope?: { attack: number; decay: number; sustain: number; release: number };
  filter?: { type: BiquadFilterType; frequency: number; Q?: number };
}

// Enhanced sound configurations with more realistic card sounds
const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  // Card sounds use noise + filtered tones for paper/cardboard feel
  cardPlay: {
    noiseType: 'white',
    duration: 0.12,
    volume: 0.25,
    filter: { type: 'bandpass', frequency: 2000, Q: 1 },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.06 },
  },
  cardDeal: {
    noiseType: 'white',
    duration: 0.08,
    volume: 0.18,
    filter: { type: 'bandpass', frequency: 3000, Q: 0.8 },
    envelope: { attack: 0.002, decay: 0.03, sustain: 0.2, release: 0.04 },
  },
  cardSlide: {
    noiseType: 'pink',
    duration: 0.15,
    volume: 0.15,
    filter: { type: 'lowpass', frequency: 1500 },
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.4, release: 0.06 },
  },
  cardImpact: {
    noiseType: 'brown',
    duration: 0.1,
    volume: 0.3,
    filter: { type: 'lowpass', frequency: 800 },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.04 },
  },
  cardShuffle: {
    noiseType: 'white',
    duration: 0.4,
    volume: 0.2,
    filter: { type: 'bandpass', frequency: 2500, Q: 0.5 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
  },
  cardSort: {
    notes: [400, 500, 600, 700],
    duration: 0.08,
    type: 'triangle',
    volume: 0.2,
  },
  // Musical sounds for game events
  trickWin: { notes: [523, 659, 784], duration: 0.15, type: 'sine', volume: 0.35 },
  roundEnd: { notes: [392, 494, 587, 784], duration: 0.2, type: 'sine', volume: 0.35 },
  gameWin: { notes: [523, 659, 784, 1047], duration: 0.25, type: 'sine', volume: 0.45 },
  gameLose: { notes: [392, 349, 330, 294], duration: 0.3, type: 'sine', volume: 0.35 },
  yourTurn: { notes: [659, 784], duration: 0.1, type: 'sine', volume: 0.4 },
  bidPlace: { frequency: 600, duration: 0.08, type: 'triangle', volume: 0.25 },
  playerJoin: { notes: [523, 659], duration: 0.1, type: 'sine', volume: 0.25 },
  playerLeave: { notes: [659, 523], duration: 0.1, type: 'sine', volume: 0.25 },
  buttonClick: { frequency: 1200, duration: 0.025, type: 'sine', volume: 0.12 },
  emote: { frequency: 880, duration: 0.08, type: 'sine', volume: 0.2 },
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

  // Create noise buffer for realistic card sounds
  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', duration: number): AudioBuffer {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      // Pink noise using Paul Kellet's refined method
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else { // brown
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }

    return buffer;
  }

  // Play noise-based sound (for realistic card sounds)
  private playNoise(config: SoundConfig) {
    if (!this.settings.enabled || !config.noiseType) return;

    try {
      const ctx = this.getContext();
      const duration = config.duration || 0.1;
      const envelope = config.envelope || { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05 };

      // Create noise source
      const noiseBuffer = this.createNoiseBuffer(config.noiseType, duration);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Create filter if specified
      let lastNode: AudioNode = noiseSource;
      if (config.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = config.filter.type;
        filter.frequency.value = config.filter.frequency;
        if (config.filter.Q) filter.Q.value = config.filter.Q;
        noiseSource.connect(filter);
        lastNode = filter;
      }

      // Create gain for envelope
      const gainNode = ctx.createGain();
      const finalVolume = (config.volume || 0.3) * this.settings.volume;
      const now = ctx.currentTime;

      // ADSR envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(finalVolume, now + envelope.attack);
      gainNode.gain.linearRampToValueAtTime(finalVolume * envelope.sustain, now + envelope.attack + envelope.decay);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      lastNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch (e) {
      console.error('Failed to play noise sound:', e);
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

    // Use noise-based sounds for card effects (more realistic)
    if (config.noiseType) {
      this.playNoise(config);
    } else if (config.notes) {
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
