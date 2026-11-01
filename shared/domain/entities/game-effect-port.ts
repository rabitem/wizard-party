/**
 * Adapter that lets the special-card effect handlers (expansions/trick-effects.ts)
 * read and change the game: hands, bids and the last completed trick.
 */

import { Card } from './card';
import type { Player } from './player';
import type { Trick } from './trick';
import type { BidAdjustment, ITrickEffectPort } from '../expansions/trick-effects';
import { CardNotFoundError, PlayerNotFoundError } from '../errors';

export interface EffectPortHost {
  getPlayer(playerId: string): Player | undefined;
  readonly completedTricks: readonly Trick[];
}

export function createTrickEffectPort(game: EffectPortHost): ITrickEffectPort {
  const requirePlayer = (id: string): Player => {
    const player = game.getPlayer(id);
    if (!player) throw new PlayerNotFoundError(id);
    return player;
  };
  const lastTrick = (): Trick => {
    const trick = game.completedTricks[game.completedTricks.length - 1];
    if (!trick) throw new Error('No completed trick');
    return trick;
  };

  return {
    getHand: (id) => requirePlayer(id).hand,
    getBid: (id) => requirePlayer(id).bid,
    // Everyone gives first, then everyone receives: passing is simultaneous.
    transferCards: (transfers) => {
      const moved = transfers.map((t) => ({ to: t.to, card: requirePlayer(t.from).takeCard(t.cardId) }));
      for (const { to, card } of moved) requirePlayer(to).receiveCards([card]);
    },
    adjustBid: (id, delta: BidAdjustment) => requirePlayer(id).adjustBid(delta),
    getTrickPile: () => lastTrick().getPile(),
    exchangeWithTrick: (id, handCardId, trickCardId) => {
      const trick = lastTrick();
      const taken = trick.getPile().find((card) => card.id === trickCardId);
      if (!taken) throw new CardNotFoundError(trickCardId);
      const player = requirePlayer(id);
      const given = player.takeCard(handCardId).toJSON();
      player.receiveCards([Card.fromJSON(taken)]);
      trick.recordExchange({ playerId: id, givenCard: given, takenCard: taken });
      return { given, taken };
    },
  };
}
