import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scheduleAfterInput } from './interaction-scheduler';

describe('scheduleAfterInput', () => {
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let originalWindow: PropertyDescriptor | undefined;

  beforeEach(() => {
    frameCallbacks = new Map();
    nextFrameId = 1;
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

    const testWindow = {
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.set(frameId, callback);
      return frameId;
      }),
      cancelAnimationFrame: vi.fn((frameId: number) => {
        frameCallbacks.delete(frameId);
      }),
    } as unknown as Window & typeof globalThis;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: testWindow,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  function flushAnimationFrame(): void {
    const callbacks = [...frameCallbacks.values()];
    frameCallbacks.clear();
    callbacks.forEach((callback) => callback(performance.now()));
  }

  it('does not run non-critical work in the current input task', () => {
    const callback = vi.fn();

    scheduleAfterInput(callback);

    expect(callback).not.toHaveBeenCalled();
    flushAnimationFrame();
    expect(callback).not.toHaveBeenCalled();
    flushAnimationFrame();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled work', () => {
    const callback = vi.fn();

    const cancel = scheduleAfterInput(callback);
    cancel();
    flushAnimationFrame();
    flushAnimationFrame();

    expect(callback).not.toHaveBeenCalled();
  });
});
