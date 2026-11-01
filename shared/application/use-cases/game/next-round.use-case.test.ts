import { describe, expect, it } from 'vitest';

import { GameEventType, GamePhase, InvalidPhaseError, NotHostError, type Game } from '../../../domain';
import { seededGame, startInBidding } from '../../../domain/entities/game-aggregate.fixtures';
import { NextRoundUseCase } from './next-round.use-case';

/** Plays the one-card first round with legal moves so the table waits in ROUND_END. */
function gameAtRoundEnd(): Game {
  const game = seededGame();
  startInBidding(game);
  while (game.phase === GamePhase.BIDDING) {
    const bidder = game.getCurrentPlayer();
    game.placeBid(bidder.id, game.getForbiddenBidFor(bidder.id) === 0 ? 1 : 0);
  }
  while (game.phase === GamePhase.PLAYING) {
    const player = game.getCurrentPlayer();
    game.playCard(player.id, game.getLegalPlays(player.id)[0].id);
  }
  return game;
}

describe('NextRoundUseCase', () => {
  const nextRound = new NextRoundUseCase();

  it('lets the host deal the next round', () => {
    const game = gameAtRoundEnd();
    expect(game.phase).toBe(GamePhase.ROUND_END);

    const result = nextRound.execute({ game, playerId: game.hostId });

    expect(game.currentRound).toBe(2);
    expect(game.players.every((player) => player.hand.length === 2)).toBe(true);
    expect(result.trumpRevealedEvent).toMatchObject({
      type: GameEventType.TRUMP_REVEALED,
      trumpCard: game.trumpCard?.toJSON() ?? null,
      trumpSuit: game.trumpSuit,
    });
  });

  it('refuses a player who is not the host', () => {
    const game = gameAtRoundEnd();

    expect(() => nextRound.execute({ game, playerId: 'p2' })).toThrow(NotHostError);
    expect(game.phase).toBe(GamePhase.ROUND_END);
    expect(game.currentRound).toBe(1);
  });

  it('refuses to skip a round that is still being played', () => {
    const game = seededGame();
    startInBidding(game);

    expect(() => nextRound.execute({ game, playerId: game.hostId })).toThrow(InvalidPhaseError);
    expect(game.currentRound).toBe(1);
  });
});
