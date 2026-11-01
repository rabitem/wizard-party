import { describe, expect, it } from 'vitest';
import { GRAPHICS_LIFECYCLE } from '@/presentation/config/render-quality.config';
import {
  graphicsLifecycleReducer as reduce,
  initialGraphicsLifecycle,
  rebuildDelayMs,
  type GraphicsLifecycleEvent,
  type GraphicsLifecycleState,
} from './graphics-lifecycle';

function run(state: GraphicsLifecycleState, ...events: GraphicsLifecycleEvent['type'][]): GraphicsLifecycleState {
  return events.reduce((current, type) => reduce(current, { type } as GraphicsLifecycleEvent), state);
}

const ready = initialGraphicsLifecycle(true);

describe('graphicsLifecycleReducer', () => {
  it('should report browsers without WebGL 2 as unavailable and never retry them', () => {
    const unavailable = initialGraphicsLifecycle(false);
    expect(unavailable.status).toBe('unavailable');
    expect(run(unavailable, 'render-error', 'manual-retry', 'rebuild')).toEqual(unavailable);
  });

  it('should keep the same canvas when the browser restores a lost context', () => {
    const restored = run(ready, 'context-lost', 'context-restored');
    expect(restored).toEqual(ready);
  });

  it('should rebuild the canvas only when no restore arrives in time', () => {
    const waiting = run(ready, 'context-lost', 'restore-timeout');
    expect(waiting.status).toBe('rebuilding');
    const rebuilt = run(waiting, 'rebuild');
    expect(rebuilt).toEqual({ status: 'ready', canvasKey: 1, attempts: 1 });
  });

  it('should give up after the configured number of rebuilds without a rendered frame', () => {
    let state = ready;
    for (let i = 0; i < GRAPHICS_LIFECYCLE.MAX_REBUILD_ATTEMPTS; i++) state = run(state, 'render-error', 'rebuild');
    expect(state.attempts).toBe(GRAPHICS_LIFECYCLE.MAX_REBUILD_ATTEMPTS);
    expect(run(state, 'render-error').status).toBe('failed');
  });

  it('should reset the attempt count once a rebuilt canvas renders a frame', () => {
    const state = run(ready, 'render-error', 'rebuild', 'render-error', 'rebuild', 'frame-rendered');
    expect(state.attempts).toBe(0);
    expect(state.canvasKey).toBe(2);
  });

  it('should let the player retry by hand after giving up', () => {
    let state = ready;
    for (let i = 0; i <= GRAPHICS_LIFECYCLE.MAX_REBUILD_ATTEMPTS; i++) state = run(state, 'render-error', 'rebuild');
    expect(state.status).toBe('failed');
    const retried = run(state, 'manual-retry');
    expect(retried.status).toBe('ready');
    expect(retried.attempts).toBe(0);
    expect(retried.canvasKey).toBe(state.canvasKey + 1);
  });

  it('should ignore restores and timeouts that do not belong to a lost context', () => {
    expect(run(ready, 'context-restored', 'restore-timeout', 'rebuild')).toEqual(ready);
  });
});

describe('rebuildDelayMs', () => {
  it('should back off exponentially up to the cap', () => {
    expect(rebuildDelayMs(0)).toBe(GRAPHICS_LIFECYCLE.REBUILD_BASE_DELAY_MS);
    expect(rebuildDelayMs(1)).toBe(GRAPHICS_LIFECYCLE.REBUILD_BASE_DELAY_MS * GRAPHICS_LIFECYCLE.REBUILD_BACKOFF_FACTOR);
    expect(rebuildDelayMs(50)).toBe(GRAPHICS_LIFECYCLE.REBUILD_MAX_DELAY_MS);
  });
});
