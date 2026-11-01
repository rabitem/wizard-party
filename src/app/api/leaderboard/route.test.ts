import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_STATS } from '@shared/domain/account';
import { DEFAULT_APPEARANCE } from '@shared/domain/character';
import type { LeaderboardCandidate } from '@shared/domain/account/leaderboard';

import { harness, setUpApiHarness } from '../api-test-support';
import { GET } from './route';

const app = vi.hoisted(() => ({ databaseConfigured: true }));

vi.mock('server-only', () => ({}));
// Next's data cache needs a running server; the route's own answer is what is under test.
vi.mock('next/cache', () => ({ unstable_cache: (load: () => unknown) => load, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => app.databaseConfigured }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../api-test-support')).accountContainerModule());

setUpApiHarness();

const readModels = () => harness().readModels;

function candidate(username: string, totalXp: number, gamesWon: number): LeaderboardCandidate {
  return { username, displayName: username.toUpperCase(), avatar: 'owl', appearance: DEFAULT_APPEARANCE, totalXp, stats: { ...EMPTY_STATS, gamesPlayed: gamesWon + 1, gamesWon } };
}

beforeEach(() => {
  app.databaseConfigured = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/leaderboard', () => {
  it('should answer the boards built from the public candidates, publicly cacheable for a minute', async () => {
    readModels().candidates = [candidate('merlin', 5000, 3), candidate('morgana', 9000, 1)];

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    const { boards } = (await response.json()) as { boards: Record<string, { username: string; rank: number }[]> };
    expect(boards.wins?.map((entry) => [entry.rank, entry.username])).toEqual([
      [1, 'merlin'],
      [2, 'morgana'],
    ]);
  });

  it('should answer 503 without a database', async () => {
    app.databaseConfigured = false;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: 'unavailable' } });
  });

  it('should answer a storage failure with a bare 500 that leaks nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    readModels().failWith = new Error('relation "player_progress" does not exist');

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'internal' } });
  });
});
