import { useMemo } from 'react';
import { IPlayer } from '@shared/domain';
import { SITE_URL } from '@/config/deployment.config';
import { useRealmLinkParam } from '../room-browser';
import { PlayerStats, ScoreProgressionData, MedalDisplay } from './types';

export function usePlayerStats(players: IPlayer[]): Record<string, PlayerStats> {
  return useMemo(() => {
    const allStats: Record<string, PlayerStats> = {};

    for (const player of players) {
      let perfectBids = 0;
      let bestRound = -Infinity;
      let worstRound = Infinity;
      let totalTricksWon = 0;
      let currentStreak = 0;
      let longestStreak = 0;

      for (const round of player.roundHistory) {
        if (round.bid === round.tricksWon) {
          perfectBids++;
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
        bestRound = Math.max(bestRound, round.score);
        worstRound = Math.min(worstRound, round.score);
        totalTricksWon += round.tricksWon;
      }

      allStats[player.id] = {
        perfectBids,
        totalBids: player.roundHistory.length,
        bestRound: bestRound === -Infinity ? 0 : bestRound,
        worstRound: worstRound === Infinity ? 0 : worstRound,
        totalTricksWon,
        longestStreak,
      };
    }

    return allStats;
  }, [players]);
}

export function useScoreProgression(players: IPlayer[]): ScoreProgressionData[] {
  return useMemo(() => {
    return players.map((player) => {
      let cumulative = 0;
      const scores = player.roundHistory.map((round) => {
        cumulative += round.score;
        return cumulative;
      });
      return { playerId: player.id, playerName: player.name, scores: [0, ...scores] };
    });
  }, [players]);
}

export function useMaxScore(scoreProgression: ScoreProgressionData[]): number {
  return useMemo(() => {
    return Math.max(...scoreProgression.flatMap((p) => p.scores), 1);
  }, [scoreProgression]);
}

export function useSortedPlayers(players: IPlayer[]): IPlayer[] {
  return useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );
}

export function useShareData(
  sortedPlayers: IPlayer[],
  maxRounds: number,
  stats: Record<string, PlayerStats>
): { shareUrl: string; shareText: string } {
  const realmParam = useRealmLinkParam();
  return useMemo(() => {
    const shareData = {
      players: sortedPlayers.map((p) => ({
        name: p.name,
        score: p.score,
        perfect: stats[p.id]?.perfectBids || 0,
      })),
      rounds: maxRounds,
    };
    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `${SITE_URL}/share?d=${encoded}${realmParam}`;

    const lines = [
      '🧙 Wizard Party Results 🧙',
      '',
      ...sortedPlayers.map((p, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = i < 3 ? medals[i] : `${i + 1}.`;
        return `${medal} ${p.name}: ${p.score} pts`;
      }),
      '',
      `Rounds played: ${maxRounds}`,
      '',
      shareUrl,
    ];
    const shareText = lines.join('\n');

    return { shareUrl, shareText };
  }, [sortedPlayers, maxRounds, stats, realmParam]);
}

export function getMedalDisplay(index: number): MedalDisplay {
  if (index === 0) return { icon: 'ra-crown', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)' };
  if (index === 1) return { icon: 'ra-gem-pendant', color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.1)' };
  if (index === 2) return { icon: 'ra-gem-pendant', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.1)' };
  return { icon: 'ra-player', color: 'var(--text-muted)', bg: 'transparent' };
}
