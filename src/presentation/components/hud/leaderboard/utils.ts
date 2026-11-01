import { IPlayer } from '@shared/domain';

/**
 * Calculates the round score based on bid and tricks won
 */
export function calculateCurrentRoundScore(player: IPlayer): number {
  if (player.bid === null) return 0;

  if (player.tricksWon === player.bid) {
    return 20 + player.tricksWon * 10;
  }
  return -Math.abs(player.tricksWon - player.bid) * 10;
}
