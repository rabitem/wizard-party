import type { CharacterAppearance } from '../character';
import type { FriendPresence } from './presence';
import type { Relationship } from './relationship';

/**
 * A player as the social features show them: never the email or anything private. The user id is
 * included because friend actions address players by it; it is an opaque random id.
 */
export interface SocialPlayer {
  userId: string;
  /** Lowercase username, as in /u/<username>. */
  username: string;
  /** The username as the player spells it. */
  displayName: string;
  /** The avatar id chosen before characters; `appearance` is derived from it, and that is what is drawn. */
  avatar: string | null;
  /** The look to show (displayedAppearance): saved, or derived from `avatar`. */
  appearance: CharacterAppearance;
  level: number;
  /** /u/<username> exists. */
  hasPublicProfile: boolean;
}

/** What anyone may see of a public profile in a search: no ids, no relationships, no presence. */
export type PublicPlayerCard = Pick<SocialPlayer, 'username' | 'displayName' | 'avatar' | 'appearance' | 'level'>;

export interface Friend extends SocialPlayer {
  since: number;
  pinnedAt: number | null;
  presence: FriendPresence;
}

export interface FriendRequestView {
  player: SocialPlayer;
  createdAt: number;
}

export interface PlayerSearchResult extends SocialPlayer {
  relationship: Relationship;
}

/** Pinned first (most recently pinned on top), then by presence, then alphabetically. */
export function compareFriends(rank: (friend: Friend) => number) {
  return (a: Friend, b: Friend): number => {
    if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt !== null ? -1 : 1;
    if (a.pinnedAt !== null && b.pinnedAt !== null && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt;
    const byPresence = rank(a) - rank(b);
    if (byPresence !== 0) return byPresence;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
  };
}

/**
 * Normalizes a search query against stored (lowercase) usernames; null when too short to search.
 * Names have no spaces, so "Merlin Grey" finds "Merlin_Grey".
 */
export function normalizeSearchQuery(raw: unknown, minLength: number, maxLength: number): string | null {
  if (typeof raw !== 'string') return null;
  const query = raw.normalize('NFC').trim().replace(/^@/, '').trim().replace(/\s+/g, '_').toLowerCase().slice(0, maxLength);
  return query.length >= minLength ? query : null;
}
