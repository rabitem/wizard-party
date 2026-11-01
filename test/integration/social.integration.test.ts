import { afterEach, describe, expect, it } from 'vitest';
import {
  GameEventType,
  ProtocolErrorCode,
  SOUNDBOARD_SOUND_NAMES,
  TURN_TIMER_LIMITS,
  type IRulesetConfig,
} from '@shared/domain';
import { CONSTANTS } from '@/presentation/config/constants';
import { COMMAND_RATE_LIMITS } from '../../party/config/command-rate-limits.config';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import type { NetworkConditions } from './support/network';
import { NotOfferedError } from './support/offers';
import type { PlayerClient } from './support/player-client';
import { view } from './support/screen-model';

/**
 * What players send each other at the table, as every player's screen shows it: chat and
 * reactions in the feeds (attributed and expiring), the room's social budget as the sender and
 * the others experience it, and the timeout soundboard on a real turn timer. The room's own
 * rules (sanitizing, who receives what, refusals) are owned by party/room/social.test.ts.
 */
const SEED = 31;
const SHAPED: Partial<NetworkConditions> = { latencyMs: 30, jitterMs: 20 };
/** Frames arrive at the moment they are sent, so the room's budget sees the clock the test reads. */
const INSTANT: Partial<NetworkConditions> = { latencyMs: 0, jitterMs: 0 };
const EMOTE_ID = 'wizard';
const SOUND = SOUNDBOARD_SOUND_NAMES[0];
/** Chats sent beyond the budget in one burst. */
const OVERFLOW = 3;

interface ThreeSeats {
  created: FullStackTable;
  ann: PlayerClient;
  ben: PlayerClient;
  cal: PlayerClient;
}

describe('social', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  /** Ann creates the room (and hosts it), Ben and Cal join from browsers of their own. */
  async function threeSeats(network: Partial<NetworkConditions>, rulesetConfig: IRulesetConfig = ruleset({ rounds: 1 })): Promise<ThreeSeats> {
    const created = await FullStackTable.create({ seed: SEED, network });
    table = created;
    const ann = created.open(created.browser(), 'Ann');
    await ann.join({ name: 'Social table', isPublic: false, maxPlayers: 6, rulesetConfig });
    const ben = created.open(created.browser(), 'Ben');
    await ben.join();
    const cal = created.open(created.browser(), 'Cal');
    await cal.join();
    return { created, ann, ben, cal };
  }

  /** The seat the room gave the player called `name` (the room owns seats and names). */
  function seatNamed(created: FullStackTable, name: string) {
    const seat = created.server.game.players.find((player) => player.name === name);
    if (!seat) throw new Error(`the room seats nobody called ${name}`);
    return seat;
  }

  function rateLimited(client: PlayerClient) {
    return client.connections
      .flatMap((connection) => connection.ofType(GameEventType.ERROR))
      .filter((frame) => frame.code === ProtocolErrorCode.RATE_LIMITED);
  }

  const chatTexts = (client: PlayerClient) => view(client).feeds.chatMessages.map((chat) => chat.message);

  it("shows chat and emotes in every other player's feed with the sender's name, and lets them expire", async () => {
    const { created, ann, ben, cal } = await threeSeats(SHAPED);

    ann.chat('Good luck, all');
    ben.emote(EMOTE_ID);
    await created.settle();

    const chat = { playerId: seatNamed(created, 'Ann').id, playerName: 'Ann', message: 'Good luck, all' };
    const emote = { playerId: seatNamed(created, 'Ben').id, playerName: 'Ben', emoteId: EMOTE_ID };
    for (const player of [ann, ben, cal]) {
      const { feeds } = view(player);
      expect(feeds.chatMessages, `${player.name}'s chat`).toEqual([expect.objectContaining(chat)]);
      expect(feeds.emotes, `${player.name}'s reactions`).toEqual([expect.objectContaining(emote)]);
    }

    await created.advance(Math.max(CONSTANTS.SOCIAL.CHAT_DISPLAY_MS, CONSTANTS.SOCIAL.EMOTE_DISPLAY_MS));
    for (const player of [ann, ben, cal]) {
      expect(view(player).feeds.chatMessages, `${player.name}'s chat`).toEqual([]);
      expect(view(player).feeds.emotes, `${player.name}'s reactions`).toEqual([]);
    }
  });

  it("cuts a chat flood at the room's budget: the sender sees the refusal, the others only the allowed messages", async () => {
    const { burst, refillPerSecond } = COMMAND_RATE_LIMITS.social;
    const { created, ann, ben, cal } = await threeSeats(INSTANT);
    ann.expectRefusal(ProtocolErrorCode.RATE_LIMITED);

    const floodAt = Date.now();
    const flood = Array.from({ length: burst + OVERFLOW }, (_, index) => `flood ${index}`);
    for (const text of flood) ann.chat(text);
    await created.settle();

    // Nobody's feed shows a refused message, the sender's own included.
    for (const player of [ann, ben, cal]) expect(chatTexts(player), `${player.name}'s chat`).toEqual(flood.slice(0, burst));
    const refusals = rateLimited(ann);
    expect(refusals).toHaveLength(OVERFLOW);
    expect(ann.notices).toContain(refusals[0].message);
    for (const player of [ben, cal]) expect(player.notices, `${player.name}'s errors`).toEqual([]);

    // The budget belongs to the seat: a new socket does not refill it, only time does.
    ann.dropConnection();
    await created.settle();
    expect(ann.connections).toHaveLength(2);
    const refilled = Math.floor(((Date.now() - floodAt) / 1000) * refillPerSecond);
    expect(refilled, 'the reconnect took long enough to refill the whole budget').toBeLessThan(burst);

    const again = Array.from({ length: burst }, (_, index) => `again ${index}`);
    for (const text of again) ann.chat(text);
    await created.settle();

    for (const player of [ann, ben, cal]) {
      expect(chatTexts(player).filter((text) => text.startsWith('again')), `${player.name}'s chat`).toEqual(again.slice(0, refilled));
    }
    expect(rateLimited(ann)).toHaveLength(OVERFLOW + burst - refilled);
  });

  it('lets others heckle a player only after their turn timer ran out; the target and sender hear it, the target cannot heckle themself', async () => {
    const rules = ruleset({ rounds: 1, biddingTimerSeconds: TURN_TIMER_LIMITS.MIN_SECONDS });
    const { created, ann, ben, cal } = await threeSeats(SHAPED, rules);
    ann.start();
    await created.settle();

    const timer = created.server.game.turnTimerState;
    if (!timer) throw new Error('the rules set a turn timer, but none runs');
    const { playerId: targetId, expiresAt } = timer;
    const players = [ann, ben, cal];
    const targetSeat = created.server.game.getPlayer(targetId);
    const target = players.find((player) => player.name === targetSeat?.name);
    if (!targetSeat || !target) throw new Error(`the timer runs for ${targetId}, who is none of the players`);
    const [sender, bystander] = players.filter((player) => player !== target);

    for (const player of players) {
      expect(() => player.heckle(SOUND), `${player.name} before the timer ran out`).toThrow(NotOfferedError);
    }

    await created.advance(expiresAt - Date.now());
    await created.settle();
    expect(created.server.game.turnTimerState?.expired).toBe(true);
    expect(() => target.heckle(SOUND), `${target.name} at their own expired timer`).toThrow(NotOfferedError);

    sender.heckle(SOUND);
    await created.settle();

    const heard = {
      targetPlayerId: targetId,
      targetPlayerName: targetSeat.name,
      senderPlayerId: seatNamed(created, sender.name).id,
      senderPlayerName: sender.name,
      soundName: SOUND,
    };
    expect(view(target).timeoutSounds).toEqual([expect.objectContaining(heard)]);
    expect(view(sender).timeoutSounds).toEqual([expect.objectContaining(heard)]);
    expect(view(bystander).timeoutSounds).toEqual([]);
  });
});
