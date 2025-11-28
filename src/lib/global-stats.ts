import { CardType, IGameState } from '@shared/domain';

export interface GameStatsPayload {
  roundsPlayed: number;
  wizardsPlayed: number;
  jestersPlayed: number;
  cardsPlayed: number;
  tricksPlayed: number;
  perfectBids: number;
  totalBids: number;
  highestScore: number;
  hadComeback: boolean;
}

export function extractGameStats(gameState: IGameState): GameStatsPayload {
  // Count cards from all completed tricks
  let wizardsPlayed = 0;
  let jestersPlayed = 0;
  let cardsPlayed = 0;

  for (const trick of gameState.completedTricks) {
    for (const playedCard of trick.cards) {
      cardsPlayed++;
      if (playedCard.card.type === CardType.WIZARD) {
        wizardsPlayed++;
      } else if (playedCard.card.type === CardType.JESTER) {
        jestersPlayed++;
      }
    }
  }

  // Also count cards in current trick if any
  if (gameState.currentTrick) {
    for (const playedCard of gameState.currentTrick.cards) {
      cardsPlayed++;
      if (playedCard.card.type === CardType.WIZARD) {
        wizardsPlayed++;
      } else if (playedCard.card.type === CardType.JESTER) {
        jestersPlayed++;
      }
    }
  }

  // Calculate bid stats
  let perfectBids = 0;
  let totalBids = 0;

  for (const player of gameState.players) {
    if (player.roundHistory) {
      for (const round of player.roundHistory) {
        totalBids++;
        if (round.bid === round.tricksWon) {
          perfectBids++;
        }
      }
    }
  }

  // Find highest score
  const highestScore = Math.max(...gameState.players.map((p) => p.score));

  // Detect comeback (was last at halftime, won the game)
  let hadComeback = false;
  const winner = [...gameState.players].sort((a, b) => b.score - a.score)[0];
  const halfwayRound = Math.floor(gameState.maxRounds / 2);

  if (winner && winner.roundHistory && winner.roundHistory.length >= halfwayRound) {
    // Calculate scores at halftime
    const halfwayScores = gameState.players.map((p) => {
      const halfScore = p.roundHistory?.slice(0, halfwayRound).reduce((sum, r) => sum + r.score, 0) ?? 0;
      return { id: p.id, score: halfScore };
    });
    halfwayScores.sort((a, b) => a.score - b.score); // Ascending (worst first)

    // Check if winner was last at halftime
    if (halfwayScores[0]?.id === winner.id) {
      hadComeback = true;
    }
  }

  return {
    roundsPlayed: gameState.currentRound,
    wizardsPlayed,
    jestersPlayed,
    cardsPlayed,
    tricksPlayed: gameState.completedTricks.length,
    perfectBids,
    totalBids,
    highestScore,
    hadComeback,
  };
}

export async function reportGameStats(gameState: IGameState): Promise<void> {
  try {
    const stats = extractGameStats(gameState);

    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });
  } catch (error) {
    // Silently fail - stats are not critical
    console.error('Failed to report global stats:', error);
  }
}
