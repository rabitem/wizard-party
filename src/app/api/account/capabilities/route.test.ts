import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: () => true }));

beforeEach(() => {
  // A provider is offered only when both of its env vars exist (social-providers.ts).
  vi.stubEnv('GITHUB_CLIENT_ID', 'github-id');
  vi.stubEnv('GITHUB_CLIENT_SECRET', 'github-secret');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
  vi.stubEnv('DISCORD_CLIENT_ID', '');
  vi.stubEnv('DISCORD_CLIENT_SECRET', '');
  vi.stubEnv('RESEND_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/account/capabilities', () => {
  it('should report the configured sign-in methods and tournaments, publicly cacheable for five minutes', async () => {
    vi.stubEnv('TOURNAMENT_SECRET', 'secret');

    const response = GET();

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await response.json()).toEqual({ providers: ['github'], email: false, passkeys: true, tournaments: true });
  });

  it('should report tournaments off without TOURNAMENT_SECRET', async () => {
    vi.stubEnv('TOURNAMENT_SECRET', '');

    expect(((await GET().json()) as { tournaments: boolean }).tournaments).toBe(false);
  });
});
