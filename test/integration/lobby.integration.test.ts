import { afterEach, describe, expect, it } from 'vitest';
import {
  CardType,
  DEFAULT_RULESET_CONFIG,
  GameAlreadyStartedError,
  GamePhase,
  MaxPlayersReachedError,
  NotHostError,
  PlayerKickedError,
  PlayerNameTakenError,
  ROOM_PLAYER_LIMITS,
  type IPlayer,
  type IRulesetConfig,
} from '@shared/domain';
import type { LobbySeatView } from '@/presentation/components/lobby/table/lobby-view.types';
import { CONNECTION_LIVENESS, RECONNECT_POLICY } from '@/presentation/config/connection.config';
import type { RoomSettings } from '@/presentation/types';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import { NotOfferedError } from './support/offers';
import type { PlayerClient } from './support/player-client';
import { view, type LobbyScreen, type TableScreen } from './support/screen-model';

/**
 * Level 4, the lobby as the players see it: what a refused, kicked or re-hosted player's screen
 * shows, and that every other screen follows the room. Who may take a seat and what only the host
 * may do is owned by the room (party/room/lobby.test.ts); these scenarios add the real clients:
 * their pages, errors, seat tokens and reconnect decisions. Expected values come from the domain's
 * errors and rules or from the room (`server.game`), never from the client under test.
 */

const SEED = 31;
/** Longer than the longest reconnect backoff plus a whole quiet-line probe: any retry would show. */
const LONGER_THAN_ANY_RETRY_MS = RECONNECT_POLICY.MAX_DELAY_MS
  + CONNECTION_LIVENESS.QUIET_MS + CONNECTION_LIVENESS.CHECK_INTERVAL_MS + CONNECTION_LIVENESS.PROBE_TIMEOUT_MS;
const ROOM: RoomSettings = { name: 'Lobby', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: ruleset({ rounds: 3 }) };

interface OpenLobby {
  created: FullStackTable;
  players: PlayerClient[];
}

function lobbyOf(player: PlayerClient): LobbyScreen {
  const { lobby } = view(player);
  if (!lobby) throw new Error(`${player.name}'s screen shows no lobby`);
  return lobby;
}

function tableOf(player: PlayerClient): TableScreen {
  const { table } = view(player);
  if (!table) throw new Error(`${player.name}'s screen shows no table`);
  return table;
}

function seatNames(player: PlayerClient): string[] {
  return lobbyOf(player).seats.map((seat) => seat.name);
}

function seatNamed(player: PlayerClient, name: string): LobbySeatView {
  const seat = lobbyOf(player).seats.find((candidate) => candidate.name === name);
  if (!seat) throw new Error(`${player.name}'s lobby shows no seat named ${name}`);
  return seat;
}

/** The bid a screen shows for a seat (undefined: the seat is not shown at all). */
function bidOf(players: readonly IPlayer[], seatId: string): number | null | undefined {
  return players.find((player) => player.id === seatId)?.bid;
}

/** What a refused joiner's screen shows: the lobby page with the reason, no seat and no table. */
function refusedScreen(roomId: string, error: string) {
  return { page: `/lobby/${roomId}`, error, seatId: null, lobby: null, table: null };
}

describe('lobby', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  /** Each name joins from its own browser; the first creates the room with `settings` and hosts it. */
  async function openLobby(names: string[], settings: Partial<RoomSettings> = {}): Promise<OpenLobby> {
    const created = await FullStackTable.create({ seed: SEED });
    table = created;
    const players: PlayerClient[] = [];
    for (const name of names) {
      const player = created.open(created.browser(), name);
      await player.join(players.length === 0 ? { ...ROOM, ...settings } : undefined);
      players.push(player);
    }
    return { created, players };
  }

  // Regression: the refusal ignored (a joiner shown a table or a seat), or a retry storm because a
  // seatless socket is treated as dead and rejoined again and again.
  it('shows a late joiner why the started game refused them and keeps them off the table', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben']);
    players[0].addBot(2);
    await created.settle();
    players[0].start();
    await created.settle();

    const zoe = created.open(created.browser(), 'Zoe');
    zoe.expectRefusal('GAME_ALREADY_STARTED');
    await zoe.join();

    expect(view(zoe)).toMatchObject(refusedScreen(created.roomId, new GameAlreadyStartedError().message));
    expect(created.server.game.players.map((seat) => seat.name)).not.toContain('Zoe');
    for (const player of players) expect(tableOf(player).game.players.map((seat) => seat.name)).not.toContain('Zoe');
    await created.advance(LONGER_THAN_ANY_RETRY_MS);
    await created.settle();
    expect(zoe.connections).toHaveLength(1);
    expect(view(zoe).status).toBe('connected');
  });

  // Regression: a full room (bots count) seating one more, or the joiner shown the table anyway.
  it('shows a joiner of a full room the refusal and no table', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben'], { maxPlayers: ROOM_PLAYER_LIMITS.MIN });
    players[0].addBot(2);
    await created.settle();

    const zoe = created.open(created.browser(), 'Zoe');
    zoe.expectRefusal('MAX_PLAYERS_REACHED');
    await zoe.join();

    expect(view(zoe)).toMatchObject(refusedScreen(created.roomId, new MaxPlayersReachedError(ROOM_PLAYER_LIMITS.MIN).message));
    for (const player of players) {
      expect(lobbyOf(player).seats).toHaveLength(ROOM_PLAYER_LIMITS.MIN);
      expect(seatNames(player)).not.toContain('Zoe');
    }
  });

  // Regression: a refused join that leaves the browser bound or blocked, so the player cannot take
  // a seat under another name. (The lobby's join form connects again; the harness drives that as
  // a new tab of the same browser.)
  it('lets a joiner whose name is taken pick another name and join from the same browser', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben']);
    const browser = created.browser();
    const impostor = created.open(browser, 'Ben');
    impostor.expectRefusal('PLAYER_NAME_TAKEN');
    await impostor.join();
    expect(view(impostor)).toMatchObject(refusedScreen(created.roomId, new PlayerNameTakenError('Ben').message));
    expect(created.server.game.players.map((seat) => seat.name)).toEqual(['Ann', 'Ben']);

    impostor.closeTab();
    const zoe = created.open(browser, 'Zoe');
    await zoe.join();

    const zoeSeat = created.server.game.players.find((seat) => seat.name === 'Zoe');
    expect(zoe.seatId).toBe(zoeSeat?.id);
    for (const player of [...players, zoe]) expect(seatNames(player)).toEqual(['Ann', 'Ben', 'Zoe']);
  });

  // Regression: a kicked client that reconnects (close 4001 not terminal) or keeps its seat token,
  // or a lobby that still shows the kicked seat.
  it('kicks a player: their screen shows the kick, they stop reconnecting and forget the seat; the others see them gone', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben', 'Cleo']);
    const [ann, ben, cleo] = players;
    ben.expectRefusal(PlayerKickedError.MESSAGE);
    ann.kick('Ben');
    await created.settle();

    expect(view(ben)).toMatchObject({ status: 'kicked', error: PlayerKickedError.MESSAGE });
    expect(ben.profile.seatTokens.load(created.roomId)).toBeUndefined();
    expect(created.server.game.players.map((seat) => seat.name)).toEqual(['Ann', 'Cleo']);
    for (const player of [ann, cleo]) {
      expect(seatNames(player)).toEqual(['Ann', 'Cleo']);
      expect(view(player).feeds.lobbyActivity).toContainEqual(expect.objectContaining({ kind: 'kicked', playerName: 'Ben' }));
    }

    const sockets = ben.connections.length;
    await created.advance(LONGER_THAN_ANY_RETRY_MS);
    await created.settle();
    expect(ben.connections).toHaveLength(sockets);
    expect(view(ben).status).toBe('kicked');
  });

  // Regression: a kicked browser seated again by joining from a new tab. The kick is kept per
  // browser (its reconnect id), so another browser is a new player (product finding 4: observed
  // behaviour, documented here).
  it('refuses a kicked browser that comes back, and seats a new browser under a new name', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben', 'Cleo']);
    const [ann, ben, cleo] = players;
    ben.expectRefusal(PlayerKickedError.MESSAGE);
    ann.kick('Ben');
    await created.settle();

    const benAgain = created.open(ben.profile, 'Ben');
    benAgain.expectRefusal('PLAYER_KICKED');
    await benAgain.join();
    expect(view(benAgain)).toMatchObject(refusedScreen(created.roomId, PlayerKickedError.MESSAGE));
    expect(created.server.game.players.map((seat) => seat.name)).toEqual(['Ann', 'Cleo']);

    const benno = created.open(created.browser(), 'Benno');
    await benno.join();
    for (const player of [ann, cleo, benno]) expect(seatNames(player)).toEqual(['Ann', 'Cleo', 'Benno']);
  });

  // Regression: host rights that stay with the old host's client, or a stale start button whose
  // command the room still applies.
  it("transfers the host: only the new host's client offers start, and the old host's start is refused", async () => {
    const { created, players } = await openLobby(['Ann', 'Ben', 'Cleo']);
    const [ann, ben] = players;
    ann.makeHost('Ben');
    await created.settle();

    for (const player of players) {
      expect(lobbyOf(player).isHost, `${player.name} hosts`).toBe(player === ben);
      expect(seatNamed(player, 'Ben').isHost).toBe(true);
      expect(seatNamed(player, 'Ann').isHost).toBe(false);
    }
    expect(() => ann.start()).toThrow(NotOfferedError);

    // A screen that still shows the start button sends it anyway.
    ann.expectRefusal('NOT_HOST');
    ann.commands.startGame();
    await created.settle();
    expect(created.server.game.phase).toBe(GamePhase.LOBBY);
    expect(view(ann).error).toBe(new NotHostError('start the game').message);

    ben.start();
    await created.settle();
    expect(created.server.game.phase).not.toBe(GamePhase.LOBBY);
    for (const player of players) expect(view(player).page).toBe(`/game/${created.roomId}`);
  });

  // Regression: settings applied to the room (and shown in the lobby) but not to the dealt game:
  // another round count, open bids, or a deck without the chosen special cards.
  it('shows every lobby client a rules change by the host, and the started game plays by those rules', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben']);
    const [ann, ben] = players;
    const changed: IRulesetConfig = {
      ...ruleset({ rounds: 1 }),
      bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true },
      expansions: { ...DEFAULT_RULESET_CONFIG.expansions, specialCards: [CardType.BOMB] },
    };
    const chosen = { structure: { customRoundCount: 1 }, bidding: { hiddenBids: true }, expansions: { specialCards: [CardType.BOMB] } };
    ann.setRules(changed);
    await created.settle();
    for (const player of players) expect(player.state.serverState?.rulesetConfig).toMatchObject(chosen);
    expect(view(ben).feeds.lobbyActivity).toContainEqual(expect.objectContaining({ kind: 'rules', playerName: 'Ann' }));

    ann.addBot(2);
    await created.settle();
    ann.start();
    await created.settle();
    const game = () => created.server.game;
    expect(game().rulesetConfig).toMatchObject(chosen);
    expect(game().maxRounds).toBe(1);

    // Under hidden bids no screen shows another player's bid while the bids are collected.
    let hiddenBids = 0;
    await created.playUntil(() => {
      if (game().phase !== GamePhase.BIDDING) return game().phase === GamePhase.GAME_END;
      for (const player of players) {
        const shown = tableOf(player).game.players;
        for (const seat of game().players) {
          if (seat.id === player.seatId || seat.bid === null) continue;
          hiddenBids += 1;
          expect(bidOf(shown, seat.id), `${player.name} sees ${seat.name}'s bid`).toBeNull();
        }
      }
      return false;
    });
    expect(hiddenBids, 'precondition: a bid was placed while others still had to bid').toBeGreaterThan(0);
    expect(game().currentRound).toBe(1);
    for (const player of players) expect(view(player).page).toBe(`/results/${created.roomId}`);
  });

  // Regression: a ready flag or a bot change that reaches the room but not every lobby screen.
  it('shows ready flags to everyone and adds or removes a bot on every client', async () => {
    const { created, players } = await openLobby(['Ann', 'Ben', 'Cleo']);
    const [ann, ben] = players;

    ben.ready(true);
    await created.settle();
    for (const player of players) {
      expect(seatNamed(player, 'Ben').isReady, `${player.name} sees Ben ready`).toBe(true);
      expect(seatNamed(player, 'Cleo').isReady, `${player.name} sees Cleo not ready`).toBe(false);
    }

    ann.addBot(2);
    await created.settle();
    const bots = created.server.game.players.filter((seat) => seat.isBot).map((seat) => seat.name);
    expect(bots).toHaveLength(1);
    for (const player of players) {
      expect(lobbyOf(player).seats.filter((seat) => seat.isBot).map((seat) => seat.name)).toEqual(bots);
    }

    ann.removeBot(bots[0]);
    ben.ready(false);
    await created.settle();
    for (const player of players) {
      expect(seatNames(player)).toEqual(['Ann', 'Ben', 'Cleo']);
      expect(seatNamed(player, 'Ben').isReady).toBe(false);
    }
  });
});
