import { describe, expect, it } from 'vitest';
import { CloseEvent as PartySocketCloseEvent } from 'partysocket/ws';

import { REALTIME_TELEMETRY_CONFIG } from './client-telemetry.config';
import { CONNECT_TIMEOUT_CLOSE_CODE, RealtimeTelemetry, socketCloseInfo, type ServerMessage } from './realtime-telemetry';

const ME = 'p-me';
const OTHER = 'p-other';

function setup() {
  let now = 1_000;
  const events: { type: string; payload: Record<string, unknown> }[] = [];
  const tracker = new RealtimeTelemetry(
    { track: (type, payload) => events.push({ type, payload: payload as unknown as Record<string, unknown> }) },
    () => now
  );
  const receive = (type: string, fields: Record<string, unknown> = {}) =>
    tracker.messageReceived({ type, ...fields } as ServerMessage);
  const rtts = () => events.filter((e) => e.type === 'command.rtt').map((e) => e.payload);
  return { tracker, events, receive, rtts, advance: (ms: number) => { now += ms; } };
}

/** A tracker that already knows this tab's in-game player id. */
function joined() {
  const context = setup();
  context.receive('GAME_STATE', { yourPlayerId: ME });
  return context;
}

describe('RealtimeTelemetry connection quality', () => {
  it('reports connect duration for the first connection', () => {
    const { tracker, events, advance } = setup();
    tracker.connecting();
    advance(120);
    tracker.opened();
    expect(events).toEqual([{ type: 'ws.connected', payload: { connectMs: 120, attempt: 1, isReconnect: false, downtimeMs: null } }]);
  });

  it('reports disconnects with close codes and reconnects with downtime and attempts', () => {
    const { tracker, events, advance } = setup();
    tracker.connecting();
    tracker.opened();
    advance(5_000);
    tracker.closed({ code: 1006, reason: '', wasClean: false, intentional: false });
    advance(1_000);
    tracker.connecting();
    advance(1_000);
    tracker.connecting();
    advance(200);
    tracker.opened();

    expect(events[1]).toEqual({
      type: 'ws.disconnected',
      payload: { code: 1006, reason: '', wasClean: false, intentional: false, connectedForMs: 5_000 },
    });
    expect(events[2]).toEqual({
      type: 'ws.connected',
      payload: { connectMs: 200, attempt: 2, isReconnect: true, downtimeMs: 2_200 },
    });
  });

  it('does not treat a fresh connection after an intentional close as a reconnect', () => {
    const { tracker, events } = setup();
    tracker.connecting();
    tracker.opened();
    tracker.closed({ code: 1000, reason: 'leave_game', wasClean: true, intentional: true });
    tracker.connecting();
    tracker.opened();
    expect(events.at(-1)?.payload).toMatchObject({ isReconnect: false, downtimeMs: null, attempt: 1 });
  });

  it('reports a connect timeout as an unintentional disconnect', () => {
    const { tracker, events, advance } = setup();
    tracker.connecting();
    tracker.opened();
    tracker.closed({ code: 1006, reason: '', wasClean: false, intentional: false });
    tracker.connecting();
    advance(10_000);
    tracker.connectTimedOut();
    expect(events.at(-1)).toEqual({
      type: 'ws.disconnected',
      payload: { code: CONNECT_TIMEOUT_CLOSE_CODE, reason: 'connect_timeout', wasClean: false, intentional: false, connectedForMs: null },
    });
  });
});

describe('RealtimeTelemetry command round trips', () => {
  it('acknowledges a command only with a broadcast whose actor is this player', () => {
    const { tracker, receive, rtts, advance } = joined();
    tracker.commandSent('req-1', 'PLAY_CARD');
    advance(40);
    receive('CARD_PLAYED', { playerId: OTHER });
    receive('GAME_STATE', { yourPlayerId: ME });
    expect(rtts()).toHaveLength(0);
    advance(40);
    receive('CARD_PLAYED', { playerId: ME });
    expect(rtts()).toEqual([{
      requestId: 'req-1', commandType: 'PLAY_CARD', rttMs: 80, outcome: 'ack', ackEventType: 'CARD_PLAYED', matchedBy: 'actor',
    }]);
  });

  it("does not let another player's emote acknowledge mine", () => {
    const { tracker, receive, rtts, advance } = joined();
    tracker.commandSent('emote', 'SEND_EMOTE');
    receive('EMOTE', { playerId: OTHER });
    advance(25);
    receive('EMOTE', { playerId: ME });
    expect(rtts()).toEqual([expect.objectContaining({ requestId: 'emote', rttMs: 25, matchedBy: 'actor' })]);
  });

  it('matches timeout sounds by their sender', () => {
    const { tracker, receive, rtts } = joined();
    tracker.commandSent('sound', 'PLAY_TIMEOUT_SOUND');
    receive('TIMEOUT_SOUND_PLAYED', { senderPlayerId: OTHER, targetPlayerId: ME });
    receive('TIMEOUT_SOUND_PLAYED', { senderPlayerId: ME, targetPlayerId: OTHER });
    expect(rtts()).toEqual([expect.objectContaining({ requestId: 'sound', matchedBy: 'actor' })]);
  });

  it('cannot attribute broadcasts before the player id is known', () => {
    const { tracker, receive, rtts } = setup();
    tracker.commandSent('bid', 'PLACE_BID');
    receive('BID_PLACED', { playerId: ME });
    expect(rtts()).toHaveLength(0);
  });

  it('acknowledges commands without an attributable event with the next state push', () => {
    const { tracker, receive, rtts, advance } = joined();
    tracker.commandSent('chat', 'SEND_CHAT');
    tracker.commandSent('start', 'START_GAME');
    advance(30);
    receive('GAME_STATE', { yourPlayerId: ME });
    advance(10);
    receive('CHAT_MESSAGE', { playerId: ME });
    expect(rtts().map((p) => [p.requestId, p.rttMs, p.matchedBy])).toEqual([['start', 30, 'state'], ['chat', 40, 'actor']]);
  });

  it('attributes server errors to the oldest pending command', () => {
    const { tracker, receive, rtts } = joined();
    tracker.commandSent('bid', 'PLACE_BID');
    tracker.commandSent('card', 'PLAY_CARD');
    receive('ERROR', { message: 'not your turn' });
    expect(rtts()).toEqual([expect.objectContaining({ requestId: 'bid', outcome: 'error', ackEventType: 'ERROR', matchedBy: 'error_fifo' })]);
  });

  it('reports commands without an answer as timeouts', () => {
    const { tracker, receive, rtts, advance } = joined();
    tracker.commandSent('slow', 'NEXT_ROUND');
    advance(REALTIME_TELEMETRY_CONFIG.COMMAND_RTT_TIMEOUT_MS);
    receive('EMOTE', { playerId: OTHER });
    expect(rtts()).toEqual([expect.objectContaining({ requestId: 'slow', outcome: 'timeout', ackEventType: null, matchedBy: null })]);
  });

  it('reports commands in flight when the socket closes as lost', () => {
    const { tracker, receive, rtts, advance } = joined();
    tracker.commandSent('prefs', 'UPDATE_SOUND_PREFERENCES');
    tracker.commandSent('bid', 'PLACE_BID');
    advance(500);
    tracker.closed({ code: 1006, reason: '', wasClean: false, intentional: false });
    receive('BID_PLACED', { playerId: ME });
    expect(rtts()).toEqual([{
      requestId: 'bid', commandType: 'PLACE_BID', rttMs: 500, outcome: 'lost', ackEventType: null, matchedBy: null,
    }]);
  });

  it('bounds the number of pending commands', () => {
    const { tracker, receive, rtts } = joined();
    for (let i = 0; i <= REALTIME_TELEMETRY_CONFIG.MAX_PENDING_COMMANDS; i++) tracker.commandSent(`r${i}`, 'START_GAME');
    receive('GAME_STATE', { yourPlayerId: ME });
    expect(rtts()[0].requestId).toBe('r1');
  });
});

describe('socketCloseInfo', () => {
  it('reads a native close event', () => {
    expect(socketCloseInfo({ code: 1001, reason: 'going away', wasClean: true }, false)).toEqual({ code: 1001, reason: 'going away', wasClean: true, intentional: false });
  });

  it('recovers the details of a close event partysocket re-dispatched in the browser', () => {
    // partysocket's own close (reconnect/close/timeout) is cloned with `new e.constructor(e.type, e)`,
    // which shifts the arguments of its CloseEvent: code "close", reason = the original event.
    const original = new PartySocketCloseEvent(4000, 'reconnecting', null);
    const cloned = new (original.constructor as new (...args: unknown[]) => PartySocketCloseEvent)(original.type, original);
    expect(typeof cloned.reason).not.toBe('string');
    expect(socketCloseInfo(cloned, true)).toEqual({ code: 4000, reason: 'reconnecting', wasClean: true, intentional: true });
  });

  it('falls back for anything else', () => {
    expect(socketCloseInfo({ code: 'close', reason: undefined, wasClean: undefined }, false)).toEqual({ code: 1006, reason: '', wasClean: false, intentional: false });
  });

  it('lets the tracker report such a close without throwing', () => {
    const { tracker, events } = setup();
    tracker.connecting();
    tracker.opened();
    const original = new PartySocketCloseEvent(1000, undefined, null);
    const cloned = new (original.constructor as new (...args: unknown[]) => PartySocketCloseEvent)(original.type, original);
    expect(() => tracker.closed(socketCloseInfo(cloned, true))).not.toThrow();
    expect(events.at(-1)).toMatchObject({ type: 'ws.disconnected', payload: { code: 1000, reason: '' } });
  });
});
