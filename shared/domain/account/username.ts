/**
 * The one name of an account: used to sign in, shown at the table and to friends, searched by
 * other players and used in the public profile URL (/u/<username>).
 * Stored lowercase (unique); the casing the player typed is kept separately for display.
 */
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 20,
  /** Letters, digits, underscore and dot; no leading, trailing or doubled dots. */
  PATTERN: /^(?!\.)(?!.*\.\.)[A-Za-z0-9_.]+(?<!\.)$/,
  /** A rename frees the old name and breaks old profile links, so it is rate limited. */
  CHANGE_COOLDOWN_MS: 30 * 24 * 60 * 60 * 1000,
  /** Base of generated names when the identity provider gave us nothing usable. */
  GENERATED_FALLBACK: 'Player',
  /** Digits appended to a generated name to make it unique. */
  SUFFIX_DIGITS: 4,
} as const;

/** Handles that would collide with routes or impersonate staff. */
const RESERVED = new Set([
  'admin', 'administrator', 'api', 'account', 'accounts', 'auth', 'login', 'logout', 'signin', 'sign-in',
  'signup', 'settings', 'support', 'help', 'root', 'system', 'moderator', 'mod', 'staff', 'wizard',
  'wizardparty', 'official', 'null', 'undefined', 'me', 'u', 'profile', 'profiles',
]);

export type UsernameValidationError = 'username_length' | 'username_characters' | 'username_reserved';

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): UsernameValidationError | null {
  const trimmed = value.trim();
  if (trimmed.length < USERNAME_RULES.MIN_LENGTH || trimmed.length > USERNAME_RULES.MAX_LENGTH) return 'username_length';
  if (!USERNAME_RULES.PATTERN.test(trimmed)) return 'username_characters';
  if (RESERVED.has(normalizeUsername(trimmed))) return 'username_reserved';
  return null;
}

export const USERNAME_ERROR_MESSAGES: Record<UsernameValidationError, string> = {
  username_length: `Usernames need ${USERNAME_RULES.MIN_LENGTH}–${USERNAME_RULES.MAX_LENGTH} characters.`,
  username_characters: 'Use letters, numbers, underscores and single dots (not at the start or end).',
  username_reserved: 'This username is reserved.',
};

/**
 * When the name may change again. The first rename is free (a generated name from a Google
 * sign-up can be fixed right away); casing-only edits never count as a rename.
 */
export function nextUsernameChangeAt(lastChangedAt: number | null | undefined): number | null {
  return lastChangedAt ? lastChangedAt + USERNAME_RULES.CHANGE_COOLDOWN_MS : null;
}

export function canChangeUsername(lastChangedAt: number | null | undefined, now: number): boolean {
  const next = nextUsernameChangeAt(lastChangedAt);
  return next === null || now >= next;
}

const MAX_BASE_LENGTH = USERNAME_RULES.MAX_LENGTH - USERNAME_RULES.SUFFIX_DIGITS;

/**
 * A valid username built from the name an identity provider gave us (never from the email, which
 * would leak the address): accents are dropped, spaces become underscores, anything else outside
 * the pattern is removed. Null when nothing usable is left; uniqueness is the caller's job.
 * Mirrored once in SQL by db/migrations/0107_one_player_name.sql.
 */
export function deriveUsername(source: string | null | undefined): string | null {
  const base = (source ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/\.+$/, '');
  return validateUsername(base) === null ? base : null;
}

/** `base` with a random numeric suffix, still within the length limit. */
export function withUsernameSuffix(base: string, random: () => number = Math.random): string {
  const suffix = String(Math.floor(random() * 10 ** USERNAME_RULES.SUFFIX_DIGITS)).padStart(USERNAME_RULES.SUFFIX_DIGITS, '0');
  return `${base.slice(0, MAX_BASE_LENGTH)}${suffix}`;
}
