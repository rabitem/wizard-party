import { useEffect, useState } from 'react';
import type { PublicPlayerCard } from '@shared/domain/social';
import { CONSTANTS } from '@/presentation/config/constants';
import { PROFILE_SEARCH } from '@/presentation/config/realm-hall.config';

export type ProfileSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; players: PublicPlayerCard[] }
  | { status: 'rate-limited' }
  | { status: 'error' };

const IDLE: ProfileSearchState = { status: 'idle' };

/**
 * Public profiles matching `query`, asked for once the typing pauses. A newer query cancels the
 * request of the one before, so results never arrive out of order.
 */
export function useProfileSearch(query: string): ProfileSearchState {
  const [state, setState] = useState<ProfileSearchState>(IDLE);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < PROFILE_SEARCH.MIN_LENGTH) {
      queueMicrotask(() => setState(IDLE));
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => setState({ status: 'loading' }));
    const timer = setTimeout(() => {
      fetch(`${CONSTANTS.API.PROFILE_SEARCH}?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (response) => {
          if (response.status === 429) return setState({ status: 'rate-limited' });
          if (!response.ok) return setState({ status: 'error' });
          const body = (await response.json()) as { players: PublicPlayerCard[] };
          setState({ status: 'ready', players: body.players });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: 'error' });
        });
    }, PROFILE_SEARCH.DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  return state;
}
