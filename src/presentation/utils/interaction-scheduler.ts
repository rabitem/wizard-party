'use client';

/**
 * Schedules non-critical work outside the current input task.
 * In browsers, the callback is pushed two animation frames out so urgent input
 * feedback can paint before heavier UI side effects run.
 */
export function scheduleAfterInput(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) callback();
    });
    return () => {
      cancelled = true;
    };
  }

  let secondFrameId: number | null = null;
  const frameId = window.requestAnimationFrame(() => {
    secondFrameId = window.requestAnimationFrame(callback);
  });

  return () => {
    window.cancelAnimationFrame(frameId);
    if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
  };
}
