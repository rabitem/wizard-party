import { describe, expect, it } from 'vitest';
import {
  cancelDeferredUnmountCompletion,
  scheduleDeferredUnmountCompletion,
  type DeferredUnmountHandle,
} from './deferred-unmount-completion';

function createRefs(onComplete: () => void) {
  return {
    completedRef: { current: false },
    onCompleteRef: { current: onComplete },
    timeoutRef: { current: null as DeferredUnmountHandle | null },
  };
}

/** Lets the queued completion microtask run */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

describe('deferred unmount completion', () => {
  it('does not complete during React strict-effects cleanup when the effect reattaches before the next tick', async () => {
    let completions = 0;
    const refs = createRefs(() => {
      completions += 1;
    });

    scheduleDeferredUnmountCompletion(refs);
    expect(completions).toBe(0);
    expect(refs.completedRef.current).toBe(false);

    cancelDeferredUnmountCompletion(refs.timeoutRef);
    await flushMicrotasks();

    expect(completions).toBe(0);
    expect(refs.completedRef.current).toBe(false);
  });

  it('completes once when the component stays unmounted through the deferred tick', async () => {
    let completions = 0;
    const refs = createRefs(() => {
      completions += 1;
    });

    scheduleDeferredUnmountCompletion(refs);
    await flushMicrotasks();
    await flushMicrotasks();

    expect(completions).toBe(1);
    expect(refs.completedRef.current).toBe(true);
  });

  it('does not complete if the animation already completed before the deferred unmount fires', async () => {
    let completions = 0;
    const refs = createRefs(() => {
      completions += 1;
    });

    scheduleDeferredUnmountCompletion(refs);
    refs.completedRef.current = true;
    await flushMicrotasks();

    expect(completions).toBe(0);
  });
});
