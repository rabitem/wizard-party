import {
  ACCOUNT_LIMITS,
  DEFAULT_PROFILE_VISIBILITY,
  normalizeTagline,
  validateTagline,
  type PlayerProfile,
  type ProfileChanges,
} from '../../../domain/account';
import type { IClock, IGameResultRepository, IProfileRepository } from '../../ports/account';
import { AccountError } from './account-error';
import type { PlayerProgressView, ProgressCalculator } from './progress-calculator';

export interface AccountIdentity {
  userId: string;
}

export interface AccountOverview extends PlayerProgressView {
  profile: PlayerProfile;
  recentGames: Awaited<ReturnType<IGameResultRepository['listRecent']>>;
}

/** Profiles are created lazily, so every sign-in method gets one. */
export class EnsureProfileUseCase {
  constructor(
    private readonly profiles: IProfileRepository,
    private readonly clock: IClock
  ) {}

  async execute(identity: AccountIdentity): Promise<PlayerProfile> {
    const existing = await this.profiles.get(identity.userId);
    if (existing) return existing;
    return this.profiles.ensure({
      userId: identity.userId,
      tagline: '',
      createdAt: this.clock.now(),
      ...DEFAULT_PROFILE_VISIBILITY,
    });
  }
}

/** Everything the account screen needs, in one round trip. */
export class GetAccountOverviewUseCase {
  constructor(
    private readonly ensureProfile: EnsureProfileUseCase,
    private readonly calculator: ProgressCalculator,
    private readonly results: IGameResultRepository
  ) {}

  async execute(identity: AccountIdentity): Promise<AccountOverview> {
    const [profile, progress, recentGames] = await Promise.all([
      this.ensureProfile.execute(identity),
      this.calculator.compute(identity.userId, { persist: false }),
      this.results.listRecent(identity.userId, ACCOUNT_LIMITS.RECENT_GAMES),
    ]);
    return { ...progress, profile, recentGames };
  }
}

export interface UpdateProfileInput {
  tagline?: unknown;
  isPublic?: unknown;
  showHistory?: unknown;
}

function readBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new AccountError('invalid_input', `${field} must be a boolean`);
  return value;
}

export class UpdateProfileUseCase {
  constructor(
    private readonly ensureProfile: EnsureProfileUseCase,
    private readonly profiles: IProfileRepository
  ) {}

  async execute(identity: AccountIdentity, input: UpdateProfileInput): Promise<PlayerProfile> {
    if (typeof input !== 'object' || input === null) throw new AccountError('invalid_input', 'Expected a JSON object');
    const changes: ProfileChanges = {};
    if (input.tagline !== undefined) {
      if (typeof input.tagline !== 'string') throw new AccountError('invalid_input', 'tagline must be a string');
      const error = validateTagline(input.tagline);
      if (error) throw new AccountError('invalid_input', error);
      changes.tagline = normalizeTagline(input.tagline);
    }
    const isPublic = readBoolean(input.isPublic, 'isPublic');
    if (isPublic !== undefined) changes.isPublic = isPublic;
    const showHistory = readBoolean(input.showHistory, 'showHistory');
    if (showHistory !== undefined) changes.showHistory = showHistory;
    await this.ensureProfile.execute(identity);
    return this.profiles.update(identity.userId, changes);
  }
}
