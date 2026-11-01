/**
 * Wire contract between the Next.js server and the game worker for tournament matches. Runtime
 * agnostic (WebCrypto, no Node or DOM APIs), so party/ and src/ import the same code.
 */

export const TOURNAMENT_WIRE_VERSION = 1;

/** Prefix of every ticket: tickets are 'v1.<base64url(json)>.<base64url(hmac)>'. */
export const MATCH_TICKET_PREFIX = 'v1';

export const TOURNAMENT_WIRE_LIMITS = {
  /** Tickets carry the ruleset, so they are a few KB at most. */
  MAX_TICKET_LENGTH: 8 * 1024,
  MAX_RESULT_BODY_BYTES: 64 * 1024,
  /** Accepted clock skew / replay window of signed result requests. */
  SIGNATURE_TOLERANCE_MS: 5 * 60 * 1000,
  MAX_LABEL_LENGTH: 120,
  MAX_GAME_ID_LENGTH: 128,
  MAX_USER_ID_LENGTH: 64,
  MAX_SCORE: 100_000,
  MAX_ROUND_SCORE: 10_000,
  MAX_ROUNDS: 20,
  /** Highest bid in a report: a Cloud (expansion card) raises a bid by one beyond the cards dealt. */
  MAX_BID: 21,
} as const;

/** Headers of the worker's result POST (mirrors the telemetry ingest headers). */
export const TOURNAMENT_RESULT_HEADERS = {
  SIGNATURE: 'x-tournament-signature',
  TIMESTAMP: 'x-tournament-timestamp',
} as const;

/**
 * The tournament page and the query it understands. The server builds it for inbox actions and the
 * browser for links and redirects, so both share this one definition.
 */
export const TOURNAMENT_PAGE_QUERY = {
  /** Invite code of a private tournament (share links). */
  INVITE_CODE: 'code',
  /** Fetch a ticket for the viewer's pending table and open it right away. */
  JOIN: 'join',
} as const;

export function tournamentPagePath(tournamentId: string, options: { inviteCode?: string | null; join?: boolean } = {}): string {
  const query = new URLSearchParams();
  if (options.inviteCode) query.set(TOURNAMENT_PAGE_QUERY.INVITE_CODE, options.inviteCode);
  if (options.join) query.set(TOURNAMENT_PAGE_QUERY.JOIN, '1');
  const search = query.toString();
  return `/tournaments/${encodeURIComponent(tournamentId)}${search ? `?${search}` : ''}`;
}

/** sessionStorage key under which the browser keeps the ticket of a match room until it joined. */
export const TOURNAMENT_TICKET_STORAGE_PREFIX = 'wizard-party-tournament-ticket:';

export function tournamentTicketStorageKey(roomCode: string): string {
  return `${TOURNAMENT_TICKET_STORAGE_PREFIX}${roomCode}`;
}

/** Domain separation: a ticket signature can never be replayed as a result signature or vice versa. */
export const SIGNING_CONTEXT = {
  TICKET: 'tournament-ticket.v1.',
  RESULT: 'tournament-result.v1.',
} as const;
