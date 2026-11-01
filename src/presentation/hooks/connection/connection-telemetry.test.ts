import { describe, expect, it } from 'vitest';

import { RealtimeTelemetry } from '@/lib/client-telemetry/realtime-telemetry';

import { CLIENT_CLOSE_REASON, ConnectionTelemetry } from './connection-telemetry';

function setup() {
  let now = 0;
  const tracked: { type: string; payload: Record<string, unknown> }[] = [];
  const roomIds: (string | null)[] = [];
  const realtime = new RealtimeTelemetry(
    { track: (type, payload) => tracked.push({ type, payload: payload as unknown as Record<string, unknown> }) },
    () => now
  );
  const telemetry = new ConnectionTelemetry(realtime, { setRoomId: (roomId) => roomIds.push(roomId) });
  const disconnects = () => tracked.filter((e) => e.type === 'ws.disconnected').map((e) => e.payload);
  return { telemetry, tracked, roomIds, disconnects, advance: (ms: number) => { now += ms; } };
}

describe('ConnectionTelemetry', () => {
  it('sets the room context when connecting and opening, and clears it when leaving', () => {
    const { telemetry, roomIds, disconnects } = setup();
    telemetry.connecting('ABCD');
    telemetry.opened('ABCD');
    telemetry.left(CLIENT_CLOSE_REASON.LEAVE_GAME);
    expect(roomIds).toEqual(['ABCD', 'ABCD', null]);
    expect(disconnects()).toEqual([expect.objectContaining({ reason: 'leave_game', intentional: true })]);
  });

  it('reports a connect timeout once and clears the stale room', () => {
    const { telemetry, roomIds, disconnects } = setup();
    telemetry.connecting('ABCD');
    telemetry.connectTimedOut();
    // The timed-out socket closing later, or a retry replacing it, is not a second disconnect.
    telemetry.socketClosed({ code: 1006, reason: '', wasClean: false, intentional: false });
    telemetry.replaced('ABCD', 'ABCD');
    expect(disconnects()).toEqual([expect.objectContaining({ code: 4008, reason: 'connect_timeout', intentional: false })]);
    expect(roomIds.at(-1)).toBeNull();
  });

  it('reports sockets replaced by connect() as reconnect or room switch', () => {
    const { telemetry, disconnects } = setup();
    telemetry.connecting('ABCD');
    telemetry.opened('ABCD');
    telemetry.replaced('ABCD', 'ABCD');
    telemetry.connecting('ABCD');
    telemetry.opened('ABCD');
    telemetry.replaced('ABCD', 'WXYZ');
    telemetry.connecting('WXYZ');
    expect(disconnects().map((d) => d.reason)).toEqual([CLIENT_CLOSE_REASON.RECONNECT, CLIENT_CLOSE_REASON.ROOM_SWITCH]);
  });

  it('reports a server close exactly once and loses in-flight commands', () => {
    const { telemetry, tracked, advance } = setup();
    telemetry.connecting('ABCD');
    telemetry.opened('ABCD');
    telemetry.commandSent('req-1', 'START_GAME');
    advance(50);
    telemetry.socketClosed({ code: 1006, reason: '', wasClean: false, intentional: false });
    telemetry.left(CLIENT_CLOSE_REASON.DISCONNECT);
    expect(tracked.filter((e) => e.type === 'ws.disconnected')).toHaveLength(1);
    expect(tracked.find((e) => e.type === 'command.rtt')?.payload).toMatchObject({ requestId: 'req-1', outcome: 'lost', rttMs: 50 });
  });

  it('clears the room when the socket cannot be created', () => {
    const { telemetry, roomIds, tracked } = setup();
    telemetry.connecting('ABCD');
    telemetry.connectFailed();
    telemetry.connectTimedOut();
    expect(roomIds).toEqual(['ABCD', null]);
    expect(tracked.filter((e) => e.type === 'ws.disconnected')).toHaveLength(0);
  });
});
