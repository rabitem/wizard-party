'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';
import type { TournamentStatus } from '@shared/domain/tournament';

import { isNotFound, isTournamentsUnavailable, tournamentApi, tournamentErrorMessage } from '@/lib/tournament';
import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';

export type TournamentLoadStatus = 'loading' | 'ready' | 'not_found' | 'unavailable' | 'error';

export interface TournamentState {
  detail: TournamentDetailView | null;
  status: TournamentLoadStatus;
  /** Last failed refresh while an older view is still shown (or the reason of status 'error'). */
  error: string | null;
  /** serverTime - Date.now() of the last read, so countdowns follow the server clock. */
  clockOffset: number;
  refresh: () => Promise<void>;
  /** Shows a fresher view returned by a mutation (and drops older polls still in flight). */
  apply: (detail: TournamentDetailView) => void;
}

/** Completed and cancelled tournaments never change again, so their pages stop polling. */
export function isSettledStatus(status: TournamentStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/** Answers that a poll can't change: an unknown tournament, or tournaments switched off. */
const FINAL_LOAD_STATUSES: ReadonlySet<TournamentLoadStatus> = new Set(['not_found', 'unavailable']);

export function shouldPoll(
  detail: Pick<TournamentDetailView, 'tournament'> | null,
  status: TournamentLoadStatus,
  visibility: DocumentVisibilityState
): boolean {
  if (visibility === 'hidden' || FINAL_LOAD_STATUSES.has(status)) return false;
  return detail === null || !isSettledStatus(detail.tournament.status);
}

interface Loaded {
  key: string;
  detail: TournamentDetailView | null;
  status: TournamentLoadStatus;
  error: string | null;
  clockOffset: number;
}

/**
 * The viewer-aware tournament page, kept live: polls every TOURNAMENT_UI.POLL_INTERVAL_MS while the
 * tab is visible (re-reads at once when it becomes visible again), like useRoomOccupancy. Each read
 * also applies the tournament's due transitions on the server, so watching a page moves it along.
 */
export function useTournament(tournamentId: string, inviteCode: string | null): TournamentState {
  const key = `${tournamentId}:${inviteCode ?? ''}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /** Bumped by apply(): reads started before a mutation answered must not overwrite its result. */
  const generation = useRef(0);
  const inFlight = useRef(false);
  const detailRef = useRef<TournamentDetailView | null>(null);
  const statusRef = useRef<TournamentLoadStatus>('loading');
  const current = loaded?.key === key ? loaded : null;
  const shownDetail = current?.detail ?? null;
  const shownStatus = current?.status ?? 'loading';
  useEffect(() => {
    detailRef.current = shownDetail;
    statusRef.current = shownStatus;
  }, [shownDetail, shownStatus]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const started = generation.current;
    try {
      const detail = await tournamentApi.get(tournamentId, inviteCode);
      if (generation.current !== started) return;
      setLoaded({ key, detail, status: 'ready', error: null, clockOffset: detail.serverTime - Date.now() });
    } catch (error) {
      if (generation.current !== started) return;
      setLoaded((previous) => {
        const kept = previous?.key === key ? previous : null;
        if (isNotFound(error)) return { key, detail: null, status: 'not_found', error: null, clockOffset: 0 };
        if (isTournamentsUnavailable(error)) return { key, detail: null, status: 'unavailable', error: null, clockOffset: 0 };
        // A failed poll keeps the last good view on screen and only notes the problem.
        if (kept?.detail) return { ...kept, error: tournamentErrorMessage(error) };
        return { key, detail: null, status: 'error', error: tournamentErrorMessage(error), clockOffset: 0 };
      });
    } finally {
      inFlight.current = false;
    }
  }, [tournamentId, inviteCode, key]);

  useEffect(() => {
    const poll = () => {
      if (shouldPoll(detailRef.current, statusRef.current, document.visibilityState)) void load();
    };
    void load();
    const timer = setInterval(poll, TOURNAMENT_UI.POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
      // Answers of this page's reads must not land after a switch to another tournament.
      generation.current += 1;
      inFlight.current = false;
    };
  }, [load]);

  const apply = useCallback(
    (detail: TournamentDetailView) => {
      generation.current += 1;
      setLoaded({ key, detail, status: 'ready', error: null, clockOffset: detail.serverTime - Date.now() });
    },
    [key]
  );

  return {
    detail: current?.detail ?? null,
    status: current?.status ?? 'loading',
    error: current?.error ?? null,
    clockOffset: current?.clockOffset ?? 0,
    refresh: load,
    apply,
  };
}
