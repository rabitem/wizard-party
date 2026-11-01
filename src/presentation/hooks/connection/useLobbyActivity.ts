'use client';

import type { LobbyActivityEntry } from '@/presentation/types';
import { useStoreSelector } from '@/presentation/state/external-store';

import type { LobbyFeedHandlers, TableFeeds, TableFeedsState } from './table-feeds';

export interface UseLobbyActivityReturn extends LobbyFeedHandlers {
  lobbyActivity: LobbyActivityEntry[];
}

const selectLobbyActivity = (state: TableFeedsState) => state.lobbyActivity;

/**
 * Lightweight lobby activity feed (joins, leaves, removals, host changes, rule/settings changes),
 * as React state (a view of the table feeds). Keeps the newest few entries only.
 */
export function useLobbyActivity(feeds: TableFeeds): UseLobbyActivityReturn {
  const lobbyActivity = useStoreSelector(feeds.store, selectLobbyActivity);
  return { lobbyActivity, ...feeds.lobby };
}
