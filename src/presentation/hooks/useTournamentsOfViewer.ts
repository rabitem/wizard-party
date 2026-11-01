'use client';

import { useEffect, useState } from 'react';

import type { MyTournamentsView } from '@shared/application/use-cases/tournament';

import { tournamentApi } from '@/lib/tournament';

/**
 * The signed-in viewer's tournaments (upcoming, live, past) and trophies; null for guests, while
 * loading, or when the call failed (the strip it feeds is optional, so failures stay quiet).
 */
export function useTournamentsOfViewer(userId: string | null): MyTournamentsView | null {
  const [loaded, setLoaded] = useState<{ userId: string; view: MyTournamentsView } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const abort = new AbortController();
    tournamentApi.mine(abort.signal).then(
      (view) => setLoaded({ userId, view }),
      (error) => {
        if (!abort.signal.aborted) console.warn('[tournaments] my tournaments unavailable', error);
      }
    );
    return () => abort.abort();
  }, [userId]);

  return userId && loaded?.userId === userId ? loaded.view : null;
}
