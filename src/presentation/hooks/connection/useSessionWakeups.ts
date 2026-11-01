'use client';

import { useEffect } from 'react';

import { CONNECTION_LIVENESS } from '@/presentation/config/connection.config';

/** The browser events a game session reacts to. */
export interface WakeableSession {
  /** Network back or page shown: retry a dropped line now, probe an open one. */
  wake(): void;
  /** Periodic check of a quiet line. */
  checkLiveness(): void;
  /** The page is going away. */
  unload(): void;
  /** The owning component mounted (again). */
  resume(): void;
  /** The owning component unmounted (also React's strict-mode rehearsal). */
  suspend(): void;
}

/**
 * Wires a session to the page: the moments a socket silently dies or the network returns (the page
 * comes back to the foreground, a back/forward cache restore, `online`), a periodic quiet-line
 * check while visible, and the page unloading.
 */
export function useSessionWakeups(session: WakeableSession): void {
  useEffect(() => {
    session.resume();
    const wakeIfVisible = () => {
      if (document.visibilityState === 'visible') session.wake();
    };
    const wake = () => session.wake();
    // pagehide (not beforeunload, which a page may cancel) also covers the back/forward cache.
    const unload = () => session.unload();
    const restore = () => {
      session.resume();
      wakeIfVisible();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') session.checkLiveness();
    }, CONNECTION_LIVENESS.CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', wakeIfVisible);
    window.addEventListener('pageshow', restore);
    window.addEventListener('online', wake);
    window.addEventListener('pagehide', unload);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', wakeIfVisible);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('online', wake);
      window.removeEventListener('pagehide', unload);
      session.suspend();
    };
  }, [session]);
}
