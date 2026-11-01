import { afterEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_TELEMETRY_LIMITS } from '@shared/telemetry';

import { APP_VERSION_FALLBACK } from '@/lib/app-version';

import { GET } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/version', () => {
  it('should answer the deployed commit, never cached, so open tabs notice a new release', async () => {
    const sha = 'a'.repeat(40);
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', sha);

    const response = GET();

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ version: sha.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_APP_VERSION_CHARS) });
  });

  it('should answer the unversioned fallback outside Vercel builds', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', '');

    expect(await GET().json()).toEqual({ version: APP_VERSION_FALLBACK });
  });
});
