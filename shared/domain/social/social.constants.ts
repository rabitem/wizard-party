/**
 * Limits and timings of the social context (friends, invites, presence, inbox).
 * Shared by client and server so both work against the same numbers.
 */
export const SOCIAL_LIMITS = {
  MAX_FRIENDS: 250,
  /** Unanswered outgoing friend requests; stops request spraying. */
  MAX_PENDING_OUTGOING_REQUESTS: 30,
  MAX_PINNED_FRIENDS: 8,
  MAX_BLOCKED_PLAYERS: 500,
  /** A declined request can only be sent again after this long. */
  DECLINED_REQUEST_COOLDOWN_MS: 3 * 24 * 60 * 60 * 1000,
  /** Game invites expire: an old room code is useless and the lobby has likely started. */
  GAME_INVITE_TTL_MS: 10 * 60 * 1000,
  /** A sender's list of invites to a room also shows answered and expired ones this long. */
  SENT_INVITES_WINDOW_MS: 30 * 60 * 1000,
  /** Most invites the sent list shows for one room. */
  SENT_INVITES_MAX: 50,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_MAX_LENGTH: 32,
  SEARCH_MAX_RESULTS: 10,
  INBOX_PAGE_SIZE: 30,
  /** Inbox items older than this are pruned by the retention cron. */
  INBOX_RETENTION_DAYS: 30,
} as const;

/** Per-user budgets of the anti-spam throttle (fixed windows). */
export const SOCIAL_RATE_LIMITS = {
  friend_request: { limit: 20, windowSeconds: 60 * 60 },
  game_invite: { limit: 30, windowSeconds: 10 * 60 },
  /** Re-inviting the same player: one invite per pair and window. */
  game_invite_pair: { limit: 1, windowSeconds: 30 },
  search: { limit: 40, windowSeconds: 60 },
  /** The start page's public profile search, per visitor (keyed by a hash of the address). */
  public_profile_search: { limit: 30, windowSeconds: 60 },
  /** Invite emails a player receives per day, from everyone together. */
  invite_email: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /** Invite emails to an unverified address per day (it may belong to someone else). */
  invite_email_unverified: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /** Invite emails one player can cause per day, to everyone together. */
  invite_email_sender: { limit: 20, windowSeconds: 24 * 60 * 60 },
  /** Seat attestations (calls to the game worker) when joining rooms. */
  seat_attestation: { limit: 30, windowSeconds: 10 * 60 },
  /** Friend request emails a player can cause per day. */
  friend_request_email_sender: { limit: 20, windowSeconds: 24 * 60 * 60 },
  /** Friend request emails a player receives per day, from everyone together. */
  friend_request_email: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /**
   * Friend request emails to an unverified address per day. Such an address may belong to someone
   * else (a typo, a stranger's address), so it gets at most one.
   */
  friend_request_email_unverified: { limit: 1, windowSeconds: 24 * 60 * 60 },
  /** Invite emails from one sender to one recipient. */
  invite_email_pair: { limit: 1, windowSeconds: 6 * 60 * 60 },
} as const;

export type SocialRateLimitedAction = keyof typeof SOCIAL_RATE_LIMITS;

/**
 * Presence is a heartbeat with a TTL. Visible tabs beat often; hidden tabs are throttled by the
 * browser (down to once a minute), so the TTL must outlive the slowest heartbeat.
 */
export const PRESENCE_TIMING = {
  VISIBLE_HEARTBEAT_MS: 25_000,
  HIDDEN_HEARTBEAT_MS: 60_000,
  TTL_SECONDS: 150,
  /** A worker seat attestation is trusted this long before it is checked again. */
  SEAT_ATTESTATION_TTL_SECONDS: 300,
} as const;
