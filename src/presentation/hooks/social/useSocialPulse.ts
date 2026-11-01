'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SocialPulse } from '@shared/application/use-cases/friends';
import { PRESENCE_TIMING, type PresenceActivity } from '@shared/domain/social';

import { AccountApiError } from '@/lib/account/account-api';
import { socialApi } from '@/lib/social/social-api';

/** Longest pause between heartbeats while the server keeps failing. */
const MAX_BACKOFF_MS = 5 * 60_000;

/**
 * The presence heartbeat of the signed-in account `userId` (null: off). Beats on mount, on every
 * activity or visibility change and on a timer (fast while visible, slow and "idle" while hidden),
 * backing off exponentially on errors. `seatProof` lets the server have the game worker attest the
 * room. A pulse is only ever reported for the account it was fetched for.
 */
export function useSocialPulse(userId: string | null, activity: PresenceActivity, seatProof: () => string) {
  const [state, setState] = useState<{ userId: string; pulse: SocialPulse } | null>(null);
  const activityRef = useRef(activity);
  const proofRef = useRef(seatProof);
  const beatRef = useRef<() => void>(() => undefined);
  const activityKey = JSON.stringify(activity);

  useEffect(() => {
    activityRef.current = activity;
    proofRef.current = seatProof;
  });

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let failures = 0;

    const schedule = (delayMs: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void beat(), delayMs);
    };

    async function beat() {
      clearTimeout(timer);
      const hidden = document.visibilityState === 'hidden';
      const current = activityRef.current;
      try {
        const next = await socialApi.pulse(current, hidden, current.kind === 'menu' ? undefined : proofRef.current());
        if (cancelled) return;
        setState({ userId: userId as string, pulse: next });
        failures = 0;
      } catch (error) {
        // Signed out elsewhere: stop until the session changes.
        if (error instanceof AccountApiError && error.status === 401) return;
        failures += 1;
      }
      if (cancelled) return;
      const base = hidden ? PRESENCE_TIMING.HIDDEN_HEARTBEAT_MS : PRESENCE_TIMING.VISIBLE_HEARTBEAT_MS;
      schedule(Math.min(base * 2 ** failures, MAX_BACKOFF_MS));
    }

    beatRef.current = () => void beat();
    void beat();
    const onVisibility = () => void beat();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      beatRef.current = () => undefined;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, activityKey]);

  const pulseNow = useCallback(() => beatRef.current(), []);
  // Another account (or signed out): never show the previous account's pulse.
  const pulse = state && state.userId === userId ? state.pulse : null;
  return { pulse, pulseNow };
}
