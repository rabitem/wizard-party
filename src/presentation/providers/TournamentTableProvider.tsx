'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import type { TournamentJoinRejection } from '../hooks/connection/tournament-join';

/**
 * The tournament side of the current table, kept out of the game context (which re-renders on
 * every move): the lobby, HUD and results screens read it to show the match banner, the waiting
 * roster and "Back to tournament", and the lobby to explain a refused seat.
 */
export interface TournamentTableContextValue {
  /** Set while the connected room is a tournament match (no host controls, no rematch). */
  match: TournamentMatchRoomState | null;
  /** The game worker refused a seat at a tournament table (no/invalid ticket, tournaments unavailable). */
  rejection: TournamentJoinRejection | null;
  /** Forgets the refusal, e.g. when the lobby page that explains it is left. */
  dismissRejection: () => void;
}

const NO_TOURNAMENT_TABLE: TournamentTableContextValue = { match: null, rejection: null, dismissRejection: () => {} };

const TournamentTableContext = createContext<TournamentTableContextValue>(NO_TOURNAMENT_TABLE);

/** Casual rooms (and screens outside a GameProvider) read no match and no refusal. */
export function useTournamentTable(): TournamentTableContextValue {
  return useContext(TournamentTableContext);
}

/** The tournament fields of the game connection (useGameConnection). */
export interface TournamentTableSource {
  tournamentMatch: TournamentMatchRoomState | null;
  tournamentRejection: TournamentJoinRejection | null;
  dismissTournamentRejection: () => void;
}

export function TournamentTableProvider({ connection, children }: { connection: TournamentTableSource; children: ReactNode }) {
  const { tournamentMatch: match, tournamentRejection: rejection, dismissTournamentRejection: dismissRejection } = connection;
  const value = useMemo(() => ({ match, rejection, dismissRejection }), [match, rejection, dismissRejection]);
  return <TournamentTableContext.Provider value={value}>{children}</TournamentTableContext.Provider>;
}
