/**
 * Audio Context Service
 * Single responsibility: Manage Web Audio API context lifecycle
 *
 * Capability-gated: where Web Audio is missing (some embedded browsers, Playwright WebKit on
 * Windows) or the context cannot be created, tryGetContext() returns null and every caller
 * degrades to silence; this is logged once as a warning, never as an error.
 */

import { warnAudioOnce } from './audio-log';

type AudioContextClass = typeof AudioContext;

/**
 * Context states, spelling out WebKit's 'interrupted' (phone call, Siri, another app taking the
 * audio session), which older DOM typings do not list.
 */
export type AudioEngineState = AudioContextState | 'interrupted';

interface UserActivationLike {
  isActive: boolean;
  hasBeenActive: boolean;
}

function userActivation(): UserActivationLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { userActivation?: UserActivationLike }).userActivation ?? null;
}

/**
 * Whether a not-yet-running context is about to start: inside a gesture it always is; after one
 * (sticky activation) a 'suspended' context resumes without a new tap. Browsers without the
 * UserActivation API keep the old behaviour and schedule anyway.
 */
function canStartWithoutBurst(state: AudioEngineState): boolean {
  const activation = userActivation();
  if (!activation) return true;
  if (activation.isActive) return true;
  return state === 'suspended' && activation.hasBeenActive;
}

export class AudioContextService {
  private audioContext: AudioContext | null = null;
  private readonly stateListeners = new Set<(state: AudioEngineState) => void>();

  private getAudioContextClass(): AudioContextClass | null {
    if (typeof window === 'undefined') return null;
    const audioWindow = window as unknown as {
      AudioContext?: AudioContextClass;
      webkitAudioContext?: AudioContextClass;
    };
    return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
  }

  isSupported(): boolean {
    return this.getAudioContextClass() !== null;
  }

  /** The context, created on first use (or again after it was closed); null where unusable. */
  tryGetContext(): AudioContext | null {
    if (this.audioContext && this.audioContext.state !== 'closed') return this.audioContext;
    this.audioContext = null;
    const AudioContextConstructor = this.getAudioContextClass();
    if (!AudioContextConstructor) {
      warnAudioOnce('unsupported', 'Web Audio API is not supported; synthesized sounds are disabled');
      return null;
    }
    try {
      const context = new AudioContextConstructor();
      if (typeof context.addEventListener === 'function') {
        context.addEventListener('statechange', () => this.notifyState(context));
      }
      this.audioContext = context;
      return context;
    } catch (error) {
      warnAudioOnce('create-failed', 'Could not create an AudioContext; sounds are disabled', error);
      return null;
    }
  }

  /**
   * The context when a sound scheduled now will be heard now; null otherwise. A suspended context
   * freezes its clock, so sounds scheduled before the first tap (or during an iOS interruption)
   * would all burst out together once audio unlocks. Those are dropped instead.
   */
  tryGetPlayableContext(): AudioContext | null {
    const context = this.tryGetContext();
    return context && this.canPlayNow(context) ? context : null;
  }

  /** True when a sound started on `context` now is heard now (see tryGetPlayableContext). */
  canPlayNow(context: AudioContext): boolean {
    const state: AudioEngineState = context.state;
    return state === 'running' || canStartWithoutBurst(state);
  }

  /**
   * Resume audio (required after user interaction on some browsers). Acts on 'suspended'
   * (autoplay policy, backgrounded tab) and WebKit's 'interrupted'. Creates the context, so call
   * it from a user gesture or right before playback.
   */
  resume(): void {
    const context = this.tryGetContext();
    if (context) this.resumeContext(context);
  }

  /** Resume only a context that already exists (e.g. when the tab becomes visible again). */
  resumeIfCreated(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') this.resumeContext(this.audioContext);
  }

  isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  /** Notified on every context state change. Returns an unsubscribe function. */
  onStateChange(listener: (state: AudioEngineState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get current context state
   */
  getState(): AudioEngineState | null {
    return this.audioContext?.state ?? null;
  }

  /**
   * Close and cleanup the audio context
   */
  async close(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  private resumeContext(context: AudioContext): void {
    const state: AudioEngineState = context.state;
    if (state === 'running' || state === 'closed') return;
    void context.resume().catch((error: unknown) => {
      // Expected outside a user gesture: the next gesture retries.
      warnAudioOnce('resume-failed', 'Audio is waiting for a tap or key press to start', error);
    });
  }

  private notifyState(context: AudioContext): void {
    if (context !== this.audioContext) return;
    const state: AudioEngineState = context.state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}
