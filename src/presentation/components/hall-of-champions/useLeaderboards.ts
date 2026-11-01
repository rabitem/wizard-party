'use client';

import { useEffect, useState } from 'react';

import type { Leaderboards } from '@shared/domain/account/leaderboard';

export type LeaderboardsState =
  | { status: 'loading' }
  | { status: 'ready'; boards: Leaderboards }
  | { status: 'error' };

/** Public boards from /api/leaderboard; one request serves every category tab. */
export function useLeaderboards(): LeaderboardsState {
  const [state, setState] = useState<LeaderboardsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/leaderboard', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((body: { boards: Leaderboards }) => setState({ status: 'ready', boards: body.boards }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('[leaderboard] unavailable', error);
          setState({ status: 'error' });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}
