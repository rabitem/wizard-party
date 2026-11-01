import { describe, expect, it } from 'vitest';

import { ACCOUNT_LIMITS } from '../../../domain/account';
import type { ScoredGameResult } from '../../ports/account';
import { MemoryGameResults } from './account-test-fakes';
import {
  ListGameHistoryUseCase,
  PinGameUseCase,
  UnpinGameUseCase,
  decodeHistoryCursor,
  encodeHistoryCursor,
} from './game-history.use-cases';

const NOW = 1_800_000_000_000;
const clock = { now: () => NOW };

const game = (n: number, playedAt = NOW - n * 60_000): ScoredGameResult => ({
  clientGameId: `game-${String(n).padStart(4, '0')}`,
  playedAt,
  playerCount: 4,
  placement: 1,
  score: 100,
  rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }],
  xp: 50,
  pinnedAt: null,
});

function seeded(count: number, playedAt?: number) {
  const repo = new MemoryGameResults();
  repo.rows.set('u1', Array.from({ length: count }, (_, i) => game(i, playedAt)));
  return repo;
}

describe('history cursor', () => {
  it('should round-trip and reject anything else', () => {
    const position = { playedAt: NOW, clientGameId: 'game-abc_DEF-123' };
    const cursor = encodeHistoryCursor(position);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeHistoryCursor(cursor)).toEqual(position);

    expect(decodeHistoryCursor('')).toBeNull();
    expect(decodeHistoryCursor('not base64!')).toBeNull();
    expect(decodeHistoryCursor(btoa('{"a":1}'))).toBeNull();
    expect(decodeHistoryCursor(encodeHistoryCursor({ playedAt: -1, clientGameId: 'game-0000' }))).toBeNull();
    expect(decodeHistoryCursor(encodeHistoryCursor({ playedAt: 1.5, clientGameId: 'game-0000' }))).toBeNull();
    expect(decodeHistoryCursor(encodeHistoryCursor({ playedAt: NOW, clientGameId: 'short' }))).toBeNull();
    expect(decodeHistoryCursor('A'.repeat(500))).toBeNull();
  });
});

describe('ListGameHistoryUseCase', () => {
  it('should page through every game newest first without gaps or duplicates', async () => {
    const repo = seeded(45);
    const useCase = new ListGameHistoryUseCase(repo);

    const first = await useCase.execute('u1');
    expect(first.games).toHaveLength(ACCOUNT_LIMITS.HISTORY_PAGE_SIZE);
    expect(first.games[0].clientGameId).toBe('game-0000');
    expect(first.pinned).toEqual([]);
    expect(first.nextCursor).not.toBeNull();

    const second = await useCase.execute('u1', { cursor: first.nextCursor });
    expect(second.pinned).toBeUndefined();
    const third = await useCase.execute('u1', { cursor: second.nextCursor });
    expect(third.games).toHaveLength(5);
    expect(third.nextCursor).toBeNull();

    const ids = [...first.games, ...second.games, ...third.games].map((g) => g.clientGameId);
    expect(new Set(ids).size).toBe(45);
  });

  it('should break ties on the game id when games share a timestamp', async () => {
    const repo = seeded(5, NOW);
    const useCase = new ListGameHistoryUseCase(repo);
    const first = await useCase.execute('u1', { limit: '2' });
    const rest = await useCase.execute('u1', { cursor: first.nextCursor, limit: 10 });
    expect([...first.games, ...rest.games].map((g) => g.clientGameId)).toEqual(['game-0004', 'game-0003', 'game-0002', 'game-0001', 'game-0000']);
    expect(rest.nextCursor).toBeNull();
  });

  it('should return no cursor when the page is exactly full', async () => {
    const page = await new ListGameHistoryUseCase(seeded(3)).execute('u1', { limit: 3 });
    expect(page.games).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });

  it('should reject invalid cursors and limits', async () => {
    const useCase = new ListGameHistoryUseCase(seeded(1));
    await expect(useCase.execute('u1', { cursor: 'garbage!' })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', { cursor: 42 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', { limit: 0 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', { limit: '2.5' })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', { limit: ACCOUNT_LIMITS.MAX_HISTORY_PAGE_SIZE + 1 })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('PinGameUseCase / UnpinGameUseCase', () => {
  it('should pin idempotently, keeping the first pin time', async () => {
    const repo = seeded(3);
    const pin = new PinGameUseCase(repo, clock);
    await expect(pin.execute('u1', 'game-0001')).resolves.toEqual({ clientGameId: 'game-0001', pinnedAt: NOW });

    const later = new PinGameUseCase(repo, { now: () => NOW + 5000 });
    await expect(later.execute('u1', 'game-0001')).resolves.toEqual({ clientGameId: 'game-0001', pinnedAt: NOW });
    expect(await repo.countPinned('u1')).toBe(1);

    const page = await new ListGameHistoryUseCase(repo).execute('u1');
    expect(page.pinned?.map((g) => g.clientGameId)).toEqual(['game-0001']);
  });

  it('should enforce the pin limit but still allow re-pinning', async () => {
    const repo = seeded(ACCOUNT_LIMITS.MAX_PINNED_GAMES + 1);
    const pin = new PinGameUseCase(repo, clock);
    // eslint-disable-next-line no-await-in-loop -- pins must apply in order
    for (let i = 0; i < ACCOUNT_LIMITS.MAX_PINNED_GAMES; i++) await pin.execute('u1', game(i).clientGameId);

    const overflow = game(ACCOUNT_LIMITS.MAX_PINNED_GAMES).clientGameId;
    await expect(pin.execute('u1', overflow)).rejects.toMatchObject({ code: 'quota_exceeded' });
    await expect(pin.execute('u1', 'game-0000')).resolves.toMatchObject({ pinnedAt: NOW });

    await new UnpinGameUseCase(repo).execute('u1', 'game-0000');
    await expect(pin.execute('u1', overflow)).resolves.toMatchObject({ clientGameId: overflow });
  });

  it('should report unknown games as not found', async () => {
    const repo = seeded(1);
    await expect(new PinGameUseCase(repo, clock).execute('u1', 'game-9999')).rejects.toMatchObject({ code: 'not_found' });
    await expect(new PinGameUseCase(repo, clock).execute('u1', '../etc')).rejects.toMatchObject({ code: 'not_found' });
    await expect(new UnpinGameUseCase(repo).execute('u1', 'game-9999')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('should unpin idempotently', async () => {
    const repo = seeded(1);
    const unpin = new UnpinGameUseCase(repo);
    await unpin.execute('u1', 'game-0000');
    await unpin.execute('u1', 'game-0000');
    expect(repo.rows.get('u1')?.[0].pinnedAt).toBeNull();
  });
});
