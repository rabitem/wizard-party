import {
  PRESENCE_TIMING,
  SOCIAL_LIMITS,
  normalizeSearchQuery,
  parseSocialSettingsChanges,
  type PlayerSearchResult,
  type PublicPlayerCard,
  type SocialSettings,
} from '../../../domain/social';
import { normalizeUsername, validateUsername } from '../../../domain/account/username';
import type { IClock } from '../../ports/account';
import type { IInboxRepository, IPlayerDirectory, IPresenceStore, IPublicProfileDirectory, ISocialGraphRepository, ISocialThrottle } from '../../ports/social';
import type { AccountIdentity, EnsureProfileUseCase } from '../account/profile.use-cases';
import { RATE_LIMITED_MESSAGE, SocialError } from './social-error';

/** Finds players by name (exact, prefix or substring), with the viewer's relationship to each. */
export class SearchPlayersUseCase {
  constructor(
    private readonly directory: IPlayerDirectory,
    private readonly throttle: ISocialThrottle
  ) {}

  async execute(viewerId: string, rawQuery: unknown): Promise<PlayerSearchResult[]> {
    const query = normalizeSearchQuery(rawQuery, SOCIAL_LIMITS.SEARCH_MIN_LENGTH, SOCIAL_LIMITS.SEARCH_MAX_LENGTH);
    if (!query) return [];
    if (!(await this.throttle.allow('search', viewerId))) throw new SocialError('rate_limited', RATE_LIMITED_MESSAGE);
    return this.directory.search(viewerId, query, SOCIAL_LIMITS.SEARCH_MAX_RESULTS);
  }
}

/**
 * Public profiles by name for anyone, signed in or not (the start page's search). `visitorKey`
 * identifies the caller for the rate limit (the route passes the client address; the throttle
 * stores only a keyed hash of it).
 */
export class SearchPublicProfilesUseCase {
  constructor(
    private readonly directory: IPublicProfileDirectory,
    private readonly throttle: ISocialThrottle
  ) {}

  async execute(visitorKey: string, rawQuery: unknown): Promise<PublicPlayerCard[]> {
    const query = normalizeSearchQuery(rawQuery, SOCIAL_LIMITS.SEARCH_MIN_LENGTH, SOCIAL_LIMITS.SEARCH_MAX_LENGTH);
    if (!query) return [];
    if (!(await this.throttle.allow('public_profile_search', visitorKey))) throw new SocialError('rate_limited', RATE_LIMITED_MESSAGE);
    return this.directory.searchPublic(query, SOCIAL_LIMITS.SEARCH_MAX_RESULTS);
  }
}

export class GetSocialSettingsUseCase {
  constructor(private readonly directory: IPlayerDirectory) {}

  execute(viewerId: string): Promise<SocialSettings> {
    return this.directory.getSettings(viewerId);
  }
}

/**
 * Updates invite/friend-request policies and the online status. A status change is published at
 * once, so going invisible takes effect before the next heartbeat.
 */
export class UpdateSocialSettingsUseCase {
  constructor(
    private readonly directory: IPlayerDirectory,
    private readonly presence: IPresenceStore,
    /** Creates the player profile row the settings live on (account context). */
    private readonly profiles: Pick<EnsureProfileUseCase, 'execute'>,
    private readonly clock: IClock
  ) {}

  async execute(identity: AccountIdentity, input: Record<string, unknown>): Promise<SocialSettings> {
    const viewerId = identity.userId;
    const changes = parseSocialSettingsChanges(input);
    if (typeof changes === 'string') throw new SocialError('invalid_input', `${changes} is invalid`);
    await this.profiles.execute(identity);
    const settings = await this.directory.updateSettings(viewerId, changes);
    if (changes.presenceMode) {
      const current = (await this.presence.read([viewerId])).get(viewerId);
      if (current) {
        await this.presence.publish(viewerId, { ...current, mode: settings.presenceMode, at: this.clock.now() }, PRESENCE_TIMING.TTL_SECONDS);
      }
    }
    return settings;
  }
}

/**
 * The account a table name belongs to, if any. A signed-in player always plays under their
 * username, so a guest must not sit down under someone else's: friends would take them for them.
 */
export class FindNameOwnerUseCase {
  constructor(private readonly directory: Pick<IPlayerDirectory, 'findByUsername'>) {}

  async execute(name: string): Promise<string | null> {
    // Anything that is no valid username (spaces, umlauts, ...) cannot collide with one.
    if (validateUsername(name) !== null) return null;
    const owner = await this.directory.findByUsername(normalizeUsername(name));
    return owner?.userId ?? null;
  }
}

/** One player by name with the viewer's relationship, for the "add friend" button on /u/<name>. */
export class GetPlayerForViewerUseCase {
  constructor(private readonly directory: IPlayerDirectory) {}

  async execute(viewerId: string, username: unknown): Promise<PlayerSearchResult | null> {
    if (typeof username !== 'string' || validateUsername(username) !== null) return null;
    const player = await this.directory.findByUsername(normalizeUsername(username));
    if (!player) return null;
    if (player.userId === viewerId) return { ...player, relationship: 'self' };
    return (await this.directory.findManyForViewer(viewerId, [player.userId]))[0] ?? null;
  }
}

/** The social part of the GDPR export (Art. 15/20): everything stored about the player's network. */
export class ExportSocialDataUseCase {
  constructor(
    private readonly graph: ISocialGraphRepository,
    private readonly directory: IPlayerDirectory,
    private readonly inbox: IInboxRepository
  ) {}

  async execute(userId: string) {
    const [friends, incoming, declined, outgoing, blocked, settings, inbox] = await Promise.all([
      this.graph.listFriends(userId),
      this.graph.listIncomingRequests(userId),
      this.graph.listDeclinedIncoming(userId),
      this.graph.listOutgoingRequests(userId),
      this.graph.listBlocked(userId),
      this.directory.getSettings(userId),
      this.inbox.exportRaw(userId),
    ]);
    return { settings, friends, friendRequests: { incoming, declined, outgoing }, blocked, inbox };
  }
}
