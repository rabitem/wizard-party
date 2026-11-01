import { describe, expect, it } from 'vitest';

import { DEFAULT_APPEARANCE } from '../../../domain/character';
import type { PublicPlayerCard } from '../../../domain/social';
import type { IPublicProfileDirectory, ISocialThrottle } from '../../ports/social';
import { SearchPublicProfilesUseCase } from './directory.use-cases';
import { SocialError } from './social-error';

const ANN: PublicPlayerCard = { username: 'ann', displayName: 'Ann', avatar: 'wizard', appearance: DEFAULT_APPEARANCE, level: 7 };

function setup({ allow = true } = {}) {
  const queries: string[] = [];
  const directory: IPublicProfileDirectory = {
    async searchPublic(query) {
      queries.push(query);
      return [ANN];
    },
  };
  const throttled: string[] = [];
  const throttle: ISocialThrottle = {
    async allow(action, subject) {
      throttled.push(`${action}:${subject}`);
      return allow;
    },
  };
  return { useCase: new SearchPublicProfilesUseCase(directory, throttle), queries, throttled };
}

describe('SearchPublicProfilesUseCase', () => {
  it('searches the normalized query and charges the visitor', async () => {
    const { useCase, queries, throttled } = setup();
    await expect(useCase.execute('203.0.113.7', '  Ann ')).resolves.toEqual([ANN]);
    expect(queries).toEqual(['ann']);
    expect(throttled).toEqual(['public_profile_search:203.0.113.7']);
  });

  it.each([['too short', 'a'], ['missing', null], ['not text', 42]])('returns nothing for a %s query, without spending the budget', async (_, query) => {
    const { useCase, queries, throttled } = setup();
    await expect(useCase.execute('203.0.113.7', query)).resolves.toEqual([]);
    expect(queries).toEqual([]);
    expect(throttled).toEqual([]);
  });

  it('refuses a visitor over the budget', async () => {
    const { useCase, queries } = setup({ allow: false });
    await expect(useCase.execute('203.0.113.7', 'ann')).rejects.toMatchObject({ code: 'rate_limited' } satisfies Partial<SocialError>);
    expect(queries).toEqual([]);
  });
});
