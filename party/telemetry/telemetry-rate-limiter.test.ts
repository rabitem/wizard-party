import { describe, expect, it } from 'vitest';

import { Game, Player } from '../../shared/domain';
import {
  CommandRejectionCode,
  TelemetryEventType,
  TelemetrySuppressionScope,
  type AnyTelemetryEnvelope,
} from '../../shared/telemetry';
import { commandRejectedFact, rejectionWithCode } from './command-rejection';
import {
  MAX_RATE_LIMITED_SENDERS,
  TELEMETRY_RATE_LIMITS,
  TELEMETRY_RATE_LIMIT_WINDOW_MS,
  TelemetryRateLimiter,
} from './telemetry-rate-limiter';
import { INITIAL_TELEMETRY_CURSOR, TelemetryRecorder, type TelemetrySink } from './telemetry-recorder';

const WINDOW_MS = TELEMETRY_RATE_LIMIT_WINDOW_MS;
const REJECTED = TelemetryEventType.COMMAND_REJECTED;
const PER_SENDER = TELEMETRY_RATE_LIMITS[REJECTED]?.perSender ?? 0;
const PER_ROOM = TELEMETRY_RATE_LIMITS[REJECTED]?.perRoom ?? 0;

function admitMany(rateLimiter: TelemetryRateLimiter, sender: string | null, count: number, now = 0) {
  return Array.from({ length: count }, () => rateLimiter.admit(REJECTED, sender, now));
}

function admittedCount(admissions: { admitted: boolean }[]): number {
  return admissions.filter((admission) => admission.admitted).length;
}

describe('TelemetryRateLimiter', () => {
  it('never limits fact types without a policy', () => {
    const rateLimiter = new TelemetryRateLimiter();
    const admissions = Array.from({ length: PER_ROOM + 50 }, () => rateLimiter.admit(TelemetryEventType.CARD_PLAYED, 'a', 0));
    expect(admissions.every((admission) => admission.admitted)).toBe(true);
  });

  it('limits each sender and reports the suppressed count when the next window starts', () => {
    const rateLimiter = new TelemetryRateLimiter();
    const admissions = admitMany(rateLimiter, 'a', PER_SENDER + 3);
    expect(admittedCount(admissions)).toBe(PER_SENDER);
    expect(admissions.at(-1)?.admitted).toBe(false);
    expect(rateLimiter.admit(REJECTED, 'b', 0).admitted).toBe(true);

    expect(rateLimiter.admit(REJECTED, 'a', WINDOW_MS)).toEqual({
      admitted: true,
      reports: [{ factType: REJECTED, scope: TelemetrySuppressionScope.SENDER, senderKey: 'a', suppressedCount: 3, windowMs: WINDOW_MS }],
    });
  });

  it('limits the whole room so rotating senders cannot bypass the sender limit', () => {
    const rateLimiter = new TelemetryRateLimiter();
    const admissions = Array.from({ length: PER_ROOM + 2 }, (_, sender) => rateLimiter.admit(REJECTED, `sender-${sender}`, 0));
    expect(admittedCount(admissions)).toBe(PER_ROOM);
    expect(admissions.slice(-2).map((admission) => admission.admitted)).toEqual([false, false]);
    expect(rateLimiter.admit(REJECTED, 'late', WINDOW_MS).reports).toEqual([
      expect.objectContaining({ scope: TelemetrySuppressionScope.ROOM, senderKey: null, suppressedCount: 2 }),
    ]);
  });

  it('applies the room budget to anonymous senders', () => {
    const rateLimiter = new TelemetryRateLimiter();
    const admissions = admitMany(rateLimiter, null, PER_ROOM + 1);
    expect(admittedCount(admissions)).toBe(PER_ROOM);
    expect(admissions.at(-1)?.admitted).toBe(false);
  });

  it('reports and forgets a released sender', () => {
    const rateLimiter = new TelemetryRateLimiter();
    admitMany(rateLimiter, 'a', PER_SENDER + 2);
    expect(rateLimiter.release('a')).toEqual([expect.objectContaining({ senderKey: 'a', suppressedCount: 2 })]);
    expect(rateLimiter.release('a')).toEqual([]);
    // Forgotten: the sender starts over with a fresh budget.
    expect(rateLimiter.admit(REJECTED, 'a', 0).admitted).toBe(true);
  });

  it('forgets the oldest sender beyond its bound, which then starts over with a fresh budget', () => {
    const rateLimiter = new TelemetryRateLimiter();
    admitMany(rateLimiter, 'first', PER_SENDER);
    expect(rateLimiter.admit(REJECTED, 'first', 0).admitted).toBe(false);

    // Chat has a room budget of its own, so these senders leave the rejection budget of the room alone.
    for (let sender = 0; sender < MAX_RATE_LIMITED_SENDERS; sender++) {
      rateLimiter.admit(TelemetryEventType.CHAT_SENT, `sender-${sender}`, 0);
    }

    expect(rateLimiter.admit(REJECTED, 'first', 0).admitted).toBe(true);
  });
});

describe('TelemetryRecorder rate limiting', () => {
  function setup() {
    const events: AnyTelemetryEnvelope[] = [];
    const sink: TelemetrySink = {
      loadCursor: () => Promise.resolve(INITIAL_TELEMETRY_CURSOR),
      append: (batch) => events.push(...batch),
    };
    let now = 0;
    const recorder = new TelemetryRecorder({ roomId: 'room', serverVersion: null, sink, now: () => now });
    const game = new Game('room', 'alice');
    game.addPlayer(new Player('alice', 'Alice', false));
    const fact = commandRejectedFact(null, rejectionWithCode(CommandRejectionCode.INVALID_JSON, 'x'), true);
    const reject = (senderKey: string) =>
      recorder.withCause({ source: 'player', senderKey }, () => recorder.record(fact, game));
    return { recorder, events, game, fact, reject, advance: (ms: number) => { now += ms; } };
  }

  it('drops facts beyond the budget without leaving sequence gaps', () => {
    const { events, reject, advance } = setup();
    for (let i = 0; i < PER_SENDER + 3; i++) reject('conn-1');
    advance(WINDOW_MS);
    reject('conn-1');

    expect(events.map((event) => event.seq)).toEqual(Array.from({ length: PER_SENDER + 2 }, (_, index) => index + 1));
    expect(events.map((event) => event.type)).toEqual([
      ...Array<string>(PER_SENDER).fill(REJECTED),
      TelemetryEventType.TELEMETRY_SUPPRESSED,
      REJECTED,
    ]);
    expect(events[PER_SENDER].payload).toEqual({
      factType: REJECTED,
      scope: TelemetrySuppressionScope.SENDER,
      senderKey: 'conn-1',
      suppressedCount: 3,
      windowMs: WINDOW_MS,
    });
  });

  it('falls back to the actor when no sender key is given', () => {
    const { recorder, events, game, fact } = setup();
    for (const actorId of [...Array<string>(PER_SENDER + 1).fill('alice'), 'bob']) {
      recorder.withCause({ source: 'player', actorId }, () => recorder.record(fact, game));
    }
    expect(events.map((event) => event.actorId)).toEqual([...Array<string>(PER_SENDER).fill('alice'), 'bob']);
  });
});
