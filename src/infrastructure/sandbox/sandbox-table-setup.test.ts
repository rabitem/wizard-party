import { describe, expect, it } from 'vitest';
import { GamePhase, Suit, type Game } from '@shared/domain';
import type { SandboxTableConfig } from '@/presentation/components/sandbox/sandbox.types';
import { createSandboxGame } from './sandbox-table-setup';
import { createSeededRandom } from './seeded-random';

const SEED = 11;
const TABLE: SandboxTableConfig = { roomId: 'sandbox', playerCount: 4, round: 3, seed: SEED, leadSeat: 0, startPhase: 'BIDDING' };

const deal = (config: SandboxTableConfig, seed = SEED) => createSandboxGame(config, createSeededRandom(seed));

/** Every card on the table: the hands and the turned-up trump card. */
const cardsInPlay = (game: Game) => [
  ...game.players.flatMap((player) => player.hand.map((card) => card.id)),
  ...(game.trumpCard ? [game.trumpCard.id] : []),
].sort();

const handIds = (game: Game, seat: number) => game.players[seat].hand.map((card) => card.id);

describe('createSandboxGame', () => {
  it('should force a hand by trading cards with the other seats and the trump card, never duplicating one', () => {
    const unforced = deal(TABLE);
    expect(unforced.trumpCard).not.toBeNull();
    // One card of the seat's own, one from another seat, and the turned-up trump card.
    const forced = [handIds(unforced, 0)[0], handIds(unforced, 2)[0], unforced.trumpCard?.id ?? ''];

    const game = deal({ ...TABLE, hands: { 0: forced } });

    expect(handIds(game, 0)).toEqual(forced);
    expect(game.players.map((player) => player.hand.length)).toEqual([3, 3, 3, 3]);
    expect(cardsInPlay(game)).toEqual(cardsInPlay(unforced));
  });

  it.each([0, 1, 2, 3])('should let seat %i lead the first trick, dealt by the seat to its right', (leadSeat) => {
    const game = deal({ ...TABLE, leadSeat, startPhase: 'PLAYING' });
    expect(game.phase).toBe(GamePhase.PLAYING);
    expect(game.dealerIndex).toBe((leadSeat + 3) % 4);
    expect(game.currentPlayerIndex).toBe(leadSeat);
  });

  it.each([
    { playerCount: 4, round: 3, dealt: 3 },
    // 60 cards deal at most 12 rounds at five seats.
    { playerCount: 5, round: 99, dealt: 12 },
  ])('should deal round $round at $playerCount seats as round $dealt', ({ playerCount, round, dealt }) => {
    const game = deal({ ...TABLE, playerCount, round });
    expect(game.currentRound).toBe(dealt);
    expect(game.players.map((player) => player.hand.length)).toEqual(Array.from({ length: playerCount }, () => dealt));
  });

  it('should skip trump selection when the scenario names the trump suit', () => {
    const selection: SandboxTableConfig = { ...TABLE, startPhase: 'TRUMP_SELECTION' };
    // A deal that turns up a Wizard, so the dealer would have to choose trump.
    const seed = Array.from({ length: 300 }, (_, index) => index + 1).find((candidate) => deal(selection, candidate).phase === GamePhase.TRUMP_SELECTION);
    if (seed === undefined) throw new Error('No seed turns up a Wizard');

    const game = deal({ ...selection, trumpSuit: Suit.DWARVES }, seed);

    expect(game.phase).toBe(GamePhase.BIDDING);
    expect(game.trumpSuit).toBe(Suit.DWARVES);
  });
});
