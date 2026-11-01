import { describe, expect, it } from 'vitest';

import type { TournamentStatus } from '@shared/domain/tournament';

import { shouldPoll } from './useTournament';

const showing = (status: TournamentStatus) => ({ tournament: { status } }) as Parameters<typeof shouldPoll>[0];

describe('shouldPoll', () => {
  it('should poll a live tournament while the tab is visible', () => {
    expect(shouldPoll(showing('running'), 'ready', 'visible')).toBe(true);
    expect(shouldPoll(null, 'loading', 'visible')).toBe(true);
    expect(shouldPoll(showing('running'), 'ready', 'hidden')).toBe(false);
  });

  it('should stop once the tournament is settled', () => {
    expect(shouldPoll(showing('completed'), 'ready', 'visible')).toBe(false);
    expect(shouldPoll(showing('cancelled'), 'ready', 'visible')).toBe(false);
  });

  it('should not poll an unknown tournament or while tournaments are switched off', () => {
    expect(shouldPoll(null, 'not_found', 'visible')).toBe(false);
    expect(shouldPoll(null, 'unavailable', 'visible')).toBe(false);
    // A failed first read keeps trying.
    expect(shouldPoll(null, 'error', 'visible')).toBe(true);
  });
});
