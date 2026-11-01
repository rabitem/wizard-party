'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { InviteToTournamentResult, TournamentDetailView } from '@shared/application/use-cases/tournament';

import { saveMatchTicket, tournamentApi, tournamentErrorMessage } from '@/lib/tournament';
import { TOURNAMENT_ROUTES } from '@/presentation/config/tournament.config';
import { useJoinRoom } from '@/presentation/hooks/social/useJoinRoom';

export type TournamentActionKey = 'register' | 'withdraw' | 'start' | 'cancel' | 'resolve' | 'join' | 'invite';

export interface TournamentActions {
  /** The action waiting for the server (one at a time). */
  pending: TournamentActionKey | null;
  /** The matchId being resolved while pending is 'resolve'. */
  resolving: string | null;
  error: string | null;
  clearError: () => void;
  register: () => Promise<boolean>;
  withdraw: () => Promise<boolean>;
  start: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  resolve: (matchId: string) => Promise<boolean>;
  /**
   * Fetches a ticket for the viewer's pending table, hands it to the game connection and opens the
   * table. While another game is running it first asks (`confirmingLeave`); `confirmed` goes on.
   */
  joinTable: (confirmed?: boolean) => Promise<boolean>;
  /** A join waits for the player to confirm leaving the game they are playing elsewhere. */
  confirmingLeave: boolean;
  cancelJoin: () => void;
  invite: (userIds: string[]) => Promise<InviteToTournamentResult | null>;
}

interface Options {
  /** Invite code from the share link (needed to register for a private tournament). */
  inviteCode: string | null;
  /** Shows the view a mutation answered with. */
  apply: (detail: TournamentDetailView) => void;
  /** Re-reads the tournament after a failure, so the page shows why (it may have moved on). */
  refresh: () => Promise<void>;
  /** Room of the viewer's pending table, when known: being there already is no reason to ask. */
  tableRoom: string | null;
}

const STORAGE_BLOCKED = 'Your browser blocked session storage, which the table needs to let you in. Allow site data and try again.';

/** Every viewer command of a tournament page, with one shared pending / error state. */
export function useTournamentActions(tournamentId: string, { inviteCode, apply, refresh, tableRoom }: Options): TournamentActions {
  const router = useRouter();
  // The game connection is bound to one room: another room is left before the table opens, or the
  // lobby page would send the player back home. A running game there is only left on confirmation.
  const { currentRoom, leaveRoom, needsConfirmation } = useJoinRoom();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [pending, setPending] = useState<TournamentActionKey | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A ref as well as state: two quick taps in the same frame must not send two requests.
  const busy = useRef(false);

  const run = useCallback(
    async <T>(key: TournamentActionKey, action: () => Promise<T>, onSuccess: (value: T) => void): Promise<T | null> => {
      if (busy.current) return null;
      busy.current = true;
      setPending(key);
      setError(null);
      try {
        const value = await action();
        onSuccess(value);
        return value;
      } catch (failure) {
        setError(tournamentErrorMessage(failure));
        void refresh();
        return null;
      } finally {
        busy.current = false;
        setPending(null);
        setResolving(null);
      }
    },
    [refresh]
  );

  const mutate = useCallback(
    async (key: TournamentActionKey, action: () => Promise<TournamentDetailView>) => (await run(key, action, apply)) !== null,
    [run, apply]
  );

  const joinTable = useCallback(async (confirmed = false) => {
    if (!confirmed && needsConfirmation && currentRoom !== tableRoom) {
      setConfirmingLeave(true);
      return false;
    }
    setConfirmingLeave(false);
    const opened = await run(
      'join',
      async () => {
        const ticket = await tournamentApi.ticket(tournamentId);
        if (!saveMatchTicket(ticket.roomCode, { ticket: ticket.ticket, tournamentId, expiresAt: ticket.expiresAt })) {
          throw new Error(STORAGE_BLOCKED);
        }
        return ticket;
      },
      () => undefined
    );
    if (opened === null) return false;
    if (currentRoom !== null && currentRoom !== opened.roomCode) await leaveRoom();
    router.push(TOURNAMENT_ROUTES.table(opened.roomCode));
    return true;
  }, [run, router, tournamentId, currentRoom, leaveRoom, needsConfirmation, tableRoom]);

  return {
    pending,
    resolving,
    error,
    clearError: useCallback(() => setError(null), []),
    register: useCallback(() => mutate('register', () => tournamentApi.register(tournamentId, inviteCode)), [mutate, tournamentId, inviteCode]),
    withdraw: useCallback(() => mutate('withdraw', () => tournamentApi.withdraw(tournamentId)), [mutate, tournamentId]),
    start: useCallback(() => mutate('start', () => tournamentApi.start(tournamentId)), [mutate, tournamentId]),
    cancel: useCallback(() => mutate('cancel', () => tournamentApi.cancel(tournamentId)), [mutate, tournamentId]),
    resolve: useCallback(
      (matchId: string) => {
        setResolving(matchId);
        return mutate('resolve', () => tournamentApi.resolveMatch(tournamentId, matchId));
      },
      [mutate, tournamentId]
    ),
    joinTable,
    confirmingLeave,
    cancelJoin: useCallback(() => setConfirmingLeave(false), []),
    invite: useCallback((userIds: string[]) => run('invite', () => tournamentApi.invite(tournamentId, userIds), () => undefined), [run, tournamentId]),
  };
}
