/**
 * Seeded random play through what the players' screens offer: at every rest one player makes a
 * move picked at random (from a seeded stream) among the moves their screen offers now: any
 * playable card with any declaration it asks for, any allowed bid, any trump suit (or no trump
 * where offered), any effect answer the prompt shows. Wider than `autoMove` (always the simplest
 * move), so a seed list reaches leads, follows and special-card choices the simple policy never
 * makes. The room must accept every such move: a refusal fails the scenario at once.
 */
import { expect } from 'vitest';
import {
  ALL_SUITS, DeclarationKind, GameEventType, GamePhase, TrickEffectKind, getDeclarationOptions,
  type BidAdjustment, type CardForm, type ICardDeclaration, type Suit, type TrickEffectResponse,
} from '@shared/domain';
import { getPlayDeclarationKind, type EffectPromptModel } from '@/presentation/components/special-cards/special-card-view-model';
import { ROOM_TIMING } from '../../../party/config/room-timing.config';
import type { FullStackTable } from './full-stack-table';
import { canBid, canChooseTrump, canMoveRoundOn, canResolveEffect } from './offers';
import type { PlayerClient } from './player-client';
import { view } from './screen-model';

/** Moves one seeded game may take before the scenario counts as stuck. */
const MOVE_LIMIT = 5_000;
/** Rests between seeded moves skip I1-I6 (they rescan every frame); scenarios check them once at the end. */
const QUIET = { invariants: false } as const;

export type Move =
  | { kind: 'trump'; suit: Suit | null }
  | { kind: 'effect'; response: TrickEffectResponse }
  | { kind: 'bid'; bid: number }
  | { kind: 'play'; cardId: string; declaration?: ICardDeclaration }
  | { kind: 'next-round' };

/** A move to make, and what the room must hold once the table settled after it. */
export interface Step {
  move: Move;
  verify?: () => void;
}

export interface PlayHooks {
  /** Runs whenever the table is at rest, before the next move (and once more at the end). */
  atRest?: () => void;
  /** Sees (and may replace) each move before it is made. */
  choose?: (client: PlayerClient, move: Move) => Step;
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error('nothing to pick from');
  return items[Math.floor(random() * items.length)];
}

/** 0, 1, ..., count - 1. */
export function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

function effectChoice(prompt: EffectPromptModel, random: () => number): TrickEffectResponse | null {
  switch (prompt.mode) {
    case TrickEffectKind.PASS_LEFT:
      return { kind: TrickEffectKind.PASS_LEFT, cardId: pick(random, prompt.hand).id };
    case TrickEffectKind.ADJUST_BID: {
      const delta: BidAdjustment = prompt.canLower && random() < 0.5 ? -1 : 1;
      return { kind: TrickEffectKind.ADJUST_BID, delta };
    }
    case TrickEffectKind.SWAP_WITH_TRICK:
      return { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: pick(random, prompt.hand).id, trickCardId: pick(random, prompt.pile).id };
    default:
      return null;
  }
}

/** A random move among those the player's screen offers now; null when it offers none. */
function offeredMove(client: PlayerClient, random: () => number): Move | null {
  const screen = view(client);
  const table = screen.table;
  if (screen.status !== 'connected' || !table || table.game.pauseState) return null;
  const hand = table.game.players.find((player) => player.id === screen.seatId)?.hand ?? [];
  if (canChooseTrump(screen)) {
    return { kind: 'trump', suit: pick<Suit | null>(random, table.trumpChoice?.allowNoTrump ? [...ALL_SUITS, null] : ALL_SUITS) };
  }
  const response = canResolveEffect(screen) && table.effectPrompt ? effectChoice(table.effectPrompt, random) : null;
  if (response) return { kind: 'effect', response };
  if (canBid(client.name, screen)) {
    return { kind: 'bid', bid: pick(random, range(hand.length + 1).filter((bid) => bid !== table.game.forbiddenBid)) };
  }
  if (table.playableCardIds.length === 0 || table.interactionsDisabled) {
    return canMoveRoundOn(screen) ? { kind: 'next-round' } : null;
  }
  const cardId = pick(random, table.playableCardIds);
  const kind = getPlayDeclarationKind(table.game, hand.find((card) => card.id === cardId));
  if (kind === null) return { kind: 'play', cardId };
  const option = pick(random, getDeclarationOptions(kind));
  return { kind: 'play', cardId, declaration: kind === DeclarationKind.SUIT ? { suit: option as Suit } : { form: option as CardForm } };
}

/** Makes the move through the driver, which sends it only when the screen offers it. */
function makeMove(client: PlayerClient, move: Move): void {
  if (move.kind === 'trump') client.chooseTrump(move.suit);
  else if (move.kind === 'effect') client.resolve(move.response);
  else if (move.kind === 'bid') client.bid(move.bid);
  else if (move.kind === 'play') client.play(move.cardId, move.declaration);
  else client.nextRound();
}

function refusalCount(client: PlayerClient): number {
  return client.connections.reduce((count, connection) => count + connection.ofType(GameEventType.ERROR).length, 0);
}

/**
 * The first player whose screen offers a move makes a seeded one, then the table settles; until
 * `done` holds at a rest or the game ended. The room must accept every move (no ERROR frame).
 */
export async function playOffered(
  table: FullStackTable,
  random: () => number,
  done: () => boolean,
  hooks: PlayHooks = {}
): Promise<void> {
  await table.settle(QUIET);
  for (let moves = 0; ; moves++) {
    hooks.atRest?.();
    if (done() || table.server.game.phase === GamePhase.GAME_END) return;
    if (moves >= MOVE_LIMIT) throw new Error(`still playing after ${MOVE_LIMIT} moves (room in ${table.server.game.phase})`);
    const offers = table.players.map((client) => ({ client, move: offeredMove(client, random) }));
    const mover = offers.find((offer) => offer.move !== null);
    if (!mover?.move) throw new Error(`no screen offers a move while the room is in ${table.server.game.phase}`);
    const step = hooks.choose?.(mover.client, mover.move) ?? { move: mover.move };
    const refusals = refusalCount(mover.client);
    makeMove(mover.client, step.move);
    await table.settle(QUIET);
    expect(refusalCount(mover.client), `the room refused ${mover.client.name}'s offered ${step.move.kind}`).toBe(refusals);
    step.verify?.();
  }
}

export interface BotTableHooks {
  /** Runs at every rest (I1-I6 already held), before the next move; may inject a fault and settle. */
  atRest?: () => Promise<void> | void;
  /** Runs right before a human's move is sent. */
  beforeMove?: () => void;
}

/** Fake time a game with bots may take before the scenario counts as stuck. */
const BOT_TABLE_LIMIT_MS = 60 * 60_000;

/**
 * `playOffered` for tables with bots, to the game's end: at every rest the first human whose
 * screen offers a move makes a seeded one; when no screen offers one, the bots' time passes. Every
 * rest is checked (I1-I6), so a refused move fails at once (I5).
 */
export async function playOfferedWithBots(table: FullStackTable, random: () => number, hooks: BotTableHooks = {}): Promise<void> {
  const deadline = Date.now() + BOT_TABLE_LIMIT_MS;
  await table.settle();
  for (let moves = 0; ; moves++) {
    await hooks.atRest?.();
    if (table.server.game.phase === GamePhase.GAME_END) return;
    if (moves >= MOVE_LIMIT || Date.now() >= deadline) throw new Error(`still playing after ${moves} moves (room in ${table.server.game.phase})`);
    const mover = table.players
      .filter((client) => !client.isClosed)
      .map((client) => ({ client, move: offeredMove(client, random) }))
      .find((offer) => offer.move !== null);
    if (mover?.move) {
      hooks.beforeMove?.();
      makeMove(mover.client, mover.move);
    } else {
      await table.advance(ROOM_TIMING.BOT_ACTION_DELAY_MS);
    }
    await table.settle();
  }
}
