/**
 * The room side of the lobby on the real GameRoom: who may take a seat (the owner of join
 * refusals), what only the host may do, kicks, host transfer, ready flags, bots and where the
 * room's rules live.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClientCommandType,
  ConnectionCloseReason,
  DEFAULT_RULESET_CONFIG,
  GameEventType,
  GamePhase,
  PROTOCOL_VERSION,
  ROOM_PLAYER_LIMITS,
} from '../../shared/domain';
import { HARNESS_START_TIME, persistentIdOf, type RoomHarness } from '../test-support/room-harness';
import { lobby, refusalOf, ruleset, type LobbySettings, type Table } from '../test-support/table-driver';

/** The close code a kicked socket gets (wire protocol). */
const KICKED_CLOSE_CODE = 4001;

describe('lobby', () => {
  const harnesses: RoomHarness[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const harness of harnesses.splice(0)) harness.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function open(humans: string[], settings: LobbySettings = {}): Promise<Table> {
    const table = await lobby(humans, settings);
    harnesses.push(table.h);
    return table;
  }

  describe('room settings', () => {
    it("creates the room with the first joiner's settings and ignores settings sent by later joiners", async () => {
      const h = (await open([])).h;
      const hana = h.join('Hana', 'hana', {
        roomSettings: {
          name: 'Rules Room',
          isPublic: false,
          maxPlayers: ROOM_PLAYER_LIMITS.MIN - 1,
          rulesetConfig: {
            ...DEFAULT_RULESET_CONFIG,
            card: { ...DEFAULT_RULESET_CONFIG.card, lastWizardWins: true },
            bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true },
            scoring: { baseBidPoints: 35, pointsPerTrick: 'ten', penaltyPerMiss: 7 },
            structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: 7 },
          },
        },
      });
      const pia = h.join('Pia', 'pia', {
        roomSettings: { name: 'Hijack', isPublic: true, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: ruleset({ rounds: 9 }) },
      });

      for (const socket of [hana, pia]) {
        const state = socket.lastState();
        expect(state?.roomSettings).toEqual({ name: 'Rules Room', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MIN });
        expect(state?.rulesetConfig?.card.lastWizardWins).toBe(true);
        expect(state?.rulesetConfig?.bidding.hiddenBids).toBe(true);
        expect(state?.rulesetConfig?.scoring).toEqual({
          baseBidPoints: 35,
          pointsPerTrick: DEFAULT_RULESET_CONFIG.scoring.pointsPerTrick,
          penaltyPerMiss: 7,
        });
        expect(state?.rulesetConfig?.structure.customRoundCount).toBe(7);
      }
    });

    it("applies the host's changes, normalized, to the room and to its rules", async () => {
      const { h, sockets } = await open(['Hana', 'Pia']);

      h.send(sockets.Hana, {
        type: ClientCommandType.SET_ROOM_SETTINGS,
        roomSettings: {
          name: '  Host Room  ',
          isPublic: true,
          maxPlayers: ROOM_PLAYER_LIMITS.MAX + 93,
          rulesetConfig: { scoring: { baseBidPoints: 35 }, structure: { customRoundCount: 200, descendingRounds: true } },
        },
      });

      const state = sockets.Pia.lastState();
      expect(state?.roomSettings).toEqual({ name: 'Host Room', isPublic: true, maxPlayers: ROOM_PLAYER_LIMITS.MAX });
      expect(state?.rulesetConfig?.scoring.baseBidPoints).toBe(35);
      expect(state?.rulesetConfig?.structure).toEqual({
        customRoundCount: DEFAULT_RULESET_CONFIG.structure.customRoundCount,
        descendingRounds: true,
      });
    });

    it('keeps room and game rules in one place: a lobby change is what the dealt game uses, also after a restart', async () => {
      const { h, sockets } = await open(['Hana', 'Pia', 'Otto']);
      const tokens = Object.entries(sockets).map(([name, socket]) => [name, socket.session()?.sessionToken] as const);

      h.send(sockets.Hana, { type: ClientCommandType.SET_RULESET, rulesetConfig: ruleset({ rounds: 1 }) });
      // A settings change without rules must not bring back the rules the room was created with.
      h.send(sockets.Hana, { type: ClientCommandType.SET_ROOM_SETTINGS, roomSettings: { name: 'Renamed' } });
      expect(sockets.Pia.lastState()?.rulesetConfig?.structure.customRoundCount).toBe(1);

      const restarted = await h.restart();
      harnesses.push(restarted);
      const [host, ...others] = tokens.map(([name, sessionToken]) => restarted.join(name, name.toLowerCase(), { sessionToken }));
      restarted.send(host, { type: ClientCommandType.START_GAME });

      for (const socket of [host, ...others]) {
        expect(socket.lastState()).toMatchObject({ maxRounds: 1, roomSettings: { name: 'Renamed' } });
        expect(socket.lastState()?.rulesetConfig?.structure.customRoundCount).toBe(1);
      }
    });
  });

  describe('joining', () => {
    interface JoinRefusal {
      label: string;
      /** What happens in a lobby of Hana (host), Pia and Otto that holds four. */
      arrange: (table: Table) => void;
      playerName: string;
      /** The joining browser. */
      suffix: string;
      code: string;
    }

    const REFUSALS: JoinRefusal[] = [
      {
        label: 'a newcomer once the game started',
        arrange: ({ h, sockets }) => h.send(sockets.Hana, { type: ClientCommandType.START_GAME }),
        playerName: 'Zoe',
        suffix: 'zoe',
        code: 'GAME_ALREADY_STARTED',
      },
      {
        label: 'a newcomer to a full room, bots included',
        arrange: ({ h, sockets }) => h.send(sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 }),
        playerName: 'Zoe',
        suffix: 'zoe',
        code: 'MAX_PLAYERS_REACHED',
      },
      { label: 'a name already seated, in any case', arrange: () => undefined, playerName: 'HANA', suffix: 'zoe', code: 'PLAYER_NAME_TAKEN' },
      { label: 'a blank name', arrange: () => undefined, playerName: '   ', suffix: 'zoe', code: 'INVALID_PLAYER_NAME' },
      {
        label: 'a browser the host removed',
        arrange: ({ h, sockets }) => h.send(sockets.Hana, { type: ClientCommandType.KICK_PLAYER, playerId: h.seatOf(sockets.Pia) }),
        playerName: 'Pia',
        suffix: 'pia',
        code: 'PLAYER_KICKED',
      },
    ];

    it.each(REFUSALS)('refuses $label with its code and the requestId, and seats nobody', async ({ arrange, playerName, suffix, code }) => {
      const table = await open(['Hana', 'Pia', 'Otto'], { maxPlayers: 4 });
      arrange(table);
      const seated = table.h.game.players.length;

      const socket = table.h.connect();
      table.h.send(socket, {
        type: ClientCommandType.JOIN_GAME,
        playerName,
        persistentId: persistentIdOf(suffix),
        protocolVersion: PROTOCOL_VERSION,
        requestId: 'req-join',
      });

      expect(refusalOf(socket)).toEqual({ message: expect.any(String), code, requestId: 'req-join' });
      expect(socket.ofType(GameEventType.SESSION)).toHaveLength(0);
      expect(socket.ofType(GameEventType.GAME_STATE)).toHaveLength(0);
      expect(table.h.game.players).toHaveLength(seated);
    });

    it('kicks: closes the socket with 4001, removes the seat from every snapshot and refuses the same browser', async () => {
      const { h, sockets } = await open(['Hana', 'Pia', 'Otto']);
      const pia = h.seatOf(sockets.Pia);
      const token = sockets.Pia.session()?.sessionToken;

      h.send(sockets.Hana, { type: ClientCommandType.KICK_PLAYER, playerId: pia });

      // The kicked player learns why before the socket closes, and hears nothing after.
      expect(sockets.Pia.messages().at(-1)).toMatchObject({ type: GameEventType.PLAYER_KICKED, playerId: pia });
      expect(sockets.Pia.closed).toEqual({ code: KICKED_CLOSE_CODE, reason: ConnectionCloseReason.KICKED });
      for (const socket of [sockets.Hana, sockets.Otto]) {
        expect(socket.lastState()?.players.map((p) => p.id)).not.toContain(pia);
      }
      h.send(sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      expect(sockets.Pia.messages().at(-1)?.type).toBe(GameEventType.PLAYER_KICKED);

      const again = h.join('Pia', 'pia', { sessionToken: token });
      expect(refusalOf(again)?.code).toBe('PLAYER_KICKED');
      expect(h.game.players.map((p) => p.name)).not.toContain('Pia');
    });
  });

  describe('host', () => {
    interface SeatIds {
      otto: string;
      bot: string;
    }

    interface HostOnlyCommand {
      type: ClientCommandType;
      fields: (ids: SeatIds) => Record<string, unknown>;
      /** The domain code of the refusal; null for a plain refusal (the client gets no code). */
      code: string | null;
    }

    const HOST_ONLY: HostOnlyCommand[] = [
      { type: ClientCommandType.KICK_PLAYER, fields: (ids) => ({ playerId: ids.otto }), code: 'NOT_HOST' },
      { type: ClientCommandType.TRANSFER_HOST, fields: (ids) => ({ playerId: ids.otto }), code: 'NOT_HOST' },
      { type: ClientCommandType.ADD_BOT, fields: () => ({ difficulty: 2 }), code: 'NOT_HOST' },
      { type: ClientCommandType.REMOVE_BOT, fields: (ids) => ({ botId: ids.bot }), code: 'NOT_HOST' },
      { type: ClientCommandType.START_GAME, fields: () => ({}), code: 'NOT_HOST' },
      { type: ClientCommandType.SET_RULESET, fields: () => ({ rulesetConfig: ruleset({ rounds: 5 }) }), code: null },
      { type: ClientCommandType.SET_ROOM_SETTINGS, fields: () => ({ roomSettings: { name: 'Mine' } }), code: null },
    ];

    it.each(HOST_ONLY)('refuses $type from a non-host and changes nothing', async ({ type, fields, code }) => {
      const { h, sockets } = await open(['Hana', 'Pia', 'Otto']);
      h.send(sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      const bot = h.game.players.find((p) => p.isBot)?.id ?? '';
      const before = h.game.toJSON();
      const hostFrames = sockets.Hana.sent.length;

      h.send(sockets.Pia, { type, ...fields({ otto: h.seatOf(sockets.Otto), bot }), requestId: 'req-host' });

      expect(refusalOf(sockets.Pia)).toMatchObject({ requestId: 'req-host', ...(code ? { code } : {}) });
      expect(h.game.toJSON()).toEqual(before);
      expect(sockets.Hana.sent).toHaveLength(hostFrames);
    });

    it('transfers the host and lets only the new host start', async () => {
      const { h, sockets } = await open(['Hana', 'Pia', 'Otto']);
      const pia = h.seatOf(sockets.Pia);

      h.send(sockets.Hana, { type: ClientCommandType.TRANSFER_HOST, playerId: pia });

      for (const socket of Object.values(sockets)) {
        expect(socket.ofType(GameEventType.HOST_CHANGED).at(-1)).toMatchObject({ hostId: pia });
        expect(socket.lastState()?.hostId).toBe(pia);
      }
      h.send(sockets.Hana, { type: ClientCommandType.START_GAME, requestId: 'req-old-host' });
      expect(refusalOf(sockets.Hana)).toMatchObject({ code: 'NOT_HOST', requestId: 'req-old-host' });
      expect(h.game.phase).toBe(GamePhase.LOBBY);

      h.send(sockets.Pia, { type: ClientCommandType.START_GAME });
      expect(sockets.Otto.lastState()?.phase).not.toBe(GamePhase.LOBBY);
    });
  });

  describe('seats', () => {
    it('broadcasts ready flags and treats bots as ready', async () => {
      const { h, sockets } = await open(['Hana', 'Pia']);
      const pia = h.seatOf(sockets.Pia);
      const seen = () => sockets.Hana.lastState()?.players ?? [];
      h.send(sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      expect(seen().find((p) => p.isBot)?.isReady).toBe(true);
      expect(seen().find((p) => p.id === pia)?.isReady).toBe(false);

      h.send(sockets.Pia, { type: ClientCommandType.SET_READY, ready: true });
      expect(seen().find((p) => p.id === pia)?.isReady).toBe(true);

      // Saying it again changes nothing, so nothing is broadcast.
      const snapshots = sockets.Hana.ofType(GameEventType.GAME_STATE).length;
      h.send(sockets.Pia, { type: ClientCommandType.SET_READY, ready: true });
      expect(sockets.Hana.ofType(GameEventType.GAME_STATE)).toHaveLength(snapshots);

      h.send(sockets.Pia, { type: ClientCommandType.SET_READY, ready: false });
      expect(seen().find((p) => p.id === pia)?.isReady).toBe(false);
    });

    it('removes a bot and frees its seat for a joiner', async () => {
      const { h, sockets } = await open(['Hana', 'Pia'], { maxPlayers: ROOM_PLAYER_LIMITS.MIN });
      h.send(sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      const bot = h.game.players.find((p) => p.isBot)?.id ?? '';
      expect(refusalOf(h.join('Zoe', 'zoe'))?.code).toBe('MAX_PLAYERS_REACHED');

      h.send(sockets.Hana, { type: ClientCommandType.REMOVE_BOT, botId: bot });

      expect(sockets.Pia.ofType(GameEventType.PLAYER_LEFT).at(-1)).toMatchObject({ playerId: bot });
      expect(sockets.Pia.lastState()?.players.map((p) => p.id)).not.toContain(bot);
      const zoe = h.join('Zoe', 'zoe');
      expect(refusalOf(zoe)).toBeNull();
      expect(sockets.Pia.lastState()?.players.map((p) => p.name)).toEqual(['Hana', 'Pia', 'Zoe']);
    });
  });
});
