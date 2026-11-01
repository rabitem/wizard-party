import { hashString53 } from './seeded-random';

/**
 * Identifiers of the tournament context. All are URL-safe and lowercase, without look-alike
 * characters (no i, l, o, 0, 1), so they survive being read aloud or typed from a screenshot.
 */
export const TOURNAMENT_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export const TOURNAMENT_ID_LENGTH = 12;
export const TOURNAMENT_INVITE_CODE_LENGTH = 8;

/**
 * Match rooms live in their own namespace: `t-` plus 14 characters. Casual room codes are 4–8
 * letters and digits, so they can never collide, and the game worker refuses every join without a
 * valid ticket on a code of this shape (nobody can squat a match room before the table opens).
 */
export const TOURNAMENT_ROOM_CODE_PREFIX = 't-';
export const TOURNAMENT_ROOM_CODE_BODY_LENGTH = 14;

const TOURNAMENT_ID_PATTERN = /^[a-z0-9]{10,16}$/;
const INVITE_CODE_PATTERN = new RegExp(`^[${TOURNAMENT_ID_ALPHABET}]{${TOURNAMENT_INVITE_CODE_LENGTH}}$`);
const MATCH_ID_PATTERN = /^([a-z0-9]{10,16})-([1-9][0-9]{0,2})-([1-9][0-9]{0,2})$/;
export const TOURNAMENT_ROOM_CODE_PATTERN = new RegExp(
  `^${TOURNAMENT_ROOM_CODE_PREFIX}[${TOURNAMENT_ID_ALPHABET}]{${TOURNAMENT_ROOM_CODE_BODY_LENGTH}}$`
);

export function isTournamentId(value: unknown): value is string {
  return typeof value === 'string' && TOURNAMENT_ID_PATTERN.test(value);
}

export function isInviteCode(value: unknown): value is string {
  return typeof value === 'string' && INVITE_CODE_PATTERN.test(value);
}

/** Invite codes are shown uppercase in places; compare case-insensitively and trimmed. */
export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return isInviteCode(normalized) ? normalized : null;
}

export function matchIdFor(tournamentId: string, round: number, table: number): string {
  return `${tournamentId}-${round}-${table}`;
}

export function isMatchId(value: unknown): value is string {
  return typeof value === 'string' && MATCH_ID_PATTERN.test(value);
}

export function parseMatchId(value: unknown): { tournamentId: string; round: number; table: number } | null {
  if (typeof value !== 'string') return null;
  const match = MATCH_ID_PATTERN.exec(value);
  if (!match) return null;
  return { tournamentId: match[1], round: Number(match[2]), table: Number(match[3]) };
}

/** Base-31 digits that fit into one 53-bit hash (31^7 < 2^53). */
const DIGITS_PER_HASH = 7;

/**
 * The room code of a match, derived from its id: every server instance (and every retry) agrees
 * without storing a mapping. Two independently salted 53-bit hashes give ~69 bits of code; the
 * worker additionally locks a room to the first match id it saw.
 */
export function matchRoomCode(matchId: string): string {
  const size = TOURNAMENT_ID_ALPHABET.length;
  let body = '';
  for (let part = 0; body.length < TOURNAMENT_ROOM_CODE_BODY_LENGTH; part++) {
    let hash = hashString53(matchId, part + 1);
    for (let digit = 0; digit < DIGITS_PER_HASH && body.length < TOURNAMENT_ROOM_CODE_BODY_LENGTH; digit++) {
      body += TOURNAMENT_ID_ALPHABET[hash % size];
      hash = Math.floor(hash / size);
    }
  }
  return `${TOURNAMENT_ROOM_CODE_PREFIX}${body}`;
}

export function isTournamentRoomCode(value: unknown): value is string {
  return typeof value === 'string' && TOURNAMENT_ROOM_CODE_PATTERN.test(value);
}

/**
 * Encodes random bytes as an id over TOURNAMENT_ID_ALPHABET without modulo bias (rejection
 * sampling). `randomBytes` is the platform CSPRNG, injected so the domain stays pure.
 */
export function randomIdFrom(randomBytes: (count: number) => Uint8Array, length: number): string {
  const size = TOURNAMENT_ID_ALPHABET.length;
  const limit = 256 - (256 % size);
  let id = '';
  while (id.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= limit) continue;
      id += TOURNAMENT_ID_ALPHABET[byte % size];
      if (id.length === length) break;
    }
  }
  return id;
}
