import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Game, GamePhase, Player, type Suit } from '../../shared/domain';
import { createUseCaseRegistry } from '../../shared/application';
import { TELEMETRY_LIMITS, TelemetryEventType, type AnyTelemetryEnvelope } from '../../shared/telemetry';
import { ALARM_HANDLER_RETRY_MS, AlarmMultiplexer } from '../utils/alarm-multiplexer';
import { MemoryOutboxStorage } from '../test-support/memory-outbox-storage';
import { DurableObjectOutbox, OUTBOX_KEYS } from './durable-object-outbox';
import type { DeliveryResult, TelemetryTransport } from './http-telemetry-transport';
import { instrumentUseCases } from './instrument-use-cases';
import { INITIAL_TELEMETRY_CURSOR, TelemetryRecorder, type TelemetryCursor, type TelemetrySink } from './telemetry-recorder';

class MemorySink implements TelemetrySink {
  events: AnyTelemetryEnvelope[] = [];
  cursor: TelemetryCursor = INITIAL_TELEMETRY_CURSOR;
  loadCursor() {
    return Promise.resolve(this.cursor);
  }
  append(events: AnyTelemetryEnvelope[], cursor: TelemetryCursor) {
    this.events.push(...events);
    this.cursor = cursor;
  }
}

const HUMAN_ID = `player-${Date.now()}-abc1234`;

function playFullGame() {
  const sink = new MemorySink();
  let id = 0;
  const recorder = new TelemetryRecorder({
    roomId: 'room-1',
    serverVersion: 'test',
    sink,
    generateId: () => `00000000-0000-7000-8000-${String(++id).padStart(12, '0')}`,
  });
  const useCases = instrumentUseCases(createUseCaseRegistry(), recorder);
  const game = new Game('room-1', HUMAN_ID);

  recorder.withCause({ source: 'player', actorId: HUMAN_ID, commandType: 'JOIN_GAME', correlationId: 'req-join' }, () =>
    useCases.joinGame.execute({ game, playerId: HUMAN_ID, playerName: 'Ada', persistentId: HUMAN_ID, maxPlayers: 6 })
  );
  // Let the bot AI decide the human's moves too, so the whole game can be simulated.
  game.getPlayer(HUMAN_ID)!.isBot = true;
  for (const n of [1, 2]) {
    const player = new Player(`bot-${n}`, `Bot ${n}`, true);
    game.addPlayer(player);
  }
  recorder.withCause({ source: 'player', actorId: HUMAN_ID, commandType: 'START_GAME', correlationId: 'req-start' }, () =>
    useCases.startGame.execute({ game, playerId: HUMAN_ID })
  );

  for (let guard = 0; guard < 10_000 && game.phase !== GamePhase.GAME_END; guard++) {
    if (game.phase === GamePhase.ROUND_END) {
      recorder.withCause({ source: 'player', actorId: HUMAN_ID, commandType: 'NEXT_ROUND' }, () =>
        useCases.nextRound.execute({ game, playerId: HUMAN_ID })
      );
      continue;
    }
    const actor = game.phase === GamePhase.TRUMP_SELECTION ? game.getDealer() : game.getCurrentPlayer();
    const action = useCases.botTurn.execute({ game, difficulty: 3 });
    recorder.withCause({ source: 'bot', actorId: actor.id, commandType: action.type }, () => {
      if (action.type === 'SELECT_TRUMP') useCases.selectTrump.execute({ game, playerId: actor.id, suit: action.suit as Suit });
      if (action.type === 'PLACE_BID') useCases.placeBid.execute({ game, playerId: actor.id, bid: action.bid });
      if (action.type === 'PLAY_CARD') useCases.playCard.execute({ game, playerId: actor.id, cardId: action.cardId });
    });
  }

  return { sink, game };
}

describe('TelemetryRecorder', () => {
  it('records a complete game as an ordered, correlated event stream', () => {
    const { sink, game } = playFullGame();
    const events = sink.events;
    const ofType = (type: string) => events.filter((event) => event.type === type);

    expect(game.phase).toBe(GamePhase.GAME_END);
    expect(events.map((event) => event.seq)).toEqual(events.map((_, i) => i + 1));

    const [started] = ofType(TelemetryEventType.GAME_STARTED);
    expect(started.gameId).toBeTruthy();
    expect(started.correlationId).toBe('req-start');
    expect(started.source).toBe('player');

    const gameEvents = events.slice(events.indexOf(started));
    expect(new Set(gameEvents.map((event) => event.gameId))).toEqual(new Set([started.gameId]));

    expect(ofType(TelemetryEventType.ROUND_STARTED)).toHaveLength(game.maxRounds);
    expect(ofType(TelemetryEventType.ROUND_COMPLETED)).toHaveLength(game.maxRounds);
    expect(ofType(TelemetryEventType.BID_PLACED)).toHaveLength(game.maxRounds * 3);
    const totalCards = (game.maxRounds * (game.maxRounds + 1) / 2) * 3;
    expect(ofType(TelemetryEventType.CARD_PLAYED)).toHaveLength(totalCards);

    const lastCard = ofType(TelemetryEventType.CARD_PLAYED).at(-1)!;
    expect(lastCard.payload).toMatchObject({ trickNumber: game.maxRounds, positionInTrick: 3 });
    expect(lastCard.source).toBe('bot');

    const completed = ofType(TelemetryEventType.GAME_COMPLETED);
    expect(completed).toHaveLength(1);
    const { standings } = completed[0].payload as { standings: { rank: number }[] };
    expect(standings.map((entry) => entry.rank)[0]).toBe(1);
    expect(standings).toHaveLength(3);
    expect(sink.cursor.gameId).toBeNull();
  });

  it('abandons an open game when a new one starts', () => {
    const sink = new MemorySink();
    sink.cursor = { seq: 41, gameId: '00000000-0000-7000-8000-00000000000a', gameStartedAt: 1_000 };
    const recorder = new TelemetryRecorder({ roomId: 'r', serverVersion: null, sink, now: () => 5_000 });
    const game = new Game('r', 'a');
    for (const id of ['a', 'b', 'c']) game.addPlayer(new Player(id, id, false));
    return recorder.start().then(() => {
      instrumentUseCases(createUseCaseRegistry(), recorder).startGame.execute({ game, playerId: 'a' });
      expect(sink.events[0]).toMatchObject({
        type: TelemetryEventType.GAME_ABANDONED,
        seq: 42,
        gameId: '00000000-0000-7000-8000-00000000000a',
        payload: { durationMs: 4_000 },
      });
      expect(sink.events[1].type).toBe(TelemetryEventType.GAME_STARTED);
      expect(sink.events[1].gameId).not.toBe(sink.events[0].gameId);
    });
  });
});

function makeEvent(seq: number): AnyTelemetryEnvelope {
  return {
    schemaVersion: 1,
    eventId: `e-${seq}`,
    type: TelemetryEventType.PLAYER_LEFT,
    occurredAt: seq,
    roomId: 'r',
    gameId: null,
    seq,
    source: 'system',
    actorId: null,
    correlationId: 'c',
    commandType: null,
    round: null,
    phase: 'LOBBY',
    serverVersion: null,
    payload: { playerId: 'p' },
  };
}

describe('DurableObjectOutbox', () => {
  // The debounced flush never runs on its own here: each test flushes when it means to.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(results: DeliveryResult[]) {
    const storage = new MemoryOutboxStorage();
    const sent: number[][] = [];
    const transport: TelemetryTransport = {
      send: vi.fn(async (events: AnyTelemetryEnvelope[]) => {
        sent.push(events.map((event) => event.seq));
        return results.shift() ?? ({ status: 'delivered' } as const);
      }),
    };
    const alarm = { setAlarm: vi.fn(async () => undefined), deleteAlarm: vi.fn(async () => undefined) };
    const outbox = new DurableObjectOutbox({ storage, transport, alarm, now: () => 1_000, log: () => undefined });
    return { storage, sent, alarm, outbox };
  }

  it('delivers in sequence order in bounded batches and clears the alarm when drained', async () => {
    const { storage, sent, alarm, outbox } = setup([]);
    const events = Array.from({ length: TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH + 5 }, (_, i) => makeEvent(i + 1));
    outbox.append(events, { seq: events.length, gameId: null, gameStartedAt: null });
    await outbox.flush();

    expect(sent.map((batch) => batch.length)).toEqual([TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH, 5]);
    expect(sent.flat()).toEqual(events.map((event) => event.seq));
    expect([...storage.data.keys()]).toEqual([OUTBOX_KEYS.CURSOR]);
    expect(alarm.deleteAlarm).toHaveBeenCalled();
  });

  it('keeps events and backs off when delivery fails', async () => {
    const { storage, alarm, outbox } = setup([{ status: 'retry', reason: 'HTTP 503' }, { status: 'retry', reason: 'HTTP 503' }]);
    outbox.append([makeEvent(1)], { seq: 1, gameId: null, gameStartedAt: null });
    await outbox.flush();
    expect(alarm.setAlarm).toHaveBeenLastCalledWith(1_000 + 5_000);
    await outbox.flush();
    expect(alarm.setAlarm).toHaveBeenLastCalledWith(1_000 + 10_000);
    expect(storage.data.size).toBe(2);

    await outbox.flush();
    expect(storage.data.size).toBe(1);
  });

  it('dead-letters batches the consumer rejects so later events still flow', async () => {
    const { storage, sent, outbox } = setup([{ status: 'rejected', reason: 'HTTP 400' }]);
    outbox.append([makeEvent(1)], { seq: 1, gameId: null, gameStartedAt: null });
    await outbox.flush();
    outbox.append([makeEvent(2)], { seq: 2, gameId: null, gameStartedAt: null });
    await outbox.flush();

    expect(sent).toEqual([[1], [2]]);
    expect([...storage.data.keys()].filter((key) => key.startsWith(OUTBOX_KEYS.DEAD_LETTER_PREFIX))).toHaveLength(1);
  });

  it('resumes delivery after a restart', async () => {
    const { storage, alarm, outbox } = setup([]);
    await storage.put({ [`${OUTBOX_KEYS.PENDING_PREFIX}000000000000001`]: makeEvent(1) });
    await outbox.loadCursor();
    expect(alarm.setAlarm).toHaveBeenCalledWith(1_000);
  });
});

describe('AlarmMultiplexer', () => {
  it('arms the earliest deadline and only runs due channels', async () => {
    let now = 0;
    const storage = { setAlarm: vi.fn(), deleteAlarm: vi.fn() };
    const alarms = new AlarmMultiplexer(storage, () => now);
    await alarms.channel('game').setAlarm(500);
    await alarms.channel('telemetry').setAlarm(100);
    expect(storage.setAlarm).toHaveBeenLastCalledWith(100);

    const game = vi.fn();
    const telemetry = vi.fn();
    now = 100;
    await alarms.dispatch({ game, telemetry });
    expect(telemetry).toHaveBeenCalledOnce();
    expect(game).not.toHaveBeenCalled();
    expect(storage.setAlarm).toHaveBeenLastCalledWith(500);

    await alarms.channel('game').deleteAlarm();
    expect(storage.deleteAlarm).toHaveBeenCalled();
  });

  it('runs every due channel when one handler fails, and retries the failed one', async () => {
    const now = 100;
    const storage = { setAlarm: vi.fn(), deleteAlarm: vi.fn() };
    const alarms = new AlarmMultiplexer(storage, () => now);
    await alarms.channel('game').setAlarm(100);
    await alarms.channel('tournament').setAlarm(100);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const tournament = vi.fn();
    await alarms.dispatch({ game: () => Promise.reject(new Error('storage hiccup')), tournament });

    expect(tournament).toHaveBeenCalledOnce();
    expect(storage.setAlarm).toHaveBeenLastCalledWith(100 + ALARM_HANDLER_RETRY_MS);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
