import { AUDIO_ENGINE_CONFIG } from './audio-engine.config';
import { warnAudioOnce } from './audio-log';

/** The part of AudioContextService the player needs. */
export interface AudioContextProvider {
  /** The context, or null where Web Audio is unavailable. */
  tryGetContext(): AudioContext | null;
  /** False while audio is locked (before the first tap, iOS interruption). */
  canPlayNow(context: AudioContext): boolean;
}

/** The part of HTMLAudioElement the fallback path uses. */
export interface FallbackAudioElement {
  volume: number;
  onerror: OnErrorEventHandler;
  play(): Promise<void>;
}

export interface AudioFilePlayerDependencies {
  /** Reads a sound file (same-origin path or data: URL) as bytes for decoding. */
  loadBytes(url: string): Promise<ArrayBuffer>;
  createElement(url: string): FallbackAudioElement;
  now(): number;
  maxDecodedBytes: number;
  maxFirstPlayDelayMs: number;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.arrayBuffer();
}

const BROWSER_DEPENDENCIES: AudioFilePlayerDependencies = {
  loadBytes: fetchBytes,
  createElement: (url) => new Audio(url),
  now: () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
  maxDecodedBytes: AUDIO_ENGINE_CONFIG.MAX_DECODED_BYTES,
  maxFirstPlayDelayMs: AUDIO_ENGINE_CONFIG.MAX_FIRST_PLAY_DELAY_MS,
};

const FLOAT32_BYTES = 4;

/** decodeAudioData with both the callback form (Safari before 14.1) and the promise form. */
function decodeAudio(context: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const decoding = context.decodeAudioData(bytes, resolve, reject) as Promise<AudioBuffer> | undefined;
    decoding?.then(resolve, reject);
  });
}

function decodedSize(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * FLOAT32_BYTES;
}

/** A readable label for logs: data URLs are megabytes long. */
function describe(url: string): string {
  return url.startsWith('data:') ? `${url.slice(0, url.indexOf(';') + 1 || 24)}…` : url;
}

/**
 * Plays audio files (the bundled sounds, custom uploads) through Web Audio.
 *
 * Each file is fetched and decoded once into an AudioBuffer (LRU-capped by decoded size) and
 * played through its own GainNode. That makes the volume settings work on iOS, where
 * HTMLMediaElement.volume is read-only, gives chaos mode its >1 gain without a
 * MediaElementSource per play, and avoids creating a media element for every sound.
 *
 * Where Web Audio is unavailable or a file cannot be decoded, it falls back to an HTMLAudioElement.
 * A first play whose decode finishes too late is dropped: the moment it belonged to has passed.
 */
export class AudioFilePlayer {
  private readonly decoded = new Map<string, AudioBuffer>();
  private decodedBytes = 0;
  private readonly decoding = new Map<string, Promise<AudioBuffer | null>>();
  private readonly undecodable = new Set<string>();

  constructor(
    private readonly audio: AudioContextProvider,
    private readonly deps: AudioFilePlayerDependencies = BROWSER_DEPENDENCIES
  ) {}

  play(url: string, volume: number): void {
    const gain = Math.max(0, volume);
    const context = this.undecodable.has(url) ? null : this.audio.tryGetContext();
    if (!context) {
      this.playWithElement(url, gain);
      return;
    }
    // Locked audio: drop the sound rather than let it burst out with the others on the first tap.
    if (!this.audio.canPlayNow(context)) return;

    const cached = this.decoded.get(url);
    if (cached) {
      this.markRecentlyUsed(url, cached);
      this.playBuffer(context, cached, gain);
      return;
    }

    const requestedAt = this.deps.now();
    void this.decode(context, url).then((buffer) => {
      if (this.deps.now() - requestedAt > this.deps.maxFirstPlayDelayMs) return;
      if (buffer) this.playBuffer(context, buffer, gain);
      else this.playWithElement(url, gain);
    });
  }

  /** Bytes of decoded audio currently cached (for tests and diagnostics). */
  get cachedBytes(): number {
    return this.decodedBytes;
  }

  private decode(context: AudioContext, url: string): Promise<AudioBuffer | null> {
    const pending = this.decoding.get(url);
    if (pending) return pending;
    const decoding = this.deps.loadBytes(url)
      .then((bytes) => decodeAudio(context, bytes))
      .then(
        (buffer) => {
          this.remember(url, buffer);
          return buffer;
        },
        (error: unknown) => {
          this.undecodable.add(url);
          warnAudioOnce(`decode:${describe(url)}`, `Could not decode ${describe(url)}; using a media element`, error);
          return null;
        }
      )
      .finally(() => {
        this.decoding.delete(url);
      });
    this.decoding.set(url, decoding);
    return decoding;
  }

  private remember(url: string, buffer: AudioBuffer): void {
    this.decoded.set(url, buffer);
    this.decodedBytes += decodedSize(buffer);
    // Evict least recently used files, but always keep the one just decoded.
    for (const [oldUrl, oldBuffer] of this.decoded) {
      if (this.decodedBytes <= this.deps.maxDecodedBytes || oldUrl === url) break;
      this.decoded.delete(oldUrl);
      this.decodedBytes -= decodedSize(oldBuffer);
    }
  }

  private markRecentlyUsed(url: string, buffer: AudioBuffer): void {
    this.decoded.delete(url);
    this.decoded.set(url, buffer);
  }

  private playBuffer(context: AudioContext, buffer: AudioBuffer, gain: number): void {
    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gainNode = context.createGain();
      gainNode.gain.value = gain;
      source.connect(gainNode);
      gainNode.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      source.start();
    } catch (error) {
      warnAudioOnce('buffer-play', 'Could not play a decoded sound file', error);
    }
  }

  private playWithElement(url: string, gain: number): void {
    let element: FallbackAudioElement;
    try {
      element = this.deps.createElement(url);
    } catch (error) {
      warnAudioOnce('element-create', 'Audio elements are unavailable; sound files are disabled', error);
      return;
    }
    element.onerror = () => {
      warnAudioOnce(`element-error:${describe(url)}`, `Could not load ${describe(url)}`);
    };
    // Media elements cannot amplify; chaos-mode gain above 1 plays at full volume.
    element.volume = Math.min(1, gain);
    element.play().catch((error: unknown) => {
      // Autoplay policy outside a gesture: expected, not an error.
      warnAudioOnce('element-play', 'A sound file was blocked until the next tap or key press', error);
    });
  }
}
