import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RULESET_CONFIG,
  Game,
  GameEventType,
  GameError,
  GamePhase,
  Player,
  type CustomSound,
  type GameEvent,
  type IRoomSettings,
} from '../../shared/domain';
import {
  CommandRejectionCode,
  DeviceType,
  TELEMETRY_LIMITS,
  TELEMETRY_PAYLOAD_LIMITS,
  TelemetryEventType,
  type AnyTelemetryEnvelope,
} from '../../shared/telemetry';
import { extractClientInfo, primaryLanguage, UNKNOWN_CLIENT_INFO } from './client-info';
import { commandRejectedFact, rejectionFromError, rejectionWithCode } from './command-rejection';
import { clientDisconnectedFact, sessionStartedFact } from './connection-facts';
import { ConnectionTracker, MAX_TRACKED_CONNECTIONS } from './connection-tracker';
import { roomSettingsChangedFact, rulesetChangedFact, soundPreferencesChangedFact } from './settings-telemetry';
import { rematchRequestedFact } from './social-telemetry';
import { telemetryFact } from './telemetry-fact';
import { mapDomainEvents } from './telemetry-mapper';
import { INITIAL_TELEMETRY_CURSOR, TelemetryRecorder, type TelemetrySink } from './telemetry-recorder';

const AUDIO_DATA_URL = `data:audio/mpeg;base64,${'QUJD'.repeat(1_000)}`;

function customSound(overrides: Partial<CustomSound> = {}): CustomSound {
  return {
    id: 'sound-1',
    name: 'Airhorn',
    dataUrl: AUDIO_DATA_URL,
    size: 3_000,
    duration: 1.5,
    category: 'custom',
    roles: { wizard: true, jester: false, trick: true, afk: true, shared: true },
    ...overrides,
  };
}

function recorderWithSink() {
  const events: AnyTelemetryEnvelope[] = [];
  const sink: TelemetrySink = {
    loadCursor: () => Promise.resolve(INITIAL_TELEMETRY_CURSOR),
    append: (batch) => events.push(...batch),
  };
  let id = 0;
  const recorder = new TelemetryRecorder({
    roomId: 'room',
    serverVersion: null,
    sink,
    generateId: () => `00000000-0000-7000-8000-${String(++id).padStart(12, '0')}`,
  });
  return { recorder, events };
}

function lobbyWith(...ids: string[]): Game {
  const game = new Game('room', ids[0]);
  for (const id of ids) game.addPlayer(new Player(id, id.toUpperCase(), false));
  return game;
}

describe('domain event mappers', () => {
  const game = lobbyWith('alice', 'bob');

  it('maps chat with its text bounded and emotes with bounded ids', () => {
    const longMessage = 'x'.repeat(TELEMETRY_PAYLOAD_LIMITS.MAX_CHAT_MESSAGE_LENGTH + 20);
    const facts = mapDomainEvents(
      [
        { type: GameEventType.CHAT_MESSAGE, playerId: 'alice', playerName: 'A', message: 'gg', timestamp: 1 },
        { type: GameEventType.CHAT_MESSAGE, playerId: 'alice', playerName: 'A', message: longMessage, timestamp: 1 },
        { type: GameEventType.EMOTE, playerId: 'bob', playerName: 'B', emoteId: 'e'.repeat(1_000), timestamp: 1 },
      ],
      game
    );
    expect(facts[0]).toEqual({
      type: TelemetryEventType.CHAT_SENT,
      actorId: 'alice',
      payload: { playerId: 'alice', message: 'gg', length: 2 },
    });
    // The stored text is cut at the bound; the length is that of the message as sent.
    expect(facts[1].payload).toEqual({
      playerId: 'alice',
      message: longMessage.slice(0, TELEMETRY_PAYLOAD_LIMITS.MAX_CHAT_MESSAGE_LENGTH),
      length: longMessage.length,
    });
    expect(facts[2].type).toBe(TelemetryEventType.EMOTE_SENT);
    expect((facts[2].payload as { emoteId: string }).emoteId).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH);
  });

  it('maps lobby grace periods in causal order', () => {
    const events: GameEvent[] = [
      { type: GameEventType.PLAYER_LEFT, playerId: 'bob', timestamp: 1 },
      { type: GameEventType.PLAYER_GRACE_EXPIRED, playerId: 'bob', playerName: 'B', timestamp: 1 },
    ];
    expect(mapDomainEvents(events, game)).toEqual([
      { type: TelemetryEventType.PLAYER_GRACE_EXPIRED, actorId: 'bob', payload: { playerId: 'bob', newHostId: null } },
      { type: TelemetryEventType.PLAYER_LEFT, actorId: 'bob', payload: { playerId: 'bob' } },
    ]);
    expect(
      mapDomainEvents(
        [{ type: GameEventType.PLAYER_GRACE_RESTORED, playerId: 'bob', playerName: 'B', isHost: true, timestamp: 1 }],
        game
      )[0]
    ).toEqual({ type: TelemetryEventType.PLAYER_GRACE_RESTORED, actorId: 'bob', payload: { playerId: 'bob', isHost: true } });
  });

  it('maps rematch starts; requests are recorded by the handler, not from a domain event', () => {
    const facts = mapDomainEvents(
      [
        { type: GameEventType.REMATCH_REQUESTED, playerId: 'bob', timestamp: 1 },
        { type: GameEventType.REMATCH_STARTED, timestamp: 1 },
      ],
      game
    );
    expect(facts.map((fact) => fact.payload)).toEqual([{ hostId: 'alice', playerIds: ['alice', 'bob'] }]);
    expect(rematchRequestedFact('bob', game)).toEqual({
      type: TelemetryEventType.REMATCH_REQUESTED,
      actorId: 'bob',
      payload: { playerId: 'bob', isHost: false },
    });
    expect(rematchRequestedFact('alice', game).payload.isHost).toBe(true);
  });

  it('records timeout sounds without audio data', () => {
    const [fact] = mapDomainEvents(
      [
        {
          type: GameEventType.TIMEOUT_SOUND_PLAYED,
          senderPlayerId: 'alice',
          senderPlayerName: 'A',
          targetPlayerId: 'bob',
          targetPlayerName: 'B',
          customAudio: customSound(),
          timestamp: 1,
        },
      ],
      game
    );
    expect(JSON.stringify(fact)).not.toContain('data:');
    expect(fact.payload).toEqual({
      senderPlayerId: 'alice',
      targetPlayerId: 'bob',
      soundName: null,
      customAudio: {
        id: 'sound-1',
        name: 'Airhorn',
        mimeType: 'audio/mpeg',
        byteSize: 3_000,
        durationSec: 1.5,
        category: 'custom',
        roles: ['wizard', 'trick', 'afk', 'shared'],
      },
    });
  });
});

describe('settings facts', () => {
  const base: IRoomSettings = { name: 'Room', isPublic: true, maxPlayers: 6, rulesetConfig: DEFAULT_RULESET_CONFIG };

  it('reports the changed keys and the new settings', () => {
    const fact = roomSettingsChangedFact('alice', base, { ...base, isPublic: false, maxPlayers: 4 });
    expect(fact?.payload.changedKeys).toEqual(['isPublic', 'maxPlayers']);
    expect(fact?.payload.settings).toEqual({ name: 'Room', isPublic: false, maxPlayers: 4, ruleset: DEFAULT_RULESET_CONFIG });
  });

  it('skips no-op updates', () => {
    expect(roomSettingsChangedFact('alice', base, { ...base })).toBeNull();
    expect(rulesetChangedFact('alice', DEFAULT_RULESET_CONFIG, structuredClone(DEFAULT_RULESET_CONFIG))).toBeNull();
    expect(soundPreferencesChangedFact('alice', { trickWinSound: 'x' }, { trickWinSound: 'x' })).toBeNull();
  });

  it('reports changed ruleset sections', () => {
    const next = { ...DEFAULT_RULESET_CONFIG, turn: { ...DEFAULT_RULESET_CONFIG.turn, biddingTimerSeconds: 5 } };
    const fact = rulesetChangedFact('alice', DEFAULT_RULESET_CONFIG, next);
    expect(fact?.payload).toEqual({ playerId: 'alice', ruleset: next, changedKeys: ['turn'] });
  });

  it('reduces sound preferences to metadata and never records audio data', () => {
    const sounds = Array.from({ length: TELEMETRY_PAYLOAD_LIMITS.MAX_LIST_ITEMS + 5 }, (_, i) => customSound({ id: `s${i}` }));
    const fact = soundPreferencesChangedFact(
      'alice',
      { trickWinSound: 'old', customTrickWinAudio: customSound() },
      { trickWinSound: 'new', customTrickWinAudio: null, sharedCustomSounds: sounds }
    );
    const serialized = JSON.stringify(fact);
    expect(serialized).not.toContain('data:');
    expect(serialized).not.toContain('base64');
    expect(fact?.payload.changedKeys).toEqual(['customTrickWinAudio', 'sharedCustomSounds', 'trickWinSound']);
    expect(fact?.payload.preferences.customTrickWinAudio).toBeNull();
    expect(fact?.payload.preferences.trickWinSound).toBe('new');
    expect(fact?.payload.preferences.sharedCustomSounds?.count).toBe(sounds.length);
    expect(fact?.payload.preferences.sharedCustomSounds?.items).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_LIST_ITEMS);
  });
});

describe('command rejection facts', () => {
  it('keeps domain error codes and bounds client-controlled fields', () => {
    const fact = commandRejectedFact(
      { commandType: 'PLAY_CARD', requestId: 'r'.repeat(1_000) },
      rejectionFromError(new GameError('Not your turn', 'NOT_YOUR_TURN')),
      true
    );
    expect(fact.payload).toMatchObject({ commandType: 'PLAY_CARD', errorCode: 'NOT_YOUR_TURN', message: 'Not your turn', notifiedClient: true });
    expect(fact.payload.requestId).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH);
  });

  it('describes plain errors, non-errors and missing commands', () => {
    expect(rejectionFromError(new TypeError('boom'))).toEqual({ errorCode: null, errorName: 'TypeError', message: 'boom' });
    expect(rejectionFromError('weird')).toMatchObject({ errorName: 'UnknownError', message: 'weird' });
    const fact = commandRejectedFact(null, rejectionWithCode(CommandRejectionCode.INVALID_JSON, 'x'.repeat(5_000)), true);
    expect(fact.payload.commandType).toBeNull();
    expect(fact.payload.message).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_ERROR_MESSAGE_LENGTH);
  });
});

describe('client info', () => {
  function upgradeRequest(headers: Record<string, string>, cf?: unknown, query = '') {
    const request = new Request(`https://game.test/parties/main/room${query}`, { headers });
    if (cf !== undefined) Object.defineProperty(request, 'cf', { value: cf });
    return request;
  }

  it('extracts device, language, edge location and client version but no IP', () => {
    const info = extractClientInfo(
      upgradeRequest(
        {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
          'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
          'cf-connecting-ip': '203.0.113.7',
          'x-forwarded-for': '203.0.113.7',
        },
        { country: 'DE', colo: 'FRA', clientTcpRtt: 12 },
        '?_pk=abc&clientVersion=2026.10.1-abc123'
      )
    );
    expect(info).toEqual({
      browserName: 'Safari',
      browserVersion: '18.1',
      osName: 'iOS',
      osVersion: '18.1',
      deviceType: DeviceType.MOBILE,
      userAgent: expect.stringContaining('iPhone'),
      language: 'de-DE',
      country: 'DE',
      colo: 'FRA',
      clientVersion: '2026.10.1-abc123',
    });
    expect(JSON.stringify(info)).not.toContain('203.0.113.7');
  });

  it('falls back to nulls for missing or malformed values', () => {
    const info = extractClientInfo(
      upgradeRequest({ 'user-agent': 'u'.repeat(2_000), 'accept-language': '*' }, { country: 'not a country' }, '?clientVersion=<script>')
    );
    expect(info.userAgent).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_USER_AGENT_LENGTH);
    expect(info).toMatchObject({ language: null, country: null, colo: null, clientVersion: null });
    expect(extractClientInfo(upgradeRequest({}))).toEqual(UNKNOWN_CLIENT_INFO);
    expect(primaryLanguage('en')).toBe('en');
  });
});

describe('connection tracking', () => {
  it('evicts the oldest session beyond its capacity and forgets closed connections', () => {
    const tracker = new ConnectionTracker();
    for (let i = 0; i <= MAX_TRACKED_CONNECTIONS; i++) tracker.open(`c${i}`, UNKNOWN_CLIENT_INFO, i);
    expect(tracker.get('c0')).toBeUndefined();
    expect(tracker.get('c1')).toMatchObject({ connectionId: 'c1', connectedAt: 1 });

    tracker.attachPlayer('c1', 'bob');
    expect(tracker.close('c1')).toMatchObject({ playerId: 'bob', connectedAt: 1 });
    expect(tracker.get('c1')).toBeUndefined();
  });

  it('keeps the raw User-Agent out of player sessions', () => {
    const client = { ...UNKNOWN_CLIENT_INFO, userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', osName: 'Linux' };
    const tracker = new ConnectionTracker();
    const fact = sessionStartedFact(tracker.open('c', client, 1), 'alice', false);
    expect(fact.payload).not.toHaveProperty('userAgent');
    expect(fact.payload).toMatchObject({ playerId: 'alice', osName: 'Linux' });
  });

  it('reports disconnects of untracked connections without a duration', () => {
    const fact = clientDisconnectedFact('x', undefined, { code: 1006, reason: 'r'.repeat(500), wasClean: false }, 10);
    expect(fact.payload).toMatchObject({ playerId: null, durationMs: null, closeCode: 1006, wasClean: false });
    expect(fact.payload.closeReason).toHaveLength(TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH);
  });
});

describe('TelemetryRecorder.record', () => {
  it('envelopes non-domain facts under the active cause with bounded envelope fields', () => {
    const { recorder, events } = recorderWithSink();
    const game = lobbyWith('alice');
    const longText = 'x'.repeat(TELEMETRY_LIMITS.MAX_ENVELOPE_TEXT_LENGTH + 50);

    recorder.withCause({ source: 'player', actorId: longText, commandType: longText, correlationId: longText }, () =>
      recorder.record(telemetryFact(TelemetryEventType.REMATCH_REQUESTED, 'alice', { playerId: 'alice', isHost: true }), game)
    );
    recorder.withCause({ source: 'player', commandType: { not: 'a string' }, correlationId: '' }, () =>
      recorder.record(telemetryFact(TelemetryEventType.REMATCH_REQUESTED, null, { playerId: 'bob', isHost: false }), game)
    );

    expect(events[0]).toMatchObject({ type: TelemetryEventType.REMATCH_REQUESTED, seq: 1, actorId: 'alice', phase: GamePhase.LOBBY });
    expect(events[0].commandType).toHaveLength(TELEMETRY_LIMITS.MAX_ENVELOPE_TEXT_LENGTH);
    expect(events[0].correlationId).toHaveLength(TELEMETRY_LIMITS.MAX_ENVELOPE_TEXT_LENGTH);
    expect(events[1]).toMatchObject({ seq: 2, commandType: null, actorId: null });
    expect(events[1].correlationId).toMatch(/^00000000-/);
  });
});
