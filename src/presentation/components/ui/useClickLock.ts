'use client';

import { useCallback, useRef } from 'react';

/**
 * Hook to prevent rapid clicks (race conditions)
 */
export function useClickLock(lockDurationMs = 500) {
  const lockedUntil = useRef(0);

  const tryClick = useCallback((callback: () => void) => {
    const now = Date.now();
    if (now < lockedUntil.current) return;
    lockedUntil.current = now + lockDurationMs;
    callback();
  }, [lockDurationMs]);

  return tryClick;
}
