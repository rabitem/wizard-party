import { describe, expect, it } from 'vitest';

import {
  BotDifficulty,
  Card,
  CardType,
  DEFAULT_RULESET_CONFIG,
  Game,
  GamePhase,
  Player,
  SPECIAL_CARD_TYPES,
  Suit,
  TrickEffectKind,
  Trick,
  createSeededRandom,
  type SpecialCardType,
} from '../../../domain';
import { createUseCaseRegistry } from '../../use-case-registry';

const useCases = createUseCaseRegistry();

/**
 * Round 1 of three players with only the Werewolf added deals p1 DWARVES-13, p2 the Werewolf
 * and p3 HUMANS-8, then turns up DWARVES-6 (dealer p1).
 */
const WEREWOLF_TO_P2_SEED = 248;

function createGame(specialCards: SpecialCardType[], playerCount = 3, bots = false, seed = 0): Game {
  const game = new Game('special-cards', 'p1', { random: createSeededRandom(seed) });
  game.setRulesetConfig({ ...DEFAULT_RULESET_CONFIG, expansions: { specialCards } });
  for (let i = 1; i <= playerCount; i++) {
    game.addPlayer(new Player(`p${i}`, `Player ${i}`, bots, bots ? BotDifficulty.MEDIUM : undefined));
  }
  return game;
}

/** Put a game into PLAYING with fixed hands and bids. */
function stagePlaying(game: Game, hands: Card[][], bids: number[], trumpSuit: Suit | null = null): void {
  game.start();
  game.players.forEach((player, index) => {
    player.hand = hands[index];
    player.bid = bids[index];
    player.tricksWon = 0;
  });
  game.phase = GamePhase.PLAYING;
  game.trumpSuit = trumpSuit;
  game.trumpChoice = null;
  game.expansionState = { copySource: null, setAsideCards: [], werewolfSwap: null };
  game.pendingEffects = [];
  game.completedTricks = [];
  game.currentTrick = new Trick(trumpSuit, game.getRoundContext());
  game.currentPlayerIndex = 0;
}

const num = (suit: Suit, value: number) => Card.createNumberCard(suit, value);
const sp = (type: SpecialCardType) => Card.createSpecial(type);

function play(game: Game, playerId: string, cardId: string, declaration?: unknown) {
  return useCases.playCard.execute({ game, playerId, cardId, declaration });
}

describe('special cards in a game', () => {
  it('requires an announced suit for the Cloud and applies the bid change of its winner', () => {
    const game = createGame([CardType.CLOUD]);
    stagePlaying(
      game,
      [[sp(CardType.CLOUD), num(Suit.GIANTS, 2)], [num(Suit.ELVES, 2), num(Suit.GIANTS, 3)], [num(Suit.ELVES, 3), num(Suit.GIANTS, 4)]],
      [1, 1, 1]
    );

    expect(() => play(game, 'p1', 'CLOUD-0')).toThrow(/Announce a suit/);
    play(game, 'p1', 'CLOUD-0', { suit: Suit.ELVES });
    play(game, 'p2', 'ELVES-2');
    const result = play(game, 'p3', 'ELVES-3');

    expect(result.trickCompleteEvent?.winnerId).toBe('p1');
    expect(result.awaitingEffects).toBe(true);
    expect(game.getActiveEffect()).toEqual({ kind: TrickEffectKind.ADJUST_BID, playerId: 'p1' });
    expect(() => play(game, 'p1', 'GIANTS-2')).toThrow(/Resolve the special card effect/);

    const resolved = useCases.resolveEffect.execute({
      game,
      playerId: 'p1',
      response: { kind: TrickEffectKind.ADJUST_BID, delta: 1 },
    });
    expect(resolved.effectEvents[0].outcome).toMatchObject({ playerId: 'p1', delta: 1, newBid: 2 });
    expect(game.getPlayer('p1')?.bid).toBe(2);
    expect(game.hasPendingEffects()).toBe(false);
    expect(game.getCurrentPlayer().id).toBe('p1');
  });

  it('forces a raise for a Cloud winner who bid zero', () => {
    const game = createGame([CardType.CLOUD]);
    stagePlaying(game, [[sp(CardType.CLOUD), num(Suit.GIANTS, 2)], [num(Suit.ELVES, 2), num(Suit.GIANTS, 3)], [num(Suit.ELVES, 3), num(Suit.GIANTS, 4)]], [0, 1, 1]);
    play(game, 'p1', 'CLOUD-0', { suit: Suit.ELVES });
    play(game, 'p2', 'ELVES-2');
    const result = play(game, 'p3', 'ELVES-3');
    expect(result.awaitingEffects).toBe(false);
    expect(result.effectEvents).toHaveLength(1);
    expect(game.getPlayer('p1')?.bid).toBe(1);
  });

  it('voids a Bomb trick: nobody scores it and the would-be winner leads', () => {
    const game = createGame([CardType.BOMB]);
    stagePlaying(game, [[sp(CardType.BOMB), num(Suit.GIANTS, 2)], [num(Suit.ELVES, 9), num(Suit.GIANTS, 3)], [num(Suit.ELVES, 3), num(Suit.GIANTS, 4)]], [0, 0, 0]);
    play(game, 'p1', 'BOMB-0');
    play(game, 'p2', 'ELVES-9');
    const result = play(game, 'p3', 'ELVES-3');
    expect(result.trickCompleteEvent).toMatchObject({ winnerId: 'p2', voided: true });
    expect(game.players.map((p) => p.tricksWon)).toEqual([0, 0, 0]);
    expect(game.getCurrentPlayer().id).toBe('p2');
  });

  it('passes one card to the left after a Juggler trick, simultaneously', () => {
    const game = createGame([CardType.JUGGLER]);
    stagePlaying(game, [[sp(CardType.JUGGLER), num(Suit.GIANTS, 2)], [num(Suit.ELVES, 2), num(Suit.GIANTS, 3)], [num(Suit.ELVES, 3), num(Suit.GIANTS, 4)]], [1, 1, 0]);
    play(game, 'p1', 'JUGGLER-0', { suit: Suit.ELVES });
    play(game, 'p2', 'ELVES-2');
    play(game, 'p3', 'ELVES-3');

    expect(game.getAwaitingEffectPlayerIds()).toEqual(['p1', 'p2', 'p3']);
    for (const [playerId, cardId] of [['p1', 'GIANTS-2'], ['p2', 'GIANTS-3']]) {
      useCases.resolveEffect.execute({ game, playerId, response: { kind: TrickEffectKind.PASS_LEFT, cardId } });
    }
    expect(game.getPlayer('p2')?.hand.map((c) => c.id)).toEqual(['GIANTS-3']);
    useCases.resolveEffect.execute({ game, playerId: 'p3', response: { kind: TrickEffectKind.PASS_LEFT, cardId: 'GIANTS-4' } });

    expect(game.players.map((p) => p.hand.map((c) => c.id))).toEqual([['GIANTS-4'], ['GIANTS-2'], ['GIANTS-3']]);
  });

  it('lets the Witch swap a hand card with a card of the decided trick', () => {
    const game = createGame([CardType.WITCH]);
    stagePlaying(game, [[sp(CardType.WITCH), num(Suit.GIANTS, 2)], [num(Suit.ELVES, 12), num(Suit.GIANTS, 3)], [num(Suit.ELVES, 3), num(Suit.GIANTS, 4)]], [0, 1, 0]);
    play(game, 'p1', 'WITCH-0');
    play(game, 'p2', 'ELVES-12');
    play(game, 'p3', 'ELVES-3');

    expect(game.getPlayer('p2')?.tricksWon).toBe(1);
    expect(() => useCases.resolveEffect.execute({
      game, playerId: 'p1', response: { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: 'GIANTS-2', trickCardId: 'WITCH-0' },
    })).toThrow(/Witch/);
    useCases.resolveEffect.execute({
      game, playerId: 'p1', response: { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: 'GIANTS-2', trickCardId: 'ELVES-12' },
    });
    expect(game.getPlayer('p1')?.hand.map((c) => c.id)).toEqual(['ELVES-12']);
    expect(game.completedTricks[0].getPile().map((c) => c.id)).toContain('GIANTS-2');
  });

  it('gives the trump choice to the Werewolf holder, who may declare no trump', () => {
    const game = createGame([CardType.WEREWOLF], 3, false, WEREWOLF_TO_P2_SEED);
    game.start();

    expect(game.phase).toBe(GamePhase.TRUMP_SELECTION);
    expect(game.getTrumpChooser()?.id).toBe('p2');
    expect(game.getPlayer('p2')?.hand.map((c) => c.id)).toEqual(['DWARVES-6']);
    expect(game.trumpCard?.type).toBe(CardType.WEREWOLF);
    expect(game.trumpSuit).toBeNull();

    expect(() => useCases.selectTrump.execute({ game, playerId: 'p1', suit: Suit.GIANTS })).toThrow();
    useCases.selectTrump.execute({ game, playerId: 'p2', suit: null });
    expect(game.trumpSuit).toBeNull();
    expect(game.phase).toBe(GamePhase.BIDDING);
  });

  it('survives full bot games with every special card in the deck', () => {
    for (let seed = 0; seed < 4; seed++) {
      const game = createGame([...SPECIAL_CARD_TYPES], 3 + (seed % 4), true, seed);
      game.start();
      let steps = 0;
      while (game.phase !== GamePhase.GAME_END) {
        if (game.phase === GamePhase.ROUND_END) {
          game.startNextRound();
          continue;
        }
        const action = useCases.botTurn.execute({ game });
        if (action.type === 'NONE') throw new Error(`Bots stuck in ${game.phase}`);
        if (action.type === 'SELECT_TRUMP') useCases.selectTrump.execute({ game, playerId: action.playerId, suit: action.suit });
        if (action.type === 'PLACE_BID') useCases.placeBid.execute({ game, playerId: action.playerId, bid: action.bid });
        if (action.type === 'PLAY_CARD') useCases.playCard.execute({ game, playerId: action.playerId, cardId: action.cardId, declaration: action.declaration });
        if (action.type === 'RESOLVE_EFFECT') useCases.resolveEffect.execute({ game, playerId: action.playerId, response: action.response });
        steps++;
        expect(steps).toBeLessThan(20000);
      }
      expect(game.players.every((p) => p.roundHistory.length === game.maxRounds)).toBe(true);
    }
  }, 120000);
});
