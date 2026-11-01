/**
 * Telemetry contract between the realtime game server (producer) and the
 * ingest API (consumer).
 *
 * Every event is an immutable fact recorded by the authoritative game server.
 * Envelope fields are stable and indexed; type-specific data lives in `payload`.
 *
 * Versioning: additive payload changes keep the version. Breaking changes bump
 * TELEMETRY_SCHEMA_VERSION and the ingest side accepts both while producers roll out.
 */

export const TELEMETRY_SCHEMA_VERSION = 1;

export const TelemetryEventType = {
  PLAYER_JOINED: 'player.joined',
  PLAYER_LEFT: 'player.left',
  GAME_STARTED: 'game.started',
  ROUND_STARTED: 'round.started',
  TRUMP_SELECTED: 'trump.selected',
  BID_PLACED: 'bid.placed',
  CARD_PLAYED: 'card.played',
  TRICK_COMPLETED: 'trick.completed',
  TRICK_EFFECT_RESOLVED: 'trick.effect_resolved',
  ROUND_COMPLETED: 'round.completed',
  GAME_COMPLETED: 'game.completed',
  GAME_ABANDONED: 'game.abandoned',
  GAME_PAUSED: 'game.paused',
  GAME_RESUMED: 'game.resumed',
  TURN_TIMER_EXPIRED: 'turn.timer_expired',
  // Social
  CHAT_SENT: 'chat.sent',
  EMOTE_SENT: 'emote.sent',
  // Settings & sound
  ROOM_SETTINGS_CHANGED: 'room_settings.changed',
  RULESET_CHANGED: 'ruleset.changed',
  SOUND_PREFERENCES_CHANGED: 'sound_preferences.changed',
  TIMEOUT_SOUND_PLAYED: 'timeout_sound.played',
  // Lobby grace periods
  PLAYER_GRACED: 'player.graced',
  PLAYER_GRACE_EXPIRED: 'player.grace_expired',
  PLAYER_GRACE_RESTORED: 'player.grace_restored',
  // Rematch
  REMATCH_REQUESTED: 'rematch.requested',
  REMATCH_STARTED: 'rematch.started',
  // Commands the server refused or failed to process
  COMMAND_REJECTED: 'command.rejected',
  // Connections & devices
  CLIENT_CONNECTED: 'client.connected',
  SESSION_STARTED: 'session.started',
  CLIENT_DISCONNECTED: 'client.disconnected',
  // Producer health: rate-limited facts that were dropped (see party/telemetry/telemetry-rate-limiter)
  TELEMETRY_SUPPRESSED: 'telemetry.suppressed',
} as const;

export type TelemetryEventType = (typeof TelemetryEventType)[keyof typeof TelemetryEventType];

/** Who caused an event: a human command, a bot decision or the server itself (alarms, disconnects). */
export type TelemetrySource = 'player' | 'bot' | 'system';

export interface TelemetryCard {
  id: string;
  type: string;
  suit: string | null;
  value: number | null;
}

export interface TelemetryPlayerRef {
  playerId: string;
  name: string;
  isBot: boolean;
  botDifficulty: number | null;
  seat: number;
}

export const DeviceType = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  BOT: 'bot',
  UNKNOWN: 'unknown',
} as const;

export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

/** Result of parsing a User-Agent header (see ./user-agent). */
export interface ParsedUserAgent {
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: DeviceType;
}

/**
 * WebSocket query parameter the client uses to report its build (the same value as the client
 * telemetry appVersion), e.g. `?clientVersion=3576aa8...`. The server records it on client.connected.
 */
export const CLIENT_VERSION_QUERY_PARAM = 'clientVersion';

/**
 * What the server knows about a connected client, derived from the WebSocket upgrade request.
 * Deliberately excludes the IP address.
 */
export interface TelemetryClientInfo extends ParsedUserAgent {
  /** Truncated to TELEMETRY_PAYLOAD_LIMITS.MAX_USER_AGENT_LENGTH. */
  userAgent: string | null;
  /** Primary Accept-Language tag, e.g. "de-DE". */
  language: string | null;
  /** ISO 3166-1 alpha-2 country from the edge (Cloudflare request.cf.country). */
  country: string | null;
  /** Edge data center (Cloudflare request.cf.colo), e.g. "FRA". */
  colo: string | null;
  /** Client build identifier sent by the client as a query parameter, if any. */
  clientVersion: string | null;
}

/** Client info attached to a player session: everything except the raw User-Agent header. */
export type TelemetrySessionDevice = Omit<TelemetryClientInfo, 'userAgent'>;

export const TelemetrySuppressionScope = {
  SENDER: 'sender',
  ROOM: 'room',
} as const;

export type TelemetrySuppressionScope = (typeof TelemetrySuppressionScope)[keyof typeof TelemetrySuppressionScope];

/** Metadata of an uploaded sound. The audio data itself is never recorded. */
export interface TelemetryCustomAudio {
  id: string;
  name: string;
  /** Parsed from the data URL header, e.g. "audio/mpeg". */
  mimeType: string | null;
  byteSize: number;
  durationSec: number;
  category: string | null;
  /** Enabled assignments, e.g. ["wizard", "shared"]. */
  roles: string[];
}

/** A bounded list: at most TELEMETRY_PAYLOAD_LIMITS.MAX_LIST_ITEMS items plus the real count. */
export interface TelemetryCustomAudioList {
  count: number;
  items: TelemetryCustomAudio[];
}

/** Sound preference changes; absent keys were not part of the update, null means removed. */
export interface TelemetrySoundPreferences {
  trickWinSound?: string;
  customTrickWinAudio?: TelemetryCustomAudio | null;
  customTrickWinAudios?: TelemetryCustomAudioList | null;
  sharedCustomSounds?: TelemetryCustomAudioList | null;
}

/** Room settings as recorded (the name bounded in length). */
export interface TelemetryRoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  ruleset: unknown;
}

export interface TelemetryPayloads {
  'player.joined': { playerId: string; name: string; isBot: boolean };
  'player.left': { playerId: string };
  'game.started': {
    hostId: string;
    maxRounds: number;
    ruleset: unknown;
    players: TelemetryPlayerRef[];
  };
  'round.started': {
    dealerId: string;
    cardsPerPlayer: number;
    trumpCard: TelemetryCard | null;
    trumpSuit: string | null;
    dealerMustChoose: boolean;
    /** Dealt hands so every round can be replayed exactly. */
    hands: Record<string, string[]>;
  };
  /** suit is null when a Werewolf holder declared no trump. */
  'trump.selected': { playerId: string; suit: string | null };
  'bid.placed': { playerId: string; bid: number };
  'card.played': { playerId: string; card: TelemetryCard; trickNumber: number; positionInTrick: number };
  /** `voided` is true when a Bomb destroyed the trick; winnerId then names the next leader. */
  'trick.completed': {
    trickNumber: number;
    winnerId: string;
    voided: boolean;
    cards: { playerId: string; cardId: string; declaration?: { suit?: string; form?: string } }[];
  };
  /** Special-card effect after a trick: Juggler pass (PASS_LEFT), Cloud (ADJUST_BID), Witch (SWAP_WITH_TRICK). */
  'trick.effect_resolved': {
    kind: string;
    playerId: string | null;
    delta?: number;
    newBid?: number;
    givenCardId?: string;
    takenCardId?: string;
  };
  'round.completed': {
    results: { playerId: string; bid: number | null; tricksWon: number; roundScore: number; totalScore: number }[];
  };
  'game.completed': {
    winnerId: string;
    durationMs: number;
    standings: { playerId: string; score: number; rank: number }[];
  };
  'game.abandoned': { reason: string; durationMs: number };
  'game.paused': { pausedForPlayerId: string; reason: string; timeoutMs: number };
  'game.resumed': { playerId: string };
  'turn.timer_expired': { playerId: string; phase: string; sequence: number };
  /**
   * Chat text is never recorded: the privacy policy promises chat is only held in memory.
   * `length` is the length of the message that was broadcast.
   */
  'chat.sent': { playerId: string; message: string; length: number };
  'emote.sent': { playerId: string; emoteId: string };
  'room_settings.changed': { playerId: string | null; settings: TelemetryRoomSettings; changedKeys: string[] };
  /** `changedKeys` lists the top-level ruleset sections that changed. */
  'ruleset.changed': { playerId: string | null; ruleset: unknown; changedKeys: string[] };
  'sound_preferences.changed': { playerId: string; preferences: TelemetrySoundPreferences; changedKeys: string[] };
  'timeout_sound.played': {
    senderPlayerId: string;
    targetPlayerId: string;
    soundName: string | null;
    customAudio: TelemetryCustomAudio | null;
  };
  'player.graced': { playerId: string; graceDurationMs: number; wasHost: boolean };
  'player.grace_expired': { playerId: string; newHostId: string | null };
  'player.grace_restored': { playerId: string; isHost: boolean };
  /** Recorded for every request; `isHost` tells whether it could start the rematch. */
  'rematch.requested': { playerId: string; isHost: boolean };
  'rematch.started': { hostId: string; playerIds: string[] };
  'command.rejected': {
    /** Null when the message could not be parsed into a command. */
    commandType: string | null;
    requestId: string | null;
    /** GameError code or a server rejection code (see CommandRejectionCode); null for unexpected errors. */
    errorCode: string | null;
    errorName: string;
    message: string;
    /** Whether the client was sent an ERROR event. */
    notifiedClient: boolean;
  };
  'client.connected': { connectionId: string } & TelemetryClientInfo;
  /**
   * Device of a player session. The raw User-Agent stays on `client.connected` only, so the
   * persistent player id is linked to parsed device fields, not to the full header.
   */
  'session.started': { playerId: string; connectionId: string; isReconnect: boolean } & TelemetrySessionDevice;
  'client.disconnected': {
    connectionId: string;
    playerId: string | null;
    /** Null when the connection was opened before the current server instance started. */
    durationMs: number | null;
    closeCode: number | null;
    closeReason: string | null;
    wasClean: boolean | null;
  };
  /** Facts of `factType` dropped by the producer's rate limit during one window. */
  'telemetry.suppressed': {
    factType: string;
    /** `sender`: one connection (or actor); `room`: the room-wide budget. */
    scope: TelemetrySuppressionScope;
    /** Connection id (or actor id) for scope `sender`; null for `room`. */
    senderKey: string | null;
    suppressedCount: number;
    windowMs: number;
  };
}

export interface TelemetryEnvelope<T extends TelemetryEventType = TelemetryEventType> {
  schemaVersion: number;
  /** UUIDv7: globally unique, time ordered, used as idempotency key. */
  eventId: string;
  type: T;
  /** Epoch milliseconds on the game server. */
  occurredAt: number;
  roomId: string;
  /** Set from game.started until game.completed / game.abandoned. Null for lobby events. */
  gameId: string | null;
  /** Gapless per-room sequence; total order of events within a room. */
  seq: number;
  source: TelemetrySource;
  actorId: string | null;
  /**
   * Groups all events caused by one trigger. Equals the client command's requestId when present,
   * so client-side traces can be joined with server events.
   */
  correlationId: string;
  commandType: string | null;
  round: number | null;
  phase: string;
  serverVersion: string | null;
  payload: TelemetryPayloads[T];
}

export type AnyTelemetryEnvelope = { [K in TelemetryEventType]: TelemetryEnvelope<K> }[TelemetryEventType];

export interface TelemetryBatch {
  producer: string;
  sentAt: number;
  events: AnyTelemetryEnvelope[];
}

export const TELEMETRY_LIMITS = {
  MAX_EVENTS_PER_BATCH: 200,
  MAX_BODY_BYTES: 1_000_000,
  /** Accepted clock skew / replay window for signed requests. */
  SIGNATURE_TOLERANCE_MS: 5 * 60 * 1000,
  /** Max length of free-text envelope fields (ids, command type, correlation id); enforced at ingest. */
  MAX_ENVELOPE_TEXT_LENGTH: 200,
} as const;

/** Bounds for producer-controlled payload content so a single event stays small. */
export const TELEMETRY_PAYLOAD_LIMITS = {
  /** Chat text is kept for moderation and redacted after 30 days by the retention job. */
  MAX_CHAT_MESSAGE_LENGTH: 500,
  MAX_USER_AGENT_LENGTH: 512,
  MAX_ERROR_MESSAGE_LENGTH: 300,
  /** Ids, names, sound names, language tags, close reasons, client versions. */
  MAX_SHORT_TEXT_LENGTH: 100,
  MAX_LIST_ITEMS: 20,
} as const;

/** Rejection codes for commands that fail before reaching a domain use case. */
export const CommandRejectionCode = {
  INVALID_JSON: 'INVALID_JSON',
  INVALID_COMMAND: 'INVALID_COMMAND',
  UNKNOWN_COMMAND: 'UNKNOWN_COMMAND',
  /** A binary WebSocket frame; the protocol is JSON text only. */
  INVALID_FRAME: 'INVALID_FRAME',
  /** A frame larger than any command of its type may be. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** The connection exceeded its command budget for this kind of command. */
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type CommandRejectionCode = (typeof CommandRejectionCode)[keyof typeof CommandRejectionCode];

export const TELEMETRY_HEADERS = {
  SIGNATURE: 'x-telemetry-signature',
  TIMESTAMP: 'x-telemetry-timestamp',
} as const;
