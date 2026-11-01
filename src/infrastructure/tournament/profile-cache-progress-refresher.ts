import type { IProgressRefresher } from '@shared/application/ports/tournament';

/** Current usernames of these accounts (deleted accounts are left out). */
export type UsernameLookup = (userIds: readonly string[]) => Promise<string[]>;

/** Drops the cached /u/<username> pages (and what shows the same data) of these handles. */
export type ProfileCacheInvalidator = (usernames: readonly string[]) => void;

/**
 * Decorates the progress refresh of a completed tournament: once the participants' XP and
 * achievements are recomputed, their cached public profiles are purged, so the new trophies and
 * level show at once instead of after the page cache expires. Usernames are looked up fresh
 * because the snapshot names in the tournament may predate a rename.
 */
export class ProfileCacheProgressRefresher implements IProgressRefresher {
  constructor(
    private readonly inner: IProgressRefresher,
    private readonly usernamesOf: UsernameLookup,
    private readonly invalidate: ProfileCacheInvalidator
  ) {}

  async refresh(userIds: readonly string[]): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.inner.refresh(userIds);
    } finally {
      // Trophies are on the profile whether or not every recompute succeeded: purge in any case.
      const usernames = await this.usernamesOf(userIds);
      if (usernames.length > 0) this.invalidate(usernames);
    }
  }
}
