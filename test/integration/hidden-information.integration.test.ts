import { afterEach, describe, expect, it } from 'vitest';
import {
  GameEventType,
  GamePhase,
  PlayerKickedError,
  ROOM_PLAYER_LIMITS,
  SPECIAL_CARD_TYPES,
  type IGameState,
  type IRulesetConfig,
  type SpecialCardType,
} from '@shared/domain';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import { expectNoLeaks } from './support/invariants';
import type { PlayerClient } from './support/player-client';

/**
 * What each player may see (retention bar): one whole-game sweep per table configuration, then
 * every frame every connection was ever sent is scanned (I1 of support/invariants.ts, plus the
 * reconnect ids and the bid events below). Reconnect and restart snapshots are part of the scan,
 * because the scan reads every connection a client opened.
 */
const SEED = 19;
const ROUNDS = 3;

interface TableConfig {
  label: string;
  humans: string[];
  bots: number;
  hiddenBids: boolean;
  specialCards: readonly SpecialCardType[];
  /** A further human who joins the lobby and is kicked by the host before the start. */
  kicked?: string;
  /** One player's connection drops mid-trick, and the room restarts while bids are being collected. */
  faults?: boolean;
}

const CONFIGS: TableConfig[] = [
  { label: 'base deck, three humans', humans: ['Ann', 'Ben', 'Cid'], bots: 0, hiddenBids: false, specialCards: [] },
  {
    label: 'every special card, four humans and two bots, hidden bids, a kicked player',
    humans: ['Ann', 'Ben', 'Cid', 'Dee'],
    bots: 2,
    hiddenBids: true,
    specialCards: SPECIAL_CARD_TYPES,
    kicked: 'Eve',
  },
  {
    label: 'hidden bids with a mid-trick reconnect and a room restart',
    humans: ['Ann', 'Ben', 'Cid'],
    bots: 0,
    hiddenBids: true,
    specialCards: SPECIAL_CARD_TYPES,
    faults: true,
  },
];

function rulesOf(config: TableConfig): IRulesetConfig {
  const base = ruleset({ rounds: ROUNDS });
  return {
    ...base,
    bidding: { ...base.bidding, hiddenBids: config.hiddenBids },
    expansions: { specialCards: [...config.specialCards] },
  };
}

/** A browser's reconnect id lets it rejoin as its seat: no other browser is ever sent it (a kicked one included). */
function expectNoForeignReconnectIds(clients: readonly PlayerClient[]): void {
  for (const client of clients) {
    const foreign = clients.map((other) => other.profile.persistentId).filter((id) => id !== client.profile.persistentId);
    for (const frame of client.connections.flatMap((connection) => connection.messages())) {
      const raw = JSON.stringify(frame);
      const carried = foreign.filter((id) => raw.includes(`"${id}"`));
      expect(carried, `${client.name} ${frame.type} carries another browser's reconnect id`).toEqual([]);
    }
  }
}

/**
 * Under hidden bids a seat learns another seat's bid only once every seat has bid: a bid event for
 * another seat is only ever followed by a snapshot in which every bid is placed.
 */
function expectBidEventsWithheld(clients: readonly PlayerClient[]): void {
  for (const client of clients) {
    for (const connection of client.connections) {
      const seat = connection.session()?.playerId;
      const frames = connection.messages();
      frames.forEach((frame, index) => {
        if (frame.type !== GameEventType.BID_PLACED || frame.playerId === seat) return;
        const next = frames.slice(index + 1).find((later) => later.type === GameEventType.GAME_STATE);
        const bids = next ? (next.state as IGameState).players.map((player) => player.bid) : [];
        expect(bids.includes(null), `${client.name} was told ${String(frame.playerId)}'s bid while bids were hidden`).toBe(false);
      });
    }
  }
}

async function kickFromLobby(table: FullStackTable, host: PlayerClient, name: string): Promise<void> {
  const guest = table.open(table.browser(), name);
  await guest.join();
  const seat = guest.seatId ?? '';
  guest.expectRefusal(PlayerKickedError.MESSAGE);
  host.kick(name);
  await table.settle();
  expect(table.server.game.isPlayerKicked(seat), 'precondition: the room keeps a kick list').toBe(true);
}

async function dropMidTrickThenRestart(table: FullStackTable, victim: PlayerClient): Promise<void> {
  const game = () => table.server.game;
  await table.playUntil(() => game().phase === GamePhase.PLAYING && (game().currentTrick?.cards.length ?? 0) > 0);
  const victimSockets = victim.connections.length;
  victim.dropConnection();
  await table.settle();
  expect(victim.connections.length, 'precondition: the dropped player reconnected mid-trick').toBeGreaterThan(victimSockets);

  await table.playUntil(() => game().currentRound === 2 && game().phase === GamePhase.BIDDING && game().getBidsPlaced() > 0);
  const sockets = new Map(table.players.map((player) => [player, player.connections.length]));
  await table.restartRoom();
  await table.settle();
  const stale = table.players.filter((player) => player.connections.length <= (sockets.get(player) ?? 0)).map((player) => player.name);
  expect(stale, 'precondition: every player reconnected to the restarted room mid-bidding').toEqual([]);
}

describe('hidden information over the wire', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  it.each(CONFIGS)('never sends a player another hand, a token, the kick list or a hidden bid ($label)', { timeout: 120_000 }, async (config) => {
    const created = await FullStackTable.create({ seed: SEED, network: { latencyMs: 30, jitterMs: 20 } });
    table = created;
    const players = config.humans.map((name) => created.open(created.browser(), name));
    const [host, ...guests] = players;
    await host.join({ name: 'Secret table', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: rulesOf(config) });
    for (const guest of guests) await guest.join();
    if (config.kicked) await kickFromLobby(created, host, config.kicked);
    for (let bot = 0; bot < config.bots; bot++) host.addBot();
    await created.settle();
    host.start();
    if (config.faults) await dropMidTrickThenRestart(created, guests[0]);
    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);

    expectNoLeaks(created.players);
    expectNoForeignReconnectIds(created.players);
    if (config.hiddenBids) expectBidEventsWithheld(created.players);
  });
});
