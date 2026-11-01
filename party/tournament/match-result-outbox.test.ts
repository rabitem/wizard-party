import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchProgressReport, MatchResultReport } from '../../shared/tournament';
import { DELIVERY_BACKOFF, type DeliveryResult } from '../utils/http-delivery';
import type { MatchResultDelivery, MatchResultTransport } from './http-match-result-transport';
import { MatchResultOutbox, type DeliveredMatchResult } from './match-result-outbox';
import { MATCH_RESULT_OUTBOX } from './match-room.constants';
import { MemoryOutboxStorage } from '../test-support/memory-outbox-storage';
import { RecordingAlarm, TEST_MATCH_ID, TEST_NOW, TEST_ROOM, TEST_TOURNAMENT_ID, settle } from './tournament-test-support';

function report(mid = TEST_MATCH_ID): MatchResultReport {
  return {
    v: 1,
    tid: TEST_TOURNAMENT_ID,
    mid,
    room: TEST_ROOM,
    gameId: `${TEST_ROOM}:${TEST_NOW}`,
    completedAt: TEST_NOW,
    standings: [{ uid: 'user-a', placement: 1, score: 40, rounds: [], noShow: false, botTakeover: false }],
  };
}

function ping(round: number, at = TEST_NOW + round, mid = TEST_MATCH_ID): MatchProgressReport {
  return { v: 1, kind: 'progress', tid: TEST_TOURNAMENT_ID, mid, room: TEST_ROOM, gameId: `${TEST_ROOM}:${TEST_NOW}`, round, maxRounds: 10, at };
}

const RECORDED: MatchResultDelivery = { status: 'delivered', outcome: 'recorded' };

/** Answers results and pings from scripts (delivered once a script ran out); records the order of everything sent. */
class ScriptedTransport implements MatchResultTransport {
  /** Results as their match id, pings as `progress:<round>`. */
  readonly sent: string[] = [];
  /** Runs while a ping is on its way (to enqueue something "meanwhile"). */
  onProgress: (() => void) | null = null;

  constructor(
    private readonly results: MatchResultDelivery[],
    private readonly pings: DeliveryResult[] = []
  ) {}

  send(sent: MatchResultReport): Promise<MatchResultDelivery> {
    this.sent.push(sent.mid);
    return Promise.resolve(this.results.shift() ?? RECORDED);
  }

  sendProgress(sent: MatchProgressReport): Promise<DeliveryResult> {
    this.sent.push(`progress:${sent.round}`);
    this.onProgress?.();
    return Promise.resolve(this.pings.shift() ?? { status: 'delivered' });
  }
}

function setup(results: MatchResultDelivery[] = [], pings: DeliveryResult[] = []) {
  const storage = new MemoryOutboxStorage();
  const alarm = new RecordingAlarm();
  const transport = new ScriptedTransport(results, pings);
  const logs: Record<string, unknown>[] = [];
  const outbox = new MatchResultOutbox({ storage, transport, alarm, now: () => Date.now(), log: (entry) => logs.push(entry) });
  const delivered: DeliveredMatchResult[] = [];
  outbox.onResultDelivered((outcome) => delivered.push(outcome));
  const keys = (prefix: string) => [...storage.data.keys()].filter((key) => key.startsWith(prefix));
  const pending = () => keys(MATCH_RESULT_OUTBOX.PENDING_PREFIX);
  const dead = () => keys(MATCH_RESULT_OUTBOX.DEAD_LETTER_PREFIX);
  const progress = () => keys(MATCH_RESULT_OUTBOX.PROGRESS_PREFIX);
  return { storage, alarm, transport, outbox, pending, dead, progress, delivered, logs };
}

describe('MatchResultOutbox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store the report at once and deliver it right after', async () => {
    const { outbox, transport, alarm, pending } = setup();

    outbox.enqueue(report());
    expect(pending()).toEqual([`${MATCH_RESULT_OUTBOX.PENDING_PREFIX}${TEST_MATCH_ID}`]);
    expect(alarm.at).toBe(TEST_NOW + MATCH_RESULT_OUTBOX.SAFETY_NET_MS);

    await vi.runAllTimersAsync();

    expect(transport.sent).toEqual([TEST_MATCH_ID]);
    expect(pending()).toEqual([]);
    expect(alarm.at).toBeNull();
  });

  it('should keep one entry per match when the same result is enqueued twice', async () => {
    const { outbox, transport } = setup();

    outbox.enqueue(report());
    outbox.enqueue(report());
    await vi.runAllTimersAsync();

    expect(transport.sent).toEqual([TEST_MATCH_ID]);
  });

  it('should retry with growing backoff and deliver once the server answers', async () => {
    const { outbox, transport, alarm, pending } = setup([
      { status: 'retry', reason: 'HTTP 503' },
      { status: 'retry', reason: 'HTTP 401' },
    ]);

    outbox.enqueue(report());
    await vi.runAllTimersAsync();
    expect(alarm.at).toBe(TEST_NOW + DELIVERY_BACKOFF.BASE_MS);

    await outbox.flush();
    expect(alarm.at).toBe(TEST_NOW + DELIVERY_BACKOFF.BASE_MS * 2);
    expect(pending()).toHaveLength(1);

    await outbox.flush();
    expect(transport.sent).toEqual([TEST_MATCH_ID, TEST_MATCH_ID, TEST_MATCH_ID]);
    expect(pending()).toEqual([]);
    expect(alarm.at).toBeNull();
  });

  it('should wait for the backoff instead of flushing new results while the server is failing', async () => {
    const { outbox, transport } = setup([{ status: 'retry', reason: 'network' }]);
    outbox.enqueue(report('abcdefghjk23-1-1'));
    await vi.runAllTimersAsync();

    outbox.enqueue(report('abcdefghjk23-1-2'));
    await vi.runAllTimersAsync();

    expect(transport.sent).toEqual(['abcdefghjk23-1-1']);
  });

  it('should park results the server will never accept and go on with the rest', async () => {
    const { outbox, transport, pending, dead } = setup([{ status: 'rejected', reason: 'HTTP 422' }]);

    outbox.enqueue(report('abcdefghjk23-1-1'));
    outbox.enqueue(report('abcdefghjk23-1-2'));
    await vi.runAllTimersAsync();

    expect(transport.sent).toEqual(['abcdefghjk23-1-1', 'abcdefghjk23-1-2']);
    expect(pending()).toEqual([]);
    expect(dead()).toEqual([`${MATCH_RESULT_OUTBOX.DEAD_LETTER_PREFIX}abcdefghjk23-1-1`]);
  });

  it('should share one delivery run between concurrent flushes', async () => {
    const { outbox, transport } = setup();
    outbox.enqueue(report());

    await Promise.all([outbox.flush(), outbox.flush()]);

    expect(transport.sent).toEqual([TEST_MATCH_ID]);
  });

  it('should resume delivery of results left over from before a restart', async () => {
    const { storage, alarm } = setup();
    await storage.put({ [`${MATCH_RESULT_OUTBOX.PENDING_PREFIX}${TEST_MATCH_ID}`]: report() });
    await storage.put({ [`${MATCH_RESULT_OUTBOX.PROGRESS_PREFIX}abcdefghjk23-1-1`]: ping(3, TEST_NOW, 'abcdefghjk23-1-1') });
    const transport = new ScriptedTransport([]);
    const restarted = new MatchResultOutbox({ storage, transport, alarm, log: () => undefined });

    await restarted.resume();
    expect(alarm.at).toBe(TEST_NOW);
    await restarted.flush();
    await settle();

    expect(transport.sent).toEqual([TEST_MATCH_ID, 'progress:3']);
  });

  it('should not arm anything on resume when nothing is pending', async () => {
    const { outbox, alarm } = setup();

    await outbox.resume();

    expect(alarm.at).toBeNull();
  });

  describe('server outcome', () => {
    it('should tell the listener what the server made of a delivered result', async () => {
      const { outbox, delivered } = setup([{ status: 'delivered', outcome: 'superseded' }]);

      outbox.enqueue(report());
      await vi.runAllTimersAsync();

      expect(delivered).toEqual([{ matchId: TEST_MATCH_ID, outcome: 'superseded' }]);
    });

    it('should tell nobody about results it is still retrying', async () => {
      const { outbox, delivered } = setup([{ status: 'retry', reason: 'HTTP 503' }]);

      outbox.enqueue(report());
      await vi.runAllTimersAsync();

      expect(delivered).toEqual([]);
    });

    it('should tell the listener about results the server refused for good, so the table never says they count', async () => {
      const { outbox, delivered, dead } = setup([{ status: 'retry', reason: 'HTTP 503' }, { status: 'rejected', reason: 'HTTP 422' }]);

      outbox.enqueue(report());
      await vi.runAllTimersAsync();
      await outbox.flush();

      expect(delivered).toEqual([{ matchId: TEST_MATCH_ID, outcome: 'rejected' }]);
      expect(dead()).toHaveLength(1);
    });

    it('should tell the listener while the report is still stored, so the answer and the removal are saved together', async () => {
      const { outbox, pending } = setup([{ status: 'delivered', outcome: 'superseded' }]);
      const pendingWhenTold: string[][] = [];
      outbox.onResultDelivered(() => pendingWhenTold.push(pending()));

      outbox.enqueue(report());
      await vi.runAllTimersAsync();

      expect(pendingWhenTold).toEqual([[`${MATCH_RESULT_OUTBOX.PENDING_PREFIX}${TEST_MATCH_ID}`]]);
      expect(pending()).toEqual([]);
    });

    it('should keep delivering when the listener throws', async () => {
      const { outbox, transport, pending } = setup();
      outbox.onResultDelivered(() => {
        throw new Error('listener broke');
      });

      outbox.enqueue(report('abcdefghjk23-1-1'));
      outbox.enqueue(report('abcdefghjk23-1-2'));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['abcdefghjk23-1-1', 'abcdefghjk23-1-2']);
      expect(pending()).toEqual([]);
    });
  });

  describe('progress pings', () => {
    it('should keep only the newest ping of a match and send it', async () => {
      const { outbox, transport, progress } = setup();

      outbox.enqueueProgress(ping(2));
      outbox.enqueueProgress(ping(3));
      expect(progress()).toEqual([`${MATCH_RESULT_OUTBOX.PROGRESS_PREFIX}${TEST_MATCH_ID}`]);
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['progress:3']);
      expect(progress()).toEqual([]);
    });

    it('should deliver waiting results before any ping', async () => {
      const { outbox, transport } = setup();

      outbox.enqueueProgress(ping(2, TEST_NOW, 'abcdefghjk23-1-2'));
      outbox.enqueue(report('abcdefghjk23-1-1'));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['abcdefghjk23-1-1', 'progress:2']);
    });

    it('should never send a ping once the result of its match was enqueued', async () => {
      const { outbox, transport, progress } = setup();

      outbox.enqueueProgress(ping(2));
      outbox.enqueue(report());
      outbox.enqueueProgress(ping(3));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual([TEST_MATCH_ID]);
      expect(progress()).toEqual([]);
    });

    it('should send a newer ping that replaced the one on its way', async () => {
      const { outbox, transport, progress } = setup();
      transport.onProgress = () => {
        transport.onProgress = null;
        outbox.enqueueProgress(ping(4));
      };

      outbox.enqueueProgress(ping(3));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['progress:3', 'progress:4']);
      expect(progress()).toEqual([]);
    });

    it('should drop a ping the server refuses (an app from before pings), never park it', async () => {
      const { outbox, transport, progress, dead, logs } = setup([], [{ status: 'rejected', reason: 'HTTP 422' }]);

      outbox.enqueueProgress(ping(2));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['progress:2']);
      expect(progress()).toEqual([]);
      expect(dead()).toEqual([]);
      expect(logs).toContainEqual(expect.objectContaining({ level: 'warn', msg: 'tournament_progress_dropped' }));
    });

    it('should retry a ping with its own backoff', async () => {
      const { outbox, transport, alarm, progress } = setup([], [{ status: 'retry', reason: 'HTTP 503' }]);

      outbox.enqueueProgress(ping(2));
      await vi.runAllTimersAsync();
      expect(alarm.at).toBe(TEST_NOW + DELIVERY_BACKOFF.BASE_MS);
      expect(progress()).toHaveLength(1);

      await outbox.flush();
      expect(transport.sent).toEqual(['progress:2', 'progress:2']);
      expect(progress()).toEqual([]);
      expect(alarm.at).toBeNull();
    });

    it('should leave newer pings to the armed alarm while pings back off', async () => {
      const { outbox, transport, alarm, progress } = setup([], [{ status: 'retry', reason: 'HTTP 409' }]);
      outbox.enqueueProgress(ping(2));
      await vi.runAllTimersAsync();

      outbox.enqueueProgress(ping(3));
      await vi.runAllTimersAsync();

      expect(transport.sent).toEqual(['progress:2']);
      expect(alarm.at).toBe(TEST_NOW + DELIVERY_BACKOFF.BASE_MS);
      expect(progress()).toHaveLength(1);
    });

    it('should deliver a result at once while a ping of another match backs off', async () => {
      const { outbox, transport, alarm, progress } = setup([], [{ status: 'retry', reason: 'HTTP 409' }]);
      outbox.enqueueProgress(ping(2, TEST_NOW, 'abcdefghjk23-1-2'));
      await vi.runAllTimersAsync();
      expect(alarm.at).toBe(TEST_NOW + DELIVERY_BACKOFF.BASE_MS);

      outbox.enqueue(report('abcdefghjk23-1-1'));
      await vi.runAllTimersAsync();

      // The result went out right away; the waiting ping rode along with that flush.
      expect(transport.sent).toEqual(['progress:2', 'abcdefghjk23-1-1', 'progress:2']);
      expect(progress()).toEqual([]);
      expect(alarm.at).toBeNull();
    });
  });
});
