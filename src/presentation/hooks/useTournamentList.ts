'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChampionView, TournamentSummaryView } from '@shared/application/use-cases/tournament';
import type { TournamentListStatus } from '@shared/application/ports/tournament';

import { isTournamentsUnavailable, tournamentApi, tournamentErrorMessage } from '@/lib/tournament';

export type TournamentListLoadStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface TournamentListState {
  items: TournamentSummaryView[];
  /** From the first page of any tab; kept while switching tabs. */
  recentChampions: ChampionView[];
  status: TournamentListLoadStatus;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

interface ListData {
  status: TournamentListStatus;
  items: TournamentSummaryView[];
  nextCursor: string | null;
  loadStatus: TournamentListLoadStatus;
  error: string | null;
}

/** Appends a page, skipping rows already shown (keyset pages can overlap when lists change). */
export function mergePage(current: readonly TournamentSummaryView[], page: readonly TournamentSummaryView[]): TournamentSummaryView[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !seen.has(item.id))];
}

/** One public list tab (open / live / finished), keyset paginated with "load more". */
export function useTournamentList(status: TournamentListStatus): TournamentListState {
  const [data, setData] = useState<ListData | null>(null);
  const [champions, setChampions] = useState<ChampionView[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloads, setReloads] = useState(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    tournamentApi.list({ status }, abort.signal).then(
      (page) => {
        setData({ status, items: page.items, nextCursor: page.nextCursor, loadStatus: 'ready', error: null });
        if (page.recentChampions) setChampions(page.recentChampions);
      },
      (error) => {
        if (abort.signal.aborted) return;
        setData({
          status,
          items: [],
          nextCursor: null,
          loadStatus: isTournamentsUnavailable(error) ? 'unavailable' : 'error',
          error: tournamentErrorMessage(error),
        });
      }
    );
    return () => abort.abort();
  }, [status, reloads]);

  const current = data?.status === status ? data : null;
  const cursor = current?.nextCursor ?? null;

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    const signal = controller.current?.signal;
    setLoadingMore(true);
    tournamentApi
      .list({ status, cursor }, signal)
      .then(
        (page) => {
          if (signal?.aborted) return;
          setData((previous) =>
            previous && previous.status === status
              ? { ...previous, items: mergePage(previous.items, page.items), nextCursor: page.nextCursor, error: null }
              : previous
          );
        },
        (error) => {
          if (signal?.aborted) return;
          setData((previous) => (previous && previous.status === status ? { ...previous, error: tournamentErrorMessage(error) } : previous));
        }
      )
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, status]);

  const reload = useCallback(() => {
    setData(null);
    setReloads((count) => count + 1);
  }, []);

  return {
    items: current?.items ?? [],
    recentChampions: champions,
    status: current?.loadStatus ?? 'loading',
    error: current?.error ?? null,
    hasMore: cursor !== null,
    loadingMore,
    loadMore,
    reload,
  };
}
