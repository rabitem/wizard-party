'use client';

import { useMemo, useState } from 'react';
import type { IPlayer } from '@shared/domain';

/** The public standings the HUD shows: per-player results and whose turn it is */
export interface DisplayStandings {
  players: IPlayer[];
  currentPlayerIndex: number;
}

/**
 * Resolve the standings to display. The post-trick GAME_STATE arrives while the trick's last
 * cards are still flying, so while a trick result is pending (cards landing, before the win
 * banner) the trick outcome fields stay at their pre-trick values. Everything else, such as
 * names and connection status, stays live. The outcome is revealed together with the banner.
 */
export function resolveDisplayStandings(
  live: DisplayStandings,
  held: DisplayStandings,
  isTrickResultPending: boolean
): DisplayStandings {
  if (!isTrickResultPending) return live;

  const heldById = new Map(held.players.map((player) => [player.id, player]));
  return {
    players: live.players.map((player) => {
      const heldPlayer = heldById.get(player.id);
      if (!heldPlayer) return player;
      return {
        ...player,
        bid: heldPlayer.bid,
        tricksWon: heldPlayer.tricksWon,
        score: heldPlayer.score,
        roundHistory: heldPlayer.roundHistory,
      };
    }),
    currentPlayerIndex: held.currentPlayerIndex,
  };
}

const EMPTY_PLAYERS: IPlayer[] = [];

/**
 * Standings for the HUD (leaderboards, turn indicator) that do not spoil a trick's winner
 * or the round score before the trick animation reveals them. The local hand keeps reading
 * the live game state.
 */
export function useDisplayStandings(
  players: IPlayer[] | undefined,
  currentPlayerIndex: number | undefined,
  isTrickResultPending: boolean
): DisplayStandings {
  const livePlayers = players ?? EMPTY_PLAYERS;
  const liveIndex = currentPlayerIndex ?? 0;
  const [held, setHeld] = useState<DisplayStandings>({ players: livePlayers, currentPlayerIndex: liveIndex });

  // Track the latest settled standings; TRICK_COMPLETE sets the pending flag before the
  // post-trick GAME_STATE lands, so the held value is always the pre-trick one.
  if (!isTrickResultPending && (held.players !== livePlayers || held.currentPlayerIndex !== liveIndex)) {
    setHeld({ players: livePlayers, currentPlayerIndex: liveIndex });
  }

  return useMemo(
    () => resolveDisplayStandings({ players: livePlayers, currentPlayerIndex: liveIndex }, held, isTrickResultPending),
    [livePlayers, liveIndex, held, isTrickResultPending]
  );
}
