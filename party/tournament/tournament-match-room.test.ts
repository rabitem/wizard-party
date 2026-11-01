import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientCommandType, GameEventType, GamePhase, PROTOCOL_VERSION, TOURNAMENT_GAME_ERROR_CODES } from '../../shared/domain';
import { matchIdFor } from '../../shared/domain/tournament';
import { matchPersistentId, matchRoom, seat, ticketJoin } from '../test-support/match-driver';
import type { TestConnection } from '../test-support/room-harness';
import { refusalCodesOf } from '../test-support/table-driver';
import { TOURNAMENT_MATCH_STORAGE_KEY } from './match-room.constants';
import { TEST_LABEL, TEST_NOW, TEST_ROOM, TEST_TOURNAMENT_ID, settle, ticketClaims } from './tournament-test-support';
import { TOURNAMENTS_UNAVAILABLE } from './tournament-match-services';

const { TICKET_REQUIRED, TICKET_INVALID, MATCH_LOCKED, UNAVAILABLE } = TOURNAMENT_GAME_ERROR_CODES;

describe('tournament match room: admission and lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('join', () => {
    it('should refuse a join without a ticket and seat nobody', async () => {
      const { h } = await matchRoom();
      const socket = h.connect();

      await ticketJoin(h, socket, 'aaaaaaa');

      expect(refusalCodesOf(socket)).toEqual([TICKET_REQUIRED]);
      expect(h.game.players).toHaveLength(0);
    });

    it('should refuse every join when the worker has no tournament secret', async () => {
      const { h } = await matchRoom({ services: TOURNAMENTS_UNAVAILABLE });
      const socket = h.connect();

      await ticketJoin(h, socket, 'aaaaaaa', 'v1.anything.signed');

      expect(refusalCodesOf(socket)).toEqual([UNAVAILABLE]);
      expect(h.game.players).toHaveLength(0);
    });

    it('should refuse forged tickets and tickets for another room', async () => {
      const { h, tickets } = await matchRoom();
      const forged = h.connect();
      const elsewhere = h.connect();

      await ticketJoin(h, forged, 'aaaaaaa', 'v1.forged.ticket');
      await ticketJoin(h, elsewhere, 'bbbbbbb', tickets.issue(ticketClaims('user-b', { matchId: matchIdFor(TEST_TOURNAMENT_ID, 3, 1) })));

      expect(refusalCodesOf(forged)).toEqual([TICKET_INVALID]);
      expect(refusalCodesOf(elsewhere)).toEqual([TICKET_INVALID]);
      expect(h.storage.data.has(TOURNAMENT_MATCH_STORAGE_KEY)).toBe(false);
    });

    it('should refuse a ticketed join in a casual room', async () => {
      const { h, tickets } = await matchRoom({ roomId: 'ABCD' });
      const socket = h.connect();

      await ticketJoin(h, socket, 'aaaaaaa', tickets.issue(ticketClaims('user-a')));

      expect(refusalCodesOf(socket)).toEqual([TICKET_INVALID]);
      expect(h.game.players).toHaveLength(0);
    });
  });

  describe('lock', () => {
    it('should lock the room to the first ticket: private, sized, ruled and named by the match', async () => {
      const room = await matchRoom();
      const { h } = room;
      const claims = ticketClaims('user-a', { bots: 1 });

      const socket = await seat(room, 'aaaaaaa', claims);

      const settings = socket.lastState()?.roomSettings;
      expect(settings).toMatchObject({ isPublic: false, maxPlayers: 4 });
      // Room names are capped; the full label travels in the tournament state.
      expect(TEST_LABEL.startsWith(settings?.name ?? '-')).toBe(true);
      expect(h.game.rulesetConfig.structure.customRoundCount).toBe(1);
      expect(h.game.players.map((player) => player.name)).toEqual(['Merlin']);
      expect(h.storage.data.get(TOURNAMENT_MATCH_STORAGE_KEY)).toMatchObject({ mid: claims.mid, firstJoinAt: TEST_NOW });
      expect(refusalCodesOf(socket)).toEqual([]);
    });

    it('should send the waiting roster with the game state and never an account id', async () => {
      const room = await matchRoom();
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      const message = merlin.ofType(GameEventType.GAME_STATE).at(-1);

      // Sent beside the game state, where the connection hook reads it.
      expect(message?.state).not.toHaveProperty('tournamentMatch');
      expect(message?.tournamentMatch).toMatchObject({
        tournamentId: TEST_TOURNAMENT_ID,
        label: TEST_LABEL,
        round: 2,
        table: 1,
        roster: [
          { name: 'Morgana', seat: 0, joined: false, noShow: false },
          { name: 'Merlin', seat: 1, joined: true, noShow: false },
          { name: 'Nimue', seat: 2, joined: false, noShow: false },
        ],
        autoStartAt: null,
        reported: false,
        reportOutcome: null,
        // Tickets from before the deadline was part of the descriptor still work.
        deadlineAt: null,
        expired: false,
      });
      expect(JSON.stringify(merlin.sent)).not.toContain('user-');
    });

    it('should seat each member under the name of their ticket', async () => {
      const room = await matchRoom();

      await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      await seat(room, 'bbbbbbb', ticketClaims('user-b'));

      expect(room.h.game.players.map((player) => player.name)).toEqual(['Merlin', 'Morgana']);
    });
  });

  describe('reconnects', () => {
    it('should give a second device of the same account the same seat', async () => {
      const room = await matchRoom();
      await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      const playerId = room.h.game.players[0].id;

      const phone = await seat(room, 'ppppppp', ticketClaims('user-a'));

      expect(room.h.game.players.map((player) => player.id)).toEqual([playerId]);
      expect(phone.lastState()?.players.map((player) => player.name)).toEqual(['Merlin']);
      expect(refusalCodesOf(phone)).toEqual([]);
    });

    it('should let the ticket take a token-protected seat back on another device (protocol 2)', async () => {
      const { h, tickets } = await matchRoom();
      const joinV2 = (socket: TestConnection, suffix: string) => h.send(socket, {
        type: ClientCommandType.JOIN_GAME,
        playerName: 'x',
        persistentId: matchPersistentId(suffix),
        protocolVersion: PROTOCOL_VERSION,
        tournamentTicket: tickets.issue(ticketClaims('user-a')),
      });
      const laptop = h.connect();
      joinV2(laptop, 'aaaaaaa');
      await settle();
      const seatId = h.game.players[0].id;
      const session = laptop.session();

      const phone = h.connect();
      joinV2(phone, 'ppppppp');
      await settle();

      // The seat id is opaque (never the browser id), and the ticket alone proves the account.
      expect(session).toMatchObject({ playerId: seatId });
      expect(seatId).not.toBe(matchPersistentId('aaaaaaa'));
      expect(refusalCodesOf(phone)).toEqual([]);
      expect(phone.ofType(GameEventType.GAME_STATE).at(-1)?.yourPlayerId).toBe(seatId);
      expect(h.game.players).toHaveLength(1);
      expect(laptop.closed).not.toBeNull();
    });

    it('should let a seat holder back in with an expired ticket, but never without one', async () => {
      const room = await matchRoom();
      const { h } = room;
      const claims = ticketClaims('user-a', { exp: TEST_NOW + 1_000 });
      const first = await seat(room, 'aaaaaaa', claims);
      const expired = room.tickets.issue(claims);
      h.drop(first);
      vi.setSystemTime(TEST_NOW + 2_000);

      const withoutTicket = h.connect();
      await ticketJoin(h, withoutTicket, 'aaaaaaa');
      const withExpiredTicket = h.connect();
      await ticketJoin(h, withExpiredTicket, 'aaaaaaa', expired);

      expect(refusalCodesOf(withoutTicket)).toEqual([TICKET_REQUIRED]);
      expect(refusalCodesOf(withExpiredTicket)).toEqual([]);
      expect(h.game.players).toHaveLength(1);
    });

    it('should seat nobody new with an expired ticket', async () => {
      const room = await matchRoom();
      const { h } = room;
      await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      const expired = room.tickets.issue(ticketClaims('user-b', { exp: TEST_NOW - 1 }));

      const late = h.connect();
      await ticketJoin(h, late, 'bbbbbbb', expired);

      expect(refusalCodesOf(late)).toEqual([TICKET_INVALID]);
      expect(h.game.players.map((player) => player.name)).toEqual(['Merlin']);
    });

    it("should never let a tablemate take another member's seat by its public player id", async () => {
      const room = await matchRoom();
      const { h } = room;
      const merlin = await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      await seat(room, 'bbbbbbb', ticketClaims('user-b'));
      const merlinId = h.game.players.find((player) => player.name === 'Merlin')!.id;

      // Morgana opens a second socket and claims Merlin's id, with no ticket or a garbage one.
      const hijack = h.connect();
      h.send(hijack, { type: ClientCommandType.JOIN_GAME, playerName: 'x', persistentId: merlinId });
      h.send(hijack, { type: ClientCommandType.JOIN_GAME, playerName: 'x', persistentId: merlinId, tournamentTicket: 'v1.forged.ticket' });
      await vi.runAllTimersAsync();

      expect(refusalCodesOf(hijack)).toEqual([TICKET_REQUIRED, TICKET_INVALID]);
      expect(merlin.closed).toBeNull();
      expect(h.game.players).toHaveLength(2);
    });

    it('should run the moves a socket sends while its ticket is being checked after the join', async () => {
      const { h, tickets } = await matchRoom();
      const socket = h.connect();

      h.send(socket, {
        type: ClientCommandType.JOIN_GAME,
        playerName: 'x',
        persistentId: matchPersistentId('aaaaaaa'),
        tournamentTicket: tickets.issue(ticketClaims('user-a')),
      });
      // Sent right behind the JOIN, as a reconnecting client flushes its queued commands.
      h.send(socket, { type: ClientCommandType.SEND_CHAT, message: 'back again' });
      await vi.runAllTimersAsync();

      expect(refusalCodesOf(socket)).toEqual([]);
      expect(socket.ofType(GameEventType.CHAT_MESSAGE)).not.toHaveLength(0);
    });

    it("should never hand one member's seat to another account using the same browser", async () => {
      const room = await matchRoom();
      await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      const other = await seat(room, 'aaaaaaa', ticketClaims('user-b'));

      expect(refusalCodesOf(other)).toEqual([TICKET_INVALID]);
      expect(room.h.game.players.map((player) => player.name)).toEqual(['Merlin']);
    });

    it('should drop a join whose socket closed while the ticket was checked', async () => {
      const { h, tickets } = await matchRoom();
      const socket = h.connect();

      h.send(socket, {
        type: ClientCommandType.JOIN_GAME,
        playerName: 'x',
        persistentId: matchPersistentId('aaaaaaa'),
        tournamentTicket: tickets.issue(ticketClaims('user-a')),
      });
      h.drop(socket);
      await vi.runAllTimersAsync();

      expect(h.game.players).toHaveLength(0);
    });
  });

  describe('locked commands', () => {
    it.each([
      [ClientCommandType.SET_ROOM_SETTINGS, { roomSettings: { name: 'Mine', isPublic: true, maxPlayers: 6 } }],
      [ClientCommandType.SET_RULESET, { rulesetConfig: {} }],
      [ClientCommandType.ADD_BOT, {}],
      [ClientCommandType.REMOVE_BOT, { botId: 'bot-1' }],
      [ClientCommandType.KICK_PLAYER, { playerId: 'someone' }],
      [ClientCommandType.TRANSFER_HOST, { playerId: 'someone' }],
      [ClientCommandType.START_GAME, {}],
      [ClientCommandType.REQUEST_REMATCH, {}],
    ])('should refuse %s', async (type, fields) => {
      const room = await matchRoom();
      const host = await seat(room, 'aaaaaaa', ticketClaims('user-a'));
      host.clear();

      room.h.send(host, { type, ...fields });

      expect(refusalCodesOf(host)).toEqual([MATCH_LOCKED]);
      expect(room.h.game.phase).toBe(GamePhase.LOBBY);
      expect(room.h.game.players).toHaveLength(1);
    });

    it('should keep chat and emotes working', async () => {
      const room = await matchRoom();
      const host = await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      room.h.send(host, { type: ClientCommandType.SEND_CHAT, message: 'good luck' });

      expect(refusalCodesOf(host)).toEqual([]);
      expect(host.ofType(GameEventType.CHAT_MESSAGE)).not.toHaveLength(0);
    });
  });

  describe('public room info', () => {
    it('should report a match room as unavailable with its caption only', async () => {
      const room = await matchRoom();
      await seat(room, 'aaaaaaa', ticketClaims('user-a'));

      const response = await room.h.server.onRequest(new Request(`https://worker.test/parties/main/${TEST_ROOM}`));
      const body = await response.json() as Record<string, unknown>;

      expect(body).toMatchObject({ roomId: TEST_ROOM, isAvailable: false, roomName: TEST_LABEL, tournament: { label: TEST_LABEL } });
      expect(JSON.stringify(body)).not.toContain('user-');
    });

    it('should report an untouched match room as unavailable too', async () => {
      const { h } = await matchRoom();

      const response = await h.server.onRequest(new Request(`https://worker.test/parties/main/${TEST_ROOM}`));

      expect(await response.json()).toMatchObject({ isAvailable: false, tournament: null });
    });
  });
});
