import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioContextService } from './audio-context.service';

describe('AudioContextService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates and resumes the context when resume is called before first playback', () => {
    const instances: Array<{ state: AudioContextState; resume: ReturnType<typeof vi.fn> }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'suspended';
      resume = vi.fn(() => {
        this.state = 'running';
        return Promise.resolve();
      });

      close = vi.fn(() => Promise.resolve());

      constructor() {
        instances.push(this);
      }
    }

    vi.stubGlobal('window', { AudioContext: FakeAudioContext });

    const service = new AudioContextService();
    service.resume();

    expect(instances).toHaveLength(1);
    expect(instances[0].resume).toHaveBeenCalledOnce();
    expect(instances[0].state).toBe('running');
  });

  it('degrades to null without ever logging an error where Web Audio is unavailable', () => {
    vi.stubGlobal('window', {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error');
    const service = new AudioContextService();

    expect(service.isSupported()).toBe(false);
    expect(service.tryGetContext()).toBeNull();
    expect(service.tryGetPlayableContext()).toBeNull();
    expect(service.tryGetContext()).toBeNull();
    expect(() => service.resume()).not.toThrow();
    expect(service.getState()).toBeNull();

    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("resumes WebKit's interrupted state and reports state changes", () => {
    const handlers: { statechange?: () => void } = {};

    class FakeAudioContext {
      state: string = 'interrupted';
      resume = vi.fn(() => Promise.resolve());
      close = vi.fn(() => Promise.resolve());
      addEventListener = (type: string, listener: () => void) => {
        if (type === 'statechange') handlers.statechange = listener;
      };
    }

    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    const service = new AudioContextService();
    const states: string[] = [];
    service.onStateChange((state) => states.push(state));

    service.resume();
    const context = service.tryGetContext() as unknown as FakeAudioContext;
    expect(context.resume).toHaveBeenCalledOnce();

    context.state = 'running';
    handlers.statechange?.();
    expect(states).toEqual(['running']);
    expect(service.isRunning()).toBe(true);
  });

  it('resumeIfCreated never creates a context', () => {
    const constructed = vi.fn();
    class FakeAudioContext {
      constructor() {
        constructed();
      }
    }
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });

    new AudioContextService().resumeIfCreated();

    expect(constructed).not.toHaveBeenCalled();
  });

  describe('canPlayNow', () => {
    function contextIn(state: string): AudioContext {
      return { state } as unknown as AudioContext;
    }

    function stubActivation(isActive: boolean, hasBeenActive: boolean) {
      vi.stubGlobal('navigator', { userActivation: { isActive, hasBeenActive } });
    }

    it('plays on a running context', () => {
      stubActivation(false, false);
      expect(new AudioContextService().canPlayNow(contextIn('running'))).toBe(true);
    });

    it('drops sounds on a suspended context before any gesture, so they cannot burst out later', () => {
      stubActivation(false, false);
      expect(new AudioContextService().canPlayNow(contextIn('suspended'))).toBe(false);
    });

    it('plays inside a gesture, which is resuming the context', () => {
      stubActivation(true, true);
      expect(new AudioContextService().canPlayNow(contextIn('suspended'))).toBe(true);
      expect(new AudioContextService().canPlayNow(contextIn('interrupted'))).toBe(true);
    });

    it('plays on a suspended context after a gesture, but not during an interruption', () => {
      stubActivation(false, true);
      expect(new AudioContextService().canPlayNow(contextIn('suspended'))).toBe(true);
      expect(new AudioContextService().canPlayNow(contextIn('interrupted'))).toBe(false);
    });

    it('keeps scheduling where the UserActivation API is missing', () => {
      vi.stubGlobal('navigator', {});
      expect(new AudioContextService().canPlayNow(contextIn('suspended'))).toBe(true);
    });
  });
});
