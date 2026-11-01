import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { harness, setUpApiHarness } from '../api-test-support';
import { GET } from './route';

const app = vi.hoisted(() => ({ databaseConfigured: true }));

vi.mock('server-only', () => ({}));
// Next's data cache needs a running server; the route's own answer is what is under test.
vi.mock('next/cache', () => ({ unstable_cache: (load: () => unknown) => load }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => app.databaseConfigured }));
vi.mock('@/infrastructure/account/account-container', async () => (await import('../api-test-support')).accountContainerModule());

setUpApiHarness();

const readModels = () => harness().readModels;

beforeEach(() => {
  app.databaseConfigured = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/community-stats', () => {
  it('should answer the sanitized aggregate counts, publicly cacheable for a minute', async () => {
    readModels().community = { playingNow: '4', playersToday: 3, gamesToday: 12.7, registeredPlayers: -5 };

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    // Everyone playing now has played today; negative and fractional counts never leave the server.
    expect(await response.json()).toEqual({ playingNow: 4, playersToday: 4, gamesToday: 12, registeredPlayers: 0 });
  });

  it('should answer 503 without a database', async () => {
    app.databaseConfigured = false;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: 'unavailable' } });
  });

  it('should answer a storage failure with a bare 500 that leaks nothing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    readModels().failWith = new Error('connect ECONNREFUSED postgres://db.internal:5432');

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { code: 'internal' } });
    expect(log).toHaveBeenCalledTimes(1);
  });
});
