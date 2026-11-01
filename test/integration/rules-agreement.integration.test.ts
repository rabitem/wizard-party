import { afterEach, describe, expect, it } from 'vitest';
import {
  ALL_SUITS,
  CardType,
  EXPANSION_SETS,
  GamePhase,
  ROOM_PLAYER_LIMITS,
  RULESET_LIMITS,
  TrickEffectKind,
  TrumpChoiceReason,
  isSpecialCardType,
  type Game,
  type IRulesetConfig,
  type SpecialCardType,
} from '@shared/domain';
import { createSeededRandom, hashSeed } from '@/infrastructure/sandbox/seeded-random';
import { ruleset } from '../../party/test-support/table-driver';
import type { TestConnection } from '../../party/test-support/room-harness';
import { FullStackTable } from './support/full-stack-table';
import { NotOfferedError, canResolveEffect, chooseBid } from './support/offers';
import type { PlayerClient } from './support/player-client';
import { view } from './support/screen-model';
import { pick, playOffered, range, type Move, type Step } from './support/seeded-moves';

/**
 * The client works out legal cards, the forbidden bid and the special-card choices with the shared
 * domain from the state the room projects for its seat. A field the projection drops or garbles
 * (lead, trump, copied card, pending effect) makes the client offer what the room refuses or hide
 * what it accepts; level 1 cannot see that. Every human plays seeded random moves picked only from
 * what their screen offers (support/seeded-moves.ts), and the room, the owner, must accept each.
 * Tables are humans only, so every decision is made, and checked, at rest.
 */
const PLAYERS = ['Ann', 'Ben', 'Cid', 'Dee'];
/** Games of the legal-card sweep per expansion set; its preconditions count across all of them. */
const GAME_SEEDS = [5, 23, 71];
const GAME_ROUNDS = 10;
/** Seeds of the scenarios that wait for one situation. */
const SITUATION_SEEDS = [3, 41];
const HOOK_ROUNDS = 5;
/** As many rounds as the deck allows (the room clamps the count). */
const MAX_ROUNDS = RULESET_LIMITS.CUSTOM_ROUND_COUNT.MAX;

function rulesWith({ rounds = MAX_ROUNDS, hiddenBids = false, specialCards = [] }: {
  rounds?: number;
  hiddenBids?: boolean;
  specialCards?: readonly SpecialCardType[];
}): IRulesetConfig {
  const base = ruleset({ rounds });
  return { ...base, bidding: { ...base.bidding, hiddenBids }, expansions: { specialCards: [...specialCards] } };
}

let open: FullStackTable | null = null;

async function seatTable(seed: number, rules: IRulesetConfig): Promise<{ table: FullStackTable; players: PlayerClient[] }> {
  open?.dispose();
  const table = await FullStackTable.create({ seed });
  open = table;
  const players = PLAYERS.map((name) => table.open(table.browser(), name));
  await players[0].join({ name: 'Rules table', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: rules });
  for (const player of players.slice(1)) await player.join();
  players[0].start();
  await table.settle();
  return { table, players };
}

/** I4 on every screen: the playable cards are exactly the cards the room accepts from that seat. */
function expectOfferedCardsAccepted(table: FullStackTable): number {
  let turns = 0;
  for (const client of table.players) {
    if (!client.seatId) continue;
    const accepted = table.server.game.getLegalPlays(client.seatId).map((card) => card.id).sort();
    const offered = [...(view(client).table?.playableCardIds ?? [])].sort();
    expect(offered, `${client.name} offers other cards than the room accepts`).toEqual(accepted);
    if (accepted.length > 0) turns += 1;
  }
  return turns;
}

interface Situations {
  turnsChecked: number;
  wizardLeads: number;
  jesterLeads: number;
  forcedFollows: number;
  /** Special cards played, and the Werewolf once swapped for the trump card (it is never played then). */
  inPlay: Set<CardType>;
}

/** What a card about to be played exercises, read from the room's game. */
function countPlay(game: Game, seat: string, cardId: string, seen: Situations): void {
  const hand = game.getPlayer(seat)?.hand ?? [];
  const card = hand.find((held) => held.id === cardId);
  if (!card) return;
  const leads = (game.currentTrick?.cards.length ?? 0) === 0;
  if (leads && card.type === CardType.WIZARD) seen.wizardLeads += 1;
  if (leads && card.type === CardType.JESTER) seen.jesterLeads += 1;
  if (game.getLegalPlays(seat).length < hand.length) seen.forcedFollows += 1;
  if (isSpecialCardType(card.type)) seen.inPlay.add(card.type);
}

function heldBy(table: FullStackTable, seat: string): string[] {
  return table.server.game.getPlayer(seat)?.hand.map((card) => card.id) ?? [];
}

/** The special-card choices, each checked against the room once made and counted by kind. */
function checkedChoice(table: FullStackTable, made: Record<string, number>, random: () => number) {
  return (client: PlayerClient, move: Move): Step => {
    const game = table.server.game;
    const seat = client.seatId ?? '';
    if (move.kind === 'trump' && game.trumpChoice?.reason === TrumpChoiceReason.WEREWOLF) {
      const suit = made.werewolfNoTrump === 0 ? null : pick(random, ALL_SUITS);
      return { move: { kind: 'trump', suit }, verify: () => {
        expect(table.server.game.trumpSuit, `${client.name}'s Werewolf trump`).toBe(suit);
        expect(table.server.game.phase).toBe(GamePhase.BIDDING);
        made[suit === null ? 'werewolfNoTrump' : 'werewolfTrump'] += 1;
      } };
    }
    if (move.kind === 'play' && game.getPlayer(seat)?.hand.find((card) => card.id === move.cardId)?.type === CardType.CLOUD) {
      const { cardId, declaration } = move;
      return { move, verify: () => {
        const now = table.server.game;
        const tricks = [now.currentTrick, ...now.completedTricks];
        const played = tricks.flatMap((trick) => trick?.cards ?? []).find((entry) => entry.card.id === cardId);
        expect(declaration?.suit, "the screen asks for the Cloud's suit").toBeDefined();
        expect(played?.declaration?.suit, 'the room plays the Cloud in the announced suit').toBe(declaration?.suit);
        made.cloudSuit += 1;
      } };
    }
    if (move.kind !== 'effect') return { move };
    const { response } = move;
    if (response.kind === TrickEffectKind.ADJUST_BID) {
      const expected = (game.getPlayer(seat)?.bid ?? 0) + response.delta;
      return { move, verify: () => {
        expect(table.server.game.getPlayer(seat)?.bid, `${client.name}'s Cloud bid change`).toBe(expected);
        made.cloudBid += 1;
      } };
    }
    if (response.kind === TrickEffectKind.SWAP_WITH_TRICK) {
      const { handCardId, trickCardId } = response;
      return { move, verify: () => {
        expect(heldBy(table, seat), `${client.name} took the trick card`).toContain(trickCardId);
        expect(heldBy(table, seat), `${client.name} gave the hand card`).not.toContain(handCardId);
        made.witchSwap += 1;
      } };
    }
    return { move, verify: () => {
      expect(table.server.game.getAwaitingEffectPlayerIds(), `${client.name}'s pass was taken`).not.toContain(seat);
      made.jugglerPass += 1;
    } };
  };
}

describe('rules agreement between the client and the room', () => {
  afterEach(() => {
    open?.dispose();
    open = null;
  });

  it.each(EXPANSION_SETS)("offers exactly the server's legal cards at every turn of full seeded games with $name", { timeout: 300_000 }, async (set) => {
    const seen: Situations = { turnsChecked: 0, wizardLeads: 0, jesterLeads: 0, forcedFollows: 0, inPlay: new Set() };
    for (const seed of GAME_SEEDS) {
      const { table } = await seatTable(seed, rulesWith({ rounds: GAME_ROUNDS, specialCards: set.cards }));
      await playOffered(table, createSeededRandom(hashSeed('moves', seed)), () => false, {
        atRest: () => {
          seen.turnsChecked += expectOfferedCardsAccepted(table);
          const game = table.server.game;
          const werewolfChoice = game.phase === GamePhase.TRUMP_SELECTION && game.trumpChoice?.reason === TrumpChoiceReason.WEREWOLF;
          if (werewolfChoice) seen.inPlay.add(CardType.WEREWOLF);
        },
        choose: (client, move) => {
          if (move.kind === 'play' && client.seatId) countPlay(table.server.game, client.seatId, move.cardId, seen);
          return { move };
        },
      });
      expect(table.server.game.phase, `seed ${seed} played to the end`).toBe(GamePhase.GAME_END);
      table.checkInvariants();
    }
    expect(seen.turnsChecked, 'precondition: turns were checked').toBeGreaterThan(0);
    expect(seen.wizardLeads, 'precondition: a Wizard was led').toBeGreaterThan(0);
    expect(seen.jesterLeads, 'precondition: a Jester was led').toBeGreaterThan(0);
    expect(seen.forcedFollows, 'precondition: a player had to follow suit').toBeGreaterThan(0);
    const notInPlay = set.cards.filter((type) => !seen.inPlay.has(type));
    expect(notInPlay, 'precondition: every special card of the set was in play').toEqual([]);
  });

  it.each(SITUATION_SEEDS)('accepts every effect choice the client offers: Cloud suit, Werewolf trump or no trump, Witch swap, Juggler pass (seed %i)', { timeout: 120_000 }, async (seed) => {
    const specialCards = [CardType.WEREWOLF, CardType.JUGGLER, CardType.CLOUD, CardType.WITCH] as const;
    const { table } = await seatTable(seed, rulesWith({ specialCards }));
    const random = createSeededRandom(hashSeed('moves', seed));
    const made: Record<string, number> = { cloudSuit: 0, cloudBid: 0, werewolfTrump: 0, werewolfNoTrump: 0, witchSwap: 0, jugglerPass: 0 };
    const allMade = () => Object.values(made).every((count) => count > 0);
    await playOffered(table, random, allMade, { choose: checkedChoice(table, made, random) });
    const missing = Object.entries(made).filter(([, count]) => count === 0).map(([choice]) => choice);
    expect(missing, 'precondition: every kind of choice was made').toEqual([]);
    table.checkInvariants();
  });

  it.each(SITUATION_SEEDS)('passes Juggler cards only once every human chose, and each card reaches only its new holder (seed %i)', { timeout: 120_000 }, async (seed) => {
    // The Juggler alone: no other card of the deck ever shows a hand card in public (the Werewolf's taken card does).
    const { table, players } = await seatTable(seed, rulesWith({ specialCards: [CardType.JUGGLER] }));
    const random = createSeededRandom(hashSeed('moves', seed));
    const passing = () => table.server.game.getActiveEffect()?.kind === TrickEffectKind.PASS_LEFT;
    await playOffered(table, random, passing);
    expect(passing(), 'precondition: a Juggler trick asks everyone to pass a card').toBe(true);
    /** Where each connection's wire log stands now. */
    const mark = () => new Map(players.flatMap((p) => p.connections.map((c): [TestConnection, number] => [c, c.sent.length])));
    const start = mark();
    let beforeLast = start;
    const chosen = new Map<string, string>();
    for (const [index, player] of [...players].reverse().entries()) {
      const isLast = index === players.length - 1;
      const prompt = view(player).table?.effectPrompt;
      if (prompt?.mode !== TrickEffectKind.PASS_LEFT || !player.seatId) throw new Error(`${player.name} is not asked to pass a card`);
      const cardId = pick(random, prompt.hand).id;
      if (isLast) beforeLast = mark();
      chosen.set(player.seatId, cardId);
      player.resolve({ kind: TrickEffectKind.PASS_LEFT, cardId });
      await table.settle();
      if (isLast) break;
      expect(passing(), 'the pass waits for every human').toBe(true);
      expect(canResolveEffect(view(player)), `${player.name} is not asked twice`).toBe(false);
      for (const [seat, held] of chosen) expect(heldBy(table, seat), 'no card moves before everyone chose').toContain(held);
    }
    // The rule: everyone passes to the next seat. Nobody else sees the card; the receiver only once it arrived.
    const seats = table.server.game.players.map((player) => player.id);
    seats.forEach((giver, index) => {
      const receiver = seats[(index + 1) % seats.length];
      const cardId = chosen.get(giver) ?? '';
      expect(heldBy(table, receiver), 'each player passes to the next seat').toContain(cardId);
      for (const player of players.filter((other) => other.seatId !== giver)) {
        const until = player.seatId === receiver ? beforeLast : null;
        const frames = player.connections.flatMap((c) => c.messages().slice(start.get(c) ?? 0, until?.get(c)));
        const showing = frames.filter((frame) => JSON.stringify(frame).includes(`"${cardId}"`));
        expect(showing, `${player.name} was shown ${cardId}`).toEqual([]);
      }
    });
  });

  it.each(SITUATION_SEEDS)("applies the hook rule: the last bidder's client never offers the forbidden bid, and only that client knows it under hidden bids (seed %i)", { timeout: 120_000 }, async (seed) => {
    const { table } = await seatTable(seed, rulesWith({ rounds: HOOK_ROUNDS, hiddenBids: true }));
    const isOffered = (client: PlayerClient, bid: number): boolean => {
      try {
        return chooseBid(client.name, view(client), bid) === bid;
      } catch (error) {
        if (error instanceof NotOfferedError) return false;
        throw error;
      }
    };
    let hookTurns = 0;
    const expectHookRule = () => {
      const game = table.server.game;
      if (game.phase !== GamePhase.BIDDING || game.isPaused()) return;
      const bidder = game.getCurrentPlayer();
      const cards = game.getCardsPerPlayerForCurrentRound();
      const others = game.players.filter((player) => player.id !== bidder.id);
      const total = others.reduce((sum, player) => sum + (player.bid ?? 0), 0);
      // The hook rule: the last bidder may not make the bids add up to the tricks of the round.
      const forbidden = others.every((player) => player.bid !== null) && total <= cards ? cards - total : null;
      for (const client of table.players) {
        const shown = view(client).table?.game.forbiddenBid ?? null;
        expect(shown, `${client.name}'s forbidden bid`).toBe(client.seatId === bidder.id ? forbidden : null);
      }
      const last = table.players.find((client) => client.seatId === bidder.id);
      if (forbidden === null || !last) return;
      const offered = range(cards + 1).filter((bid) => isOffered(last, bid));
      expect(offered, `${last.name}'s bid choices`).toEqual(range(cards + 1).filter((bid) => bid !== forbidden));
      hookTurns += 1;
    };
    await playOffered(table, createSeededRandom(hashSeed('moves', seed)), () => false, { atRest: expectHookRule });
    expect(hookTurns, 'precondition: a last bidder had a forbidden bid').toBeGreaterThan(0);
    table.checkInvariants();
  });
});
