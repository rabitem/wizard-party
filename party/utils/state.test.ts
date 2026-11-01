import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Party from '../runtime';

import {
  DEFAULT_CUSTOM_SOUND_CATEGORY,
  DEFAULT_RULESET_CONFIG,
  Game,
  GamePhase,
  Player,
  type IRoomSettings,
  type SoundPreferences,
} from '../../shared/domain';
import { ProcessedCommandLog } from '../protocol/processed-commands';
import { loadState, toPersistedState } from './state';
import { PERSISTED_SCHEMA_VERSION, type LegacyPersistedState, type StoredState } from './types';

const BASE_TIME = 1_700_000_000_000;
const ROOM_SETTINGS: IRoomSettings = { name: 'persisted-room', isPublic: true, maxPlayers: 6 };

class MockStorage {
  constructor(private readonly stored: StoredState) {}

  get<T>(): Promise<T> {
    return Promise.resolve(this.stored as T);
  }
}

class MockRoom {
  readonly id = 'persisted-room';
  readonly storage: MockStorage;

  constructor(stored: StoredState) {
    this.storage = new MockStorage(stored);
  }
}

function persistentId(suffix: string): string {
  return `player-${BASE_TIME}-${suffix}`;
}

function load(stored: StoredState, defaults: IRoomSettings = ROOM_SETTINGS) {
  return loadState(new MockRoom(stored) as unknown as Party.Room, defaults);
}

/** What schema 1 wrote for a game: players, host, pause and ruleset also stored beside it. */
function legacyStored(game: Game, overrides: Partial<LegacyPersistedState> = {}): LegacyPersistedState {
  return {
    gameState: game.toJSON(),
    persistentIdToPlayerId: game.players.filter((player) => !player.isBot).map((player): [string, string] => [player.id, player.id]),
    roomSettings: ROOM_SETTINGS,
    botCounter: 0,
    players: game.players.map((player) => player.toJSON()),
    hostId: game.hostId,
    pauseState: game.pauseState,
    playerSoundPreferences: [],
    rulesetConfig: game.rulesetConfig,
    ...overrides,
  };
}

describe('Persisted state loading', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores lobby grace states from persisted game state', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);

    const playerId = persistentId('aaaaaaa');
    const game = new Game('persisted-room', playerId);
    game.addPlayer(new Player(playerId, 'Alice'));
    game.gracePlayer(playerId);

    const result = await load(legacyStored(game));

    expect(result.game.isPlayerGraced(playerId)).toBe(true);
    expect(result.game.getGraceState(playerId)?.playerName).toBe('Alice');
  });

  it('restores custom rulesets for active games without resetting the room', async () => {
    const aliceId = persistentId('aaaaaaa');
    const game = new Game('persisted-room', aliceId);
    game.addPlayer(new Player(aliceId, 'Alice'));
    game.addPlayer(new Player(persistentId('bbbbbbb'), 'Bob'));
    game.addPlayer(new Player(persistentId('ccccccc'), 'Clara'));
    game.setRulesetConfig({
      ...DEFAULT_RULESET_CONFIG,
      bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true },
    });
    game.phase = GamePhase.PLAYING;

    const result = await load(legacyStored(game, { roomSettings: { ...ROOM_SETTINGS, rulesetConfig: game.rulesetConfig } }));

    expect(result.game.phase).toBe(GamePhase.PLAYING);
    expect(result.game.players).toHaveLength(3);
    expect(result.game.rulesetConfig.bidding.hiddenBids).toBe(true);
  });

  it('restores bot levels and the dealt round through the domain deserializer', async () => {
    const aliceId = persistentId('aaaaaaa');
    const game = new Game('persisted-room', aliceId);
    game.addPlayer(new Player(aliceId, 'Alice'));
    game.addPlayer(new Player('bot-1', 'Bot 1', true, 5));
    game.addPlayer(new Player('bot-2', 'Bot 2', true, 1));
    game.start();

    const result = await load(legacyStored(game, { botCounter: 2 }));

    expect(result.game.getPlayer('bot-1')?.botDifficulty).toBe(5);
    expect(result.game.getPlayer('bot-2')?.botDifficulty).toBe(1);
    expect(result.game.phase).toBe(game.phase);
    expect(result.game.trumpCard?.id).toBe(game.trumpCard?.id);
    expect(result.game.players.map((player) => player.hand.map((card) => card.id)))
      .toEqual(game.players.map((player) => player.hand.map((card) => card.id)));
    // No socket survives a restart: humans wait to rejoin, bots never had one and keep playing.
    expect(result.game.getPlayer(aliceId)?.isConnected).toBe(false);
    expect(result.game.getPlayer('bot-1')?.isConnected).toBe(true);
    expect(result.game.getPlayer('bot-2')?.isConnected).toBe(true);
  });

  it('normalizes restored room settings and syncs them to the restored game ruleset', async () => {
    const aliceId = persistentId('aaaaaaa');
    const game = new Game('persisted-room', aliceId);
    game.addPlayer(new Player(aliceId, 'Alice'));
    game.setRulesetConfig({
      ...DEFAULT_RULESET_CONFIG,
      bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true },
    });

    const stored = legacyStored(game, {
      roomSettings: {
        name: '  Persisted Room  ',
        isPublic: 'yes',
        maxPlayers: 99,
        rulesetConfig: {
          ...DEFAULT_RULESET_CONFIG,
          scoring: { ...DEFAULT_RULESET_CONFIG.scoring, baseBidPoints: 35 },
        },
      } as never,
    });

    const result = await load(stored, { name: 'fallback', isPublic: true, maxPlayers: 6 });

    expect(result.roomSettings.name).toBe('Persisted Room');
    expect(result.roomSettings.isPublic).toBe(true);
    expect(result.roomSettings.maxPlayers).toBe(6);
    expect(result.roomSettings.rulesetConfig).toEqual(result.game.rulesetConfig);
    expect(result.roomSettings.rulesetConfig?.bidding.hiddenBids).toBe(true);
    expect(result.roomSettings.rulesetConfig?.scoring.baseBidPoints).toBe(DEFAULT_RULESET_CONFIG.scoring.baseBidPoints);
  });
});

describe('Persisted state schema 2', () => {
  const sound = {
    id: 'shared-1',
    name: 'spell.wav',
    dataUrl: 'data:audio/wav;base64,AAAA',
    size: 128,
    duration: 1,
    category: DEFAULT_CUSTOM_SOUND_CATEGORY,
    roles: { wizard: false, jester: false, trick: true, afk: false, shared: true },
  };

  function roomOfTwo() {
    const aliceId = 'p_aliceSeat01';
    const game = new Game('persisted-room', aliceId);
    game.addPlayer(new Player(aliceId, 'Alice'));
    game.addPlayer(new Player('bot-1', 'Bot 1', true, 4));
    const processedCommands = new ProcessedCommandLog();
    processedCommands.mark(aliceId, 'req-1', BASE_TIME);
    const preferences: SoundPreferences = {
      trickWinSound: 'chime',
      customTrickWinAudios: [sound],
      sharedCustomSounds: [sound],
    };
    return {
      aliceId,
      params: {
        game,
        persistentIdToPlayerId: new Map([[persistentId('aaaaaaa'), aliceId]]),
        sessionTokens: new Map([[aliceId, 'secret-token'.padEnd(43, 'x')]]),
        roomSettings: { name: game.id, isPublic: true, maxPlayers: 6 },
        botCounter: 1,
        stateVersion: 42,
        playerSoundPreferences: new Map([[aliceId, preferences]]),
        processedCommands,
      },
    };
  }

  /** The room as storage hands it back: plain JSON. */
  function roundTrip(params: ReturnType<typeof roomOfTwo>['params']): StoredState {
    return JSON.parse(JSON.stringify(toPersistedState(params))) as StoredState;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the game once, with a schema version and without uploaded audio', () => {
    const { params } = roomOfTwo();
    const persisted = toPersistedState(params);

    expect(persisted.schemaVersion).toBe(PERSISTED_SCHEMA_VERSION);
    expect(persisted).not.toHaveProperty('players');
    expect(persisted).not.toHaveProperty('hostId');
    expect(persisted.playerSoundPreferences).toEqual([['p_aliceSeat01', { trickWinSound: 'chime' }]]);
    expect(JSON.stringify(persisted)).not.toContain('data:audio');
  });

  it('keeps the rules of an empty lobby across a restart', async () => {
    const game = new Game('persisted-room', '');
    game.setRulesetConfig({
      ...DEFAULT_RULESET_CONFIG,
      structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: 2 },
    });
    const { params } = roomOfTwo();

    const result = await load(roundTrip({ ...params, game }), params.roomSettings);

    expect(result.game.players).toHaveLength(0);
    expect(result.game.rulesetConfig.structure.customRoundCount).toBe(2);
    expect(result.roomSettings.rulesetConfig?.structure.customRoundCount).toBe(2);
  });

  it('restores tokens, the state version, applied commands and connected bots', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
    const { aliceId, params } = roomOfTwo();

    const result = await load(roundTrip(params), params.roomSettings);

    expect(result.sessionTokens.get(aliceId)).toBe(params.sessionTokens.get(aliceId));
    expect(result.persistentIdToPlayerId.get(persistentId('aaaaaaa'))).toBe(aliceId);
    expect(result.stateVersion).toBe(42);
    expect(result.processedCommands.has(aliceId, 'req-1', BASE_TIME)).toBe(true);
    expect(result.game.getPlayer(aliceId)?.isConnected).toBe(false);
    expect(result.game.getPlayer('bot-1')).toMatchObject({ isConnected: true, botDifficulty: 4 });
  });

  it('loads a room an older release wrote with mutes and a room password, and saves it without the password', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
    const { aliceId, params } = roomOfTwo();
    const current = roundTrip(params);
    const olderRelease = {
      ...current,
      roomSettings: { ...current.roomSettings, password: 'hunter2' },
      mutedPlayers: [[aliceId, ['bot-1']]],
    } as unknown as StoredState;

    const result = await load(olderRelease, params.roomSettings);
    const saved = toPersistedState(result);

    expect(result.game.players.map((player) => player.id)).toEqual([aliceId, 'bot-1']);
    expect(result.sessionTokens.get(aliceId)).toBe(params.sessionTokens.get(aliceId));
    expect(result.roomSettings).not.toHaveProperty('password');
    expect(JSON.stringify(saved)).not.toContain('hunter2');
  });

  it('restores a room saved as phase PAUSED in its real phase, still waiting', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
    const { aliceId, params } = roomOfTwo();
    params.game.addPlayer(new Player('p_bobSeat0001', 'Bob'));
    params.game.start();
    params.game.pause(aliceId, 'Alice');
    const phase = params.game.phase;
    const stored = roundTrip(params) as StoredState & { gameState: { phase: GamePhase } };
    stored.gameState.phase = GamePhase.PAUSED;

    const result = await load(stored, params.roomSettings);

    expect(result.game.phase).toBe(phase);
    expect(result.game.pauseState?.pausedForPlayerId).toBe(aliceId);
  });

  it('starts the round-end wait from the restart when the room did not record it', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
    const { params } = roomOfTwo();
    params.game.phase = GamePhase.ROUND_END;
    const stored = roundTrip(params) as StoredState & { gameState: { roundEndedAt?: number | null } };
    delete stored.gameState.roundEndedAt;

    const result = await load(stored, params.roomSettings);

    expect(result.game.roundEndedAt).toBe(BASE_TIME);
  });
});
