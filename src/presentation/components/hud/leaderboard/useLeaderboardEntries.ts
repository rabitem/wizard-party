'use client';

import { useMemo } from 'react';
import { IPlayer } from '@shared/domain';
import { LeaderboardEntry } from './types';
import { calculateCurrentRoundScore } from './utils';

/**
 * Transforms players into sorted leaderboard entries
 */
export function useLeaderboardEntries(players: IPlayer[]): LeaderboardEntry[] {
  return useMemo(() => {
    const playersWithIndex = players.map((player, originalIndex) => ({
      player,
      originalIndex,
    }));

    const sortedPlayers = [...playersWithIndex].sort((a, b) => b.player.score - a.player.score);

    return sortedPlayers.map(({ player, originalIndex }, index) => ({
      player,
      position: index + 1,
      originalIndex,
      roundScore: calculateCurrentRoundScore(player),
      madeCurrentBid: player.bid !== null && player.tricksWon === player.bid,
      bidProgress: player.bid !== null
        ? `${player.tricksWon}/${player.bid}`
        : '-',
    }));
  }, [players]);
}
