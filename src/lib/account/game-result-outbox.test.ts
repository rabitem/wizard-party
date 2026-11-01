import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameResult } from '@shared/domain/account';

import { AccountApiError, accountApi } from './account-api';
import { GameResultOutbox } from './game-result-outbox';
import { recordFinishedGame, setGameResultSink } from './game-result-sink';

const result = (id: string): GameResult => ({
  clientGameId: `game-${id}-0000000`,
  playedAt: 1,
  playerCount: 3,
  placement: 1,
  score: 30,
  rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }],
});

const delivered = { recorded: [], newlyUnlocked: ['first-win'], stats: {}, progression: {}, achievements: [] } as never;

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  setGameResultSink(null);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GameResultOutbox', () => {
  it('should deliver games recorded through the active sink and report unlocks', async () => {
    const send = vi.spyOn(accountApi, 'recordGames').mockResolvedValue(delivered);
    const onDelivered = vi.fn();
    const outbox = new GameResultOutbox('u1', onDelivered);
    setGameResultSink(outbox);

    recordFinishedGame(result('a'));
    await vi.runAllTimersAsync();

    expect(send).toHaveBeenCalledWith([result('a')]);
    expect(onDelivered).toHaveBeenCalledWith(delivered);
    expect(outbox.pendingCount()).toBe(0);
  });

  it('should keep games across failures and retry them', async () => {
    const send = vi.spyOn(accountApi, 'recordGames')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(delivered);
    const outbox = new GameResultOutbox('u1', () => undefined);

    outbox.record(result('a'));
    await Promise.resolve();
    expect(outbox.pendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(outbox.pendingCount()).toBe(0);
  });

  it('should keep pending games across a reload', async () => {
    vi.spyOn(accountApi, 'recordGames').mockRejectedValue(new TypeError('offline'));
    const before = new GameResultOutbox('u1', () => undefined);
    before.record(result('a'));
    await Promise.resolve();
    before.dispose();

    expect(new GameResultOutbox('u1', () => undefined).pendingCount()).toBe(1);
  });

  it('should drop games the server rejects as invalid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const send = vi.spyOn(accountApi, 'recordGames').mockRejectedValue(new AccountApiError(422, 'invalid_input', 'bad'));
    const outbox = new GameResultOutbox('u1', () => undefined);
    outbox.record(result('a'));
    await vi.runAllTimersAsync();

    expect(send).toHaveBeenCalledTimes(1);
    expect(outbox.pendingCount()).toBe(0);
    expect(new GameResultOutbox('u1', () => undefined).pendingCount()).toBe(0);
  });
});
