import { describe, expect, it } from 'vitest';
import type { AudioEngineState } from './audio-context.service';
import { installAudioUnlock, type AudioUnlockEnvironment, type UnlockableAudio } from './audio-unlock';

class FakeAudio implements UnlockableAudio {
  supported = true;
  running = false;
  resumeCalls = 0;
  resumeIfCreatedCalls = 0;
  private readonly listeners = new Set<(state: AudioEngineState) => void>();

  isSupported(): boolean {
    return this.supported;
  }

  resume(): void {
    this.resumeCalls += 1;
  }

  resumeIfCreated(): void {
    this.resumeIfCreatedCalls += 1;
  }

  isRunning(): boolean {
    return this.running;
  }

  onStateChange(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(state: AudioEngineState): void {
    this.running = state === 'running';
    this.listeners.forEach((listener) => listener(state));
  }
}

function createEnvironment(visible = true) {
  const state = { visible };
  const environment: AudioUnlockEnvironment = {
    gestureTarget: new EventTarget(),
    visibilityTarget: new EventTarget(),
    isVisible: () => state.visible,
  };
  return { environment, state };
}

function fire(target: AudioUnlockEnvironment['gestureTarget'], type: string): void {
  (target as EventTarget).dispatchEvent(new Event(type));
}

describe('installAudioUnlock', () => {
  it('resumes only on activation-triggering gestures', () => {
    const audio = new FakeAudio();
    const { environment } = createEnvironment();
    installAudioUnlock(audio, environment);

    fire(environment.gestureTarget, 'pointerdown');
    fire(environment.gestureTarget, 'touchstart');
    expect(audio.resumeCalls).toBe(0);

    fire(environment.gestureTarget, 'pointerup');
    fire(environment.gestureTarget, 'touchend');
    fire(environment.gestureTarget, 'click');
    fire(environment.gestureTarget, 'keydown');
    expect(audio.resumeCalls).toBe(4);
  });

  it('stays armed until the context runs, then stops listening', () => {
    const audio = new FakeAudio();
    const { environment } = createEnvironment();
    installAudioUnlock(audio, environment);

    fire(environment.gestureTarget, 'pointerup');
    fire(environment.gestureTarget, 'pointerup');
    expect(audio.resumeCalls).toBe(2);

    audio.emit('running');
    fire(environment.gestureTarget, 'pointerup');
    expect(audio.resumeCalls).toBe(2);
  });

  it('disarms immediately when the gesture resumed synchronously', () => {
    const audio = new FakeAudio();
    audio.resume = () => {
      audio.resumeCalls += 1;
      audio.running = true;
    };
    const { environment } = createEnvironment();
    installAudioUnlock(audio, environment);

    fire(environment.gestureTarget, 'click');
    fire(environment.gestureTarget, 'click');
    expect(audio.resumeCalls).toBe(1);
  });

  it.each(['suspended', 'interrupted'] as const)('re-arms when the context becomes %s', (state) => {
    const audio = new FakeAudio();
    const { environment } = createEnvironment();
    installAudioUnlock(audio, environment);
    audio.emit('running');

    audio.emit(state);
    fire(environment.gestureTarget, 'touchend');
    expect(audio.resumeCalls).toBe(1);
  });

  it('resumes an existing context when the tab becomes visible', () => {
    const audio = new FakeAudio();
    const { environment, state } = createEnvironment(false);
    installAudioUnlock(audio, environment);

    fire(environment.visibilityTarget, 'visibilitychange');
    expect(audio.resumeIfCreatedCalls).toBe(0);

    state.visible = true;
    fire(environment.visibilityTarget, 'visibilitychange');
    expect(audio.resumeIfCreatedCalls).toBe(1);
    expect(audio.resumeCalls).toBe(0);
  });

  it('does nothing where Web Audio is unsupported', () => {
    const audio = new FakeAudio();
    audio.supported = false;
    const { environment, state } = createEnvironment();
    installAudioUnlock(audio, environment);

    fire(environment.gestureTarget, 'click');
    state.visible = true;
    fire(environment.visibilityTarget, 'visibilitychange');
    expect(audio.resumeCalls).toBe(0);
    expect(audio.resumeIfCreatedCalls).toBe(0);
  });

  it('removes every listener when disposed', () => {
    const audio = new FakeAudio();
    const { environment } = createEnvironment();
    const dispose = installAudioUnlock(audio, environment);

    dispose();
    fire(environment.gestureTarget, 'click');
    fire(environment.visibilityTarget, 'visibilitychange');
    audio.emit('suspended');
    fire(environment.gestureTarget, 'click');
    expect(audio.resumeCalls).toBe(0);
    expect(audio.resumeIfCreatedCalls).toBe(0);
  });
});
