/**
 * Sound Synthesizer Service
 * Single responsibility: Generate and play sounds using Web Audio API
 *
 * Every play is a silent no-op where Web Audio is unavailable (AudioContextService logs that once).
 * Failures are expected browser states, so they are warned once, never console.error'ed.
 */

import type { AudioContextService } from './audio-context.service';
import { warnAudioOnce } from './audio-log';
import { NoiseBufferCache, type NoiseType } from './noise-buffer-cache';

export interface SoundEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SoundFilter {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
}

export interface ToneConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

export interface NoiseConfig {
  noiseType: NoiseType;
  duration: number;
  volume: number;
  envelope?: SoundEnvelope;
  filter?: SoundFilter;
}

export interface NoteSequenceConfig {
  notes: number[];
  duration: number;
  type: OscillatorType;
  volume: number;
}

export interface EarrapeConfig {
  frequencies: number[];
  duration: number;
  volume: number;
  distortionAmount: number; // 0-1, higher = more distortion
}

const DISTORTION_CURVE_SAMPLES = 44100;
const EARRAPE_WAVE_TYPES: OscillatorType[] = ['square', 'sawtooth', 'square'];
const DEFAULT_NOISE_ENVELOPE: SoundEnvelope = { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05 };

export class SoundSynthesizerService {
  constructor(
    private readonly audioContext: AudioContextService,
    private readonly noiseBuffers: NoiseBufferCache = new NoiseBufferCache()
  ) {}

  /**
   * Play a single tone
   */
  playTone(config: ToneConfig, masterVolume: number): void {
    this.withContext('tone', (ctx) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;

      const finalVolume = config.volume * masterVolume;
      gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    });
  }

  /**
   * Play a sequence of notes
   */
  playNotes(config: NoteSequenceConfig, masterVolume: number): void {
    if (!this.audioContext.isSupported()) return;
    config.notes.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(
          {
            frequency: note,
            duration: config.duration,
            type: config.type,
            volume: config.volume,
          },
          masterVolume
        );
      }, index * (config.duration * 1000 * 0.8));
    });
  }

  /**
   * Play earrape sound - multiple distorted oscillators for maximum chaos
   */
  playEarrape(config: EarrapeConfig, masterVolume: number): void {
    this.withContext('earrape', (ctx) => {
      const now = ctx.currentTime;

      const distortion = ctx.createWaveShaper();
      distortion.curve = this.makeDistortionCurve(config.distortionAmount * 400);
      distortion.oversample = '4x';

      const masterGain = ctx.createGain();
      const finalVolume = config.volume * masterVolume;
      masterGain.gain.setValueAtTime(finalVolume, now);
      masterGain.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

      distortion.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Multiple overlapping, slightly detuned oscillators for that earrape chaos
      config.frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = EARRAPE_WAVE_TYPES[i % EARRAPE_WAVE_TYPES.length];
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((i - 1) * 15, now);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.6, now);

        osc.connect(oscGain);
        oscGain.connect(distortion);

        osc.start(now);
        osc.stop(now + config.duration);
      });

      // Some noise for extra crunch
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffers.get(ctx, 'white', config.duration);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseSource.connect(noiseGain);
      noiseGain.connect(distortion);
      noiseSource.start(now);
      noiseSource.stop(now + config.duration);
    });
  }

  /**
   * Play noise-based sound (for realistic card sounds)
   */
  playNoise(config: NoiseConfig, masterVolume: number): void {
    this.withContext('noise', (ctx) => {
      const envelope = config.envelope || DEFAULT_NOISE_ENVELOPE;

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffers.get(ctx, config.noiseType, config.duration);

      let lastNode: AudioNode = noiseSource;
      if (config.filter) {
        const filter = ctx.createBiquadFilter();
        filter.type = config.filter.type;
        filter.frequency.value = config.filter.frequency;
        if (config.filter.Q) filter.Q.value = config.filter.Q;
        noiseSource.connect(filter);
        lastNode = filter;
      }

      const gainNode = ctx.createGain();
      const finalVolume = config.volume * masterVolume;
      const now = ctx.currentTime;

      // ADSR envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(finalVolume, now + envelope.attack);
      gainNode.gain.linearRampToValueAtTime(
        finalVolume * envelope.sustain,
        now + envelope.attack + envelope.decay
      );
      gainNode.gain.linearRampToValueAtTime(0, now + config.duration);

      lastNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + config.duration);
    });
  }

  /** Runs `play` with the context; silent where Web Audio is unavailable or the graph fails. */
  private withContext(kind: string, play: (ctx: AudioContext) => void): void {
    const ctx = this.audioContext.tryGetPlayableContext();
    if (!ctx) return;
    try {
      play(ctx);
    } catch (error) {
      warnAudioOnce(`synth-${kind}`, `Could not play a synthesized ${kind} sound`, error);
    }
  }

  /**
   * Create distortion curve for waveshaper
   */
  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(DISTORTION_CURVE_SAMPLES);
    const deg = Math.PI / 180;
    for (let i = 0; i < DISTORTION_CURVE_SAMPLES; i++) {
      const x = (i * 2) / DISTORTION_CURVE_SAMPLES - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}
