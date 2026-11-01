import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { tournamentSecret } from './tournament-config';

const env = (vars: Record<string, string> = {}): NodeJS.ProcessEnv => ({ NODE_ENV: 'test', ...vars });

describe('tournamentSecret', () => {
  it('should read TOURNAMENT_SECRET without surrounding whitespace', () => {
    expect(tournamentSecret(env({ TOURNAMENT_SECRET: '  s3cret\n' }))).toBe('s3cret');
  });

  it('should treat a missing or blank secret as unavailable', () => {
    expect(tournamentSecret(env())).toBeNull();
    expect(tournamentSecret(env({ TOURNAMENT_SECRET: '   ' }))).toBeNull();
  });
});
