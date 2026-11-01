import { describe, expect, it, vi } from 'vitest';

import { ClientCommandType } from '../../shared/domain';
import { COMMAND_RATE_LIMITS, MAX_RATE_LIMITED_SENDERS } from '../config/command-rate-limits.config';
import { CommandRateLimiter } from './command-rate-limiter';
import { CommitGate } from './commit-gate';
import { ProcessedCommandLog } from './processed-commands';

const NOW = 1_700_000_000_000;

/** `count` commands of `type` from `sender` at the same instant (no refill in between). */
function attempts(limiter: CommandRateLimiter, sender: string, type: ClientCommandType, count: number): boolean[] {
  return Array.from({ length: count }, () => limiter.tryAcquire(sender, type, NOW));
}

describe('CommandRateLimiter', () => {
  it('allows a burst, then refuses until the bucket refills', () => {
    const { burst, refillPerSecond } = COMMAND_RATE_LIMITS.social;
    const limiter = new CommandRateLimiter();

    for (let i = 0; i < burst; i++) {
      expect(limiter.tryAcquire('seat-a', ClientCommandType.SEND_EMOTE, NOW)).toBe(true);
    }
    expect(limiter.tryAcquire('seat-a', ClientCommandType.SEND_EMOTE, NOW)).toBe(false);

    const oneToken = Math.ceil(1000 / refillPerSecond);
    expect(limiter.tryAcquire('seat-a', ClientCommandType.SEND_EMOTE, NOW + oneToken)).toBe(true);
    expect(limiter.tryAcquire('seat-a', ClientCommandType.SEND_EMOTE, NOW + oneToken)).toBe(false);
  });

  it('keeps separate budgets per sender and per command class', () => {
    const limiter = new CommandRateLimiter();
    const { burst } = COMMAND_RATE_LIMITS.social;

    // Chat and emotes draw on one social budget.
    expect(attempts(limiter, 'seat-a', ClientCommandType.SEND_CHAT, burst).every(Boolean)).toBe(true);
    expect(limiter.tryAcquire('seat-a', ClientCommandType.SEND_EMOTE, NOW)).toBe(false);
    expect(limiter.tryAcquire('seat-b', ClientCommandType.SEND_EMOTE, NOW)).toBe(true);
    expect(limiter.tryAcquire('seat-a', ClientCommandType.PLACE_BID, NOW)).toBe(true);
  });

  it('starts a released sender with a full bucket', () => {
    const limiter = new CommandRateLimiter();
    const { burst } = COMMAND_RATE_LIMITS.sync;
    expect(attempts(limiter, 'conn-1', ClientCommandType.REQUEST_STATE, burst + 1)).toEqual([...Array<boolean>(burst).fill(true), false]);

    limiter.release('conn-1');
    expect(attempts(limiter, 'conn-1', ClientCommandType.REQUEST_STATE, burst + 1)).toEqual([...Array<boolean>(burst).fill(true), false]);
  });

  it('bounds the number of tracked senders', () => {
    const limiter = new CommandRateLimiter();
    const { burst } = COMMAND_RATE_LIMITS.sync;
    attempts(limiter, 'first', ClientCommandType.REQUEST_STATE, burst);
    expect(limiter.tryAcquire('first', ClientCommandType.REQUEST_STATE, NOW)).toBe(false);

    for (let sender = 0; sender < MAX_RATE_LIMITED_SENDERS; sender++) {
      limiter.tryAcquire(`sender-${sender}`, ClientCommandType.REQUEST_STATE, NOW);
    }

    // The oldest sender was evicted to make room, so it starts over with a full bucket.
    expect(limiter.tryAcquire('first', ClientCommandType.REQUEST_STATE, NOW)).toBe(true);
  });

  it('lets a host sweep a rules slider back and forth without a refused (last-write-wins) update', () => {
    const limiter = new CommandRateLimiter();
    const VOLUME_SLIDER_STEPS = 21;
    const EVENT_INTERVAL_MS = 16;

    for (let step = 0; step < 2 * VOLUME_SLIDER_STEPS; step++) {
      expect(limiter.tryAcquire('host', ClientCommandType.SET_RULESET, NOW + step * EVENT_INTERVAL_MS)).toBe(true);
    }
    // Rules and lobby actions have separate budgets: the sweep does not cost the host a ready toggle.
    expect(limiter.tryAcquire('host', ClientCommandType.SET_READY, NOW)).toBe(true);
  });

  it('lets a player save several settings in a row (each one resends the sound preferences)', () => {
    const limiter = new CommandRateLimiter();
    for (let save = 0; save < COMMAND_RATE_LIMITS.sound.burst; save++) {
      expect(limiter.tryAcquire('seat-a', ClientCommandType.UPDATE_SOUND_PREFERENCES, NOW)).toBe(true);
    }
    expect(limiter.tryAcquire('seat-a', ClientCommandType.UPDATE_SOUND_PREFERENCES, NOW)).toBe(false);
    expect(limiter.tryAcquire('seat-a', ClientCommandType.UPDATE_SOUND_PREFERENCES, NOW + 1_000)).toBe(true);
  });
});

describe('CommitGate', () => {
  it('writes the state before the transaction sends anything', () => {
    const log: string[] = [];
    const gate = new CommitGate(() => log.push('persist'));

    gate.run(() => {
      gate.deliver(() => log.push('send 1'));
      gate.requestSave();
      gate.deliver(() => log.push('send 2'));
      log.push('handler done');
    });

    expect(log).toEqual(['handler done', 'persist', 'send 1', 'send 2']);
  });

  it('commits once, at the end of the outermost transaction', () => {
    const persist = vi.fn();
    const gate = new CommitGate(persist);
    const sent: string[] = [];

    gate.run(() => {
      gate.run(() => {
        gate.requestSave();
        gate.deliver(() => sent.push('inner'));
      });
      expect(sent).toEqual([]);
      gate.requestSave();
    });

    expect(persist).toHaveBeenCalledTimes(1);
    expect(sent).toEqual(['inner']);
  });

  it('still commits when the work throws', () => {
    const persist = vi.fn();
    const gate = new CommitGate(persist);
    const sent: string[] = [];

    expect(() => gate.run(() => {
      gate.requestSave();
      gate.deliver(() => sent.push('error reply'));
      throw new Error('boom');
    })).toThrow('boom');

    expect(persist).toHaveBeenCalledTimes(1);
    expect(sent).toEqual(['error reply']);
  });

  it('sends without a write when nothing asked for one, and immediately outside a transaction', () => {
    const persist = vi.fn();
    const gate = new CommitGate(persist);
    const sent: string[] = [];

    gate.run(() => gate.deliver(() => sent.push('pong')));
    gate.deliver(() => sent.push('direct'));
    gate.requestSave();

    expect(sent).toEqual(['pong', 'direct']);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps delivering after one socket fails', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const gate = new CommitGate(() => undefined);
    const sent: string[] = [];

    gate.run(() => {
      gate.deliver(() => { throw new Error('socket closed'); });
      gate.deliver(() => sent.push('next'));
    });

    expect(sent).toEqual(['next']);
    vi.restoreAllMocks();
  });
});

describe('ProcessedCommandLog', () => {
  it('remembers applied requestIds per seat within the window', () => {
    const log = new ProcessedCommandLog([], 1_000, 10);
    log.mark('seat-a', 'req-1', NOW);

    expect(log.has('seat-a', 'req-1', NOW + 500)).toBe(true);
    expect(log.has('seat-b', 'req-1', NOW + 500)).toBe(false);
    expect(log.has('seat-a', 'req-1', NOW + 1_001)).toBe(false);
  });

  it('forgets a command that failed so it can be retried', () => {
    const log = new ProcessedCommandLog();
    log.mark('seat-a', 'req-1', NOW);
    log.unmark('seat-a', 'req-1');

    expect(log.has('seat-a', 'req-1', NOW)).toBe(false);
    expect(log.toJSON()).toEqual([]);
  });

  it('keeps only the newest requestIds of a seat', () => {
    const log = new ProcessedCommandLog([], 60_000, 2);
    log.mark('seat-a', 'req-1', NOW);
    log.mark('seat-a', 'req-2', NOW + 1);
    log.mark('seat-a', 'req-3', NOW + 2);

    expect(log.toJSON()).toEqual([['seat-a', [['req-2', NOW + 1], ['req-3', NOW + 2]]]]);
  });

  it('round-trips through its persisted form', () => {
    const log = new ProcessedCommandLog();
    log.mark('seat-a', 'req-1', NOW);

    const restored = new ProcessedCommandLog(log.toJSON());
    expect(restored.has('seat-a', 'req-1', NOW + 1)).toBe(true);
  });
});
