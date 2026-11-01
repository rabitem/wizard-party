'use client';

import { useStoreSelector } from '@/presentation/state/external-store';

import type { TableFeeds, TableFeedsState } from './table-feeds';

const selectMatch = (state: TableFeedsState) => state.tournamentMatch;
const selectRejection = (state: TableFeedsState) => state.tournamentRejection;

/**
 * Tournament side of the game connection, as React state (a view of the table feeds): the ticket
 * that goes with every JOIN_GAME, the match a room is locked to (from GAME_STATE) and the worker's
 * lasting refusal of a seat.
 */
export function useTournamentSeat(feeds: TableFeeds) {
  /** The tournament match this room is locked to (sent with every GAME_STATE of a match room). */
  const match = useStoreSelector(feeds.store, selectMatch);
  /** The worker refused a seat at a tournament table (lasting, unlike a toast error). */
  const rejection = useStoreSelector(feeds.store, selectRejection);
  const { onGameState, onError, clearMatch } = feeds.tournament;
  return { match, rejection, joinFields: feeds.joinFields, onGameState, onError, dismissRejection: feeds.dismissRejection, clearMatch };
}
