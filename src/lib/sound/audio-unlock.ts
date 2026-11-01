import { AUDIO_ENGINE_CONFIG } from './audio-engine.config';
import type { AudioEngineState } from './audio-context.service';

/** The part of AudioContextService the unlock needs (a fake implements it in tests). */
export interface UnlockableAudio {
  isSupported(): boolean;
  /** Creates the context if needed and resumes it; only succeeds inside a user gesture on iOS. */
  resume(): void;
  /** Resumes an existing context without creating one. */
  resumeIfCreated(): void;
  isRunning(): boolean;
  onStateChange(listener: (state: AudioEngineState) => void): () => void;
}

/** window and document in the browser; minimal fakes in tests. */
export interface AudioUnlockEnvironment {
  gestureTarget: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  visibilityTarget: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  isVisible(): boolean;
}

const GESTURE_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

/**
 * Keeps Web Audio playable for the whole visit:
 * - Listens for activation-triggering gestures (pointerup, touchend, click, keydown; not
 *   pointerdown/touchstart, which do not count on touch devices) and stays armed until the context
 *   actually runs, instead of giving up after the first event.
 * - Re-arms whenever the context drops back to 'suspended' or WebKit's 'interrupted' (phone call,
 *   Siri, another app, iOS backgrounding), so the next tap brings sound back.
 * - Resumes an existing context when the tab becomes visible again.
 *
 * Returns a function that removes every listener. A no-op where Web Audio is missing.
 */
export function installAudioUnlock(audio: UnlockableAudio, environment: AudioUnlockEnvironment): () => void {
  if (!audio.isSupported()) return () => {};

  let armed = false;

  const onGesture = () => {
    audio.resume();
    if (audio.isRunning()) disarm();
  };

  function arm(): void {
    if (armed) return;
    armed = true;
    for (const event of AUDIO_ENGINE_CONFIG.UNLOCK_EVENTS) {
      environment.gestureTarget.addEventListener(event, onGesture, GESTURE_LISTENER_OPTIONS);
    }
  }

  function disarm(): void {
    if (!armed) return;
    armed = false;
    for (const event of AUDIO_ENGINE_CONFIG.UNLOCK_EVENTS) {
      environment.gestureTarget.removeEventListener(event, onGesture, GESTURE_LISTENER_OPTIONS);
    }
  }

  const unsubscribeState = audio.onStateChange((state) => {
    if (state === 'running') disarm();
    else if (state === 'suspended' || state === 'interrupted') arm();
  });

  const onVisibilityChange = () => {
    if (environment.isVisible()) audio.resumeIfCreated();
  };
  environment.visibilityTarget.addEventListener('visibilitychange', onVisibilityChange);

  arm();

  return () => {
    disarm();
    unsubscribeState();
    environment.visibilityTarget.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/** The browser environment, or null on the server. */
export function browserAudioUnlockEnvironment(): AudioUnlockEnvironment | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  return {
    gestureTarget: window,
    visibilityTarget: document,
    isVisible: () => document.visibilityState === 'visible',
  };
}
