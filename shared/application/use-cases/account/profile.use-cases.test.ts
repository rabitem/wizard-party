import { describe, expect, it } from 'vitest';

import { MemoryGameResults, MemoryProfiles, MemoryProgress, MemoryTournamentHistory } from './account-test-fakes';
import { AccountError } from './account-error';
import { ProgressCalculator } from './progress-calculator';
import { EnsureProfileUseCase, GetAccountOverviewUseCase, UpdateProfileUseCase } from './profile.use-cases';

const identity = { userId: 'u1' };
const clock = { now: () => 1 };

function setup() {
  const profiles = new MemoryProfiles();
  const ensure = new EnsureProfileUseCase(profiles, clock);
  return { profiles, ensure, update: new UpdateProfileUseCase(ensure, profiles) };
}

describe('EnsureProfileUseCase', () => {
  it('should create profiles public with a private history', async () => {
    const { ensure } = setup();
    expect(await ensure.execute(identity)).toMatchObject({ isPublic: true, showHistory: false });
  });
});

describe('GetAccountOverviewUseCase', () => {
  it('should create a profile lazily and validate updates', async () => {
    const { ensure, update } = setup();
    const results = new MemoryGameResults();
    const calculator = new ProgressCalculator(results, new MemoryProgress(clock), new MemoryTournamentHistory(), clock);
    const overview = await new GetAccountOverviewUseCase(ensure, calculator, results).execute(identity);
    expect(overview.profile).toMatchObject({ userId: 'u1', tagline: '' });

    await expect(update.execute(identity, { tagline: 'x'.repeat(200) })).rejects.toMatchObject({ code: 'invalid_input' });
    const updated = await update.execute(identity, { tagline: '  You shall not pass ' });
    expect(updated).toMatchObject({ tagline: 'You shall not pass' });
  });
});

describe('UpdateProfileUseCase', () => {
  describe('execute', () => {
    it('should update the visibility flags', async () => {
      const { update } = setup();
      const profile = await update.execute(identity, { isPublic: false, showHistory: true });
      expect(profile).toMatchObject({ isPublic: false, showHistory: true, tagline: '' });
    });

    it('should leave omitted flags untouched', async () => {
      const { update } = setup();
      await update.execute(identity, { showHistory: true });
      const profile = await update.execute(identity, { tagline: 'Hi' });
      expect(profile).toMatchObject({ isPublic: true, showHistory: true, tagline: 'Hi' });
    });

    it('should reject non-boolean flags', async () => {
      const { update } = setup();
      await expect(update.execute(identity, { isPublic: 'yes' })).rejects.toBeInstanceOf(AccountError);
      await expect(update.execute(identity, { showHistory: 1 })).rejects.toThrow('showHistory must be a boolean');
    });

    it('should reject a body that is not an object', async () => {
      const { update } = setup();
      await expect(update.execute(identity, null as never)).rejects.toBeInstanceOf(AccountError);
    });
  });
});
