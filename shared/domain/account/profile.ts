import { ACCOUNT_LIMITS } from './account.constants';

/** Account extras next to the identity. The player's name is their username (see username.ts). */
export interface PlayerProfile {
  userId: string;
  tagline: string;
  createdAt: number;
  /** Profile can be viewed at /u/<username>. */
  isPublic: boolean;
  /** Recent games are listed on the public profile; pinned games always are. */
  showHistory: boolean;
}

/** Visibility of a newly created profile: public card, private game history. */
export const DEFAULT_PROFILE_VISIBILITY = Object.freeze({ isPublic: true, showHistory: false });

/** Fields a player can change on their own profile. */
export type ProfileChanges = Partial<Pick<PlayerProfile, 'tagline' | 'isPublic' | 'showHistory'>>;

export type ProfileValidationError = 'tagline_length';

export function normalizeTagline(value: string): string {
  return value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

export function validateTagline(value: string): ProfileValidationError | null {
  return normalizeTagline(value).length > ACCOUNT_LIMITS.TAGLINE_MAX_LENGTH ? 'tagline_length' : null;
}
