import { describe, expect, it } from 'vitest';

import { EMPTY_STATS } from '../../../domain/account/player-stats';
import type { PublicProfileSource } from '../../../domain/account/public-profile';
import type { IPublicProfileReader } from '../../ports/account/public-profile.port';
import { GetPublicProfileUseCase } from './public-profile.use-cases';

class MemoryReader implements IPublicProfileReader {
  lookups: string[] = [];
  constructor(private readonly rows: Record<string, PublicProfileSource>) {}
  async findByUsername(username: string) {
    this.lookups.push(username);
    return this.rows[username] ?? null;
  }
}

const merlin: PublicProfileSource = {
  username: 'merlin',
  displayUsername: 'Merlin',
  tagline: '',
  avatar: null,
  isPublic: true,
  showHistory: false,
  memberSince: 1,
  totalXp: 0,
  stats: EMPTY_STATS,
  achievements: [],
  pinnedGames: [],
  recentGames: [],
};

describe('GetPublicProfileUseCase', () => {
  describe('execute', () => {
    it('should look up the normalized handle and return the public view', async () => {
      const reader = new MemoryReader({ merlin });
      const profile = await new GetPublicProfileUseCase(reader).execute('  MERLIN ');
      expect(reader.lookups).toEqual(['merlin']);
      expect(profile).toMatchObject({ username: 'merlin', displayName: 'Merlin', avatar: 'wizard', recentGames: null });
    });

    it('should return null without a lookup for invalid or reserved handles', async () => {
      const reader = new MemoryReader({ merlin });
      const useCase = new GetPublicProfileUseCase(reader);
      const results = await Promise.all(['ab', 'bad..dots', 'admin', '../etc', 42, null].map(useCase.execute, useCase));
      expect(results).toEqual([null, null, null, null, null, null]);
      expect(reader.lookups).toEqual([]);
    });

    it('should return null for unknown and private profiles', async () => {
      const useCase = new GetPublicProfileUseCase(new MemoryReader({ morgana: { ...merlin, username: 'morgana', isPublic: false } }));
      expect(await useCase.execute('nobody')).toBeNull();
      expect(await useCase.execute('morgana')).toBeNull();
    });
  });
});
