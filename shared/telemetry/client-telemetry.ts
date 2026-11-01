/**
 * Client telemetry contract between the browser collector (producer) and the public ingest API
 * (consumer, POST /api/telemetry/client).
 *
 * Unlike server telemetry these events are observations of one browser tab: device profile, web
 * vitals, realtime connection quality, rendering performance and errors. They are only collected
 * while the visitor has granted analytics consent.
 *
 * Joins with server telemetry:
 * - client_events.player_id = telemetry_events.actor_id / game_players.player_id
 * - client_events.room_id   = telemetry_events.room_id
 * - command.rtt payload.requestId = telemetry_events.correlation_id
 *
 * Versioning: additive payload changes only. Payloads are validated as bounded objects at ingest,
 * so producers can add fields without a coordinated consumer deploy.
 */

export const ClientTelemetryEventType = {
  SESSION_STARTED: 'session.started',
  WEB_VITAL: 'web_vital',
  WS_CONNECTED: 'ws.connected',
  WS_DISCONNECTED: 'ws.disconnected',
  COMMAND_RTT: 'command.rtt',
  GAME_TRACE: 'game.trace',
  RENDER_PERFORMANCE: 'render.performance',
  WEBGL_CONTEXT: 'webgl.context',
  ERROR: 'error',
} as const;

export type ClientTelemetryEventType = (typeof ClientTelemetryEventType)[keyof typeof ClientTelemetryEventType];

export const CLIENT_TELEMETRY_ENDPOINT = '/api/telemetry/client';

export const CLIENT_TELEMETRY_LIMITS = {
  /** Events per HTTP request. */
  MAX_EVENTS_PER_BATCH: 50,
  /**
   * Browsers cap the bytes of all in-flight sendBeacon / fetch keepalive requests of a document
   * (64 KiB). A producer must stay below it across one whole flush, not just per request.
   */
  KEEPALIVE_QUOTA_BYTES: 65_536,
  /** One request; leaves headroom in the keepalive quota for other beacons of the page. */
  MAX_BODY_BYTES: 60_000,
  /** A single serialized event; larger events are dropped by producer and consumer. */
  MAX_EVENT_BYTES: 8_000,
  MAX_ID_CHARS: 128,
  MAX_PAGE_CHARS: 256,
  MAX_APP_VERSION_CHARS: 64,
  MAX_TEXT_CHARS: 256,
  MAX_ERROR_MESSAGE_CHARS: 500,
  MAX_STACK_CHARS: 2_000,
  MAX_USER_AGENT_CHARS: 512,
  /** Accepted distance between the client clock and the ingest clock. */
  MAX_CLOCK_SKEW_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Server-side volume budgets for the public ingest. Request counts alone do not bound storage: each
 * accepted request may carry a full batch of client-chosen events, so stored volume is budgeted too.
 */
export const CLIENT_TELEMETRY_BUDGETS = {
  /** Requests per client network (IPv4 address or IPv6 /64) and window. */
  MAX_REQUESTS_PER_CLIENT: 60,
  REQUEST_WINDOW_SECONDS: 60,
  /** Stored events per client network and window, counted after validation. */
  MAX_EVENTS_PER_CLIENT: 3_000,
  EVENT_WINDOW_SECONDS: 10 * 60,
  /** One tab session in one UTC day; a long evening of play stays well below it. */
  MAX_EVENTS_PER_SESSION_PER_DAY: 10_000,
  /** Global circuit breaker per UTC day; beyond it events are acknowledged but not stored. */
  MAX_EVENTS_PER_DAY: 1_000_000,
  /** Storage limitation (GDPR Art. 5(1)(e)): older client events and sessions are deleted. */
  RETENTION_DAYS: 90,
} as const;

export interface UserAgentBrand {
  brand: string;
  version: string;
}

export interface DeviceProfile {
  userAgent: string;
  /** navigator.userAgentData (Chromium only). */
  uaBrands: UserAgentBrand[] | null;
  uaMobile: boolean | null;
  uaPlatform: string | null;
  /** High-entropy client hints, when the browser grants them. */
  uaPlatformVersion: string | null;
  uaModel: string | null;
  uaArchitecture: string | null;
  language: string | null;
  languages: string[];
  timezone: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  devicePixelRatio: number | null;
  hardwareConcurrency: number | null;
  /** GiB, rounded by the browser (Chromium only). */
  deviceMemory: number | null;
  maxTouchPoints: number | null;
  connectionType: string | null;
  connectionRttMs: number | null;
  connectionDownlinkMbps: number | null;
  saveData: boolean | null;
  prefersReducedMotion: boolean | null;
  colorScheme: 'light' | 'dark' | null;
  webglVendor: string | null;
  webglRenderer: string | null;
  /** Origin only, never the full referrer URL. */
  referrerOrigin: string | null;
}

export type WebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

/**
 * - ack: a server message answered the command.
 * - error: an ERROR was attributed to it.
 * - timeout: nothing matched within the client timeout.
 * - lost: the socket closed while the command was in flight.
 */
export type CommandRttOutcome = 'ack' | 'error' | 'timeout' | 'lost';

/**
 * - actor: a broadcast event whose actor is this player (exact for one command in flight).
 * - state: the next GAME_STATE, for commands without an attributable event (heuristic: a state
 *   push caused by another player can answer it early).
 * - error_fifo: the oldest command in flight received the ERROR (heuristic, the server processes
 *   one connection's commands in order).
 */
export type CommandRttMatch = 'actor' | 'state' | 'error_fifo';

export type ClientErrorKind = 'error' | 'unhandledrejection' | 'boundary';

export interface ClientTelemetryPayloads {
  'session.started': DeviceProfile;
  web_vital: {
    name: WebVitalName;
    value: number;
    delta: number;
    rating: WebVitalRating;
    navigationType: string;
    metricId: string;
  };
  'ws.connected': {
    /** Socket creation until the open event. */
    connectMs: number;
    attempt: number;
    isReconnect: boolean;
    /** Time since the previous unintentional disconnect, for reconnects. */
    downtimeMs: number | null;
  };
  'ws.disconnected': {
    code: number;
    reason: string;
    wasClean: boolean;
    intentional: boolean;
    connectedForMs: number | null;
  };
  'command.rtt': {
    /** Equals telemetry_events.correlation_id of the events the command caused. */
    requestId: string;
    commandType: string;
    /** Until the matching server message; for `timeout` / `lost` until the command was given up. */
    rttMs: number;
    outcome: CommandRttOutcome;
    ackEventType: string | null;
    /** How the server message was attributed to the command (the server does not echo requestIds). */
    matchedBy: CommandRttMatch | null;
  };
  /** Persisted copy of the legacy client game trace (src/lib/game-trace.ts). */
  'game.trace': {
    traceType: string;
    severity: string;
    traceSessionId: string | null;
    eventType: string | null;
    commandType: string | null;
    requestId: string | null;
    cardId: string | null;
    lagMs: number | null;
    reason: string | null;
    details: Record<string, unknown> | null;
  };
  'render.performance': {
    windowMs: number;
    frames: number;
    avgFps: number;
    /** 5th percentile fps (the slow tail), derived from the 95th percentile frame time. */
    p5Fps: number;
    avgFrameMs: number;
    p95FrameMs: number;
    maxFrameMs: number;
    droppedFrames: number;
    longTasks: number;
    longTaskMs: number;
    jsHeapUsedMb: number | null;
    jsHeapLimitMb: number | null;
    /** Render quality tier of the 3D table during the window (null before it mounted). */
    qualityTier: string | null;
    /** Canvas pixel ratio during the window. */
    renderDpr: number | null;
  };
  'webgl.context': { state: 'lost' | 'restored' };
  error: {
    kind: ClientErrorKind;
    message: string;
    name: string | null;
    source: string | null;
    line: number | null;
    column: number | null;
    stack: string | null;
    digest: string | null;
  };
}

export interface ClientTelemetryEnvelope<T extends ClientTelemetryEventType = ClientTelemetryEventType> {
  /** UUIDv7, idempotency key. */
  eventId: string;
  type: T;
  /** Epoch milliseconds on the client clock. */
  occurredAt: number;
  /** UUIDv7 per browser tab. */
  sessionId: string;
  /** Persistent player id (`player-<ts>-<rand>`) when known. */
  playerId: string | null;
  roomId: string | null;
  /** location.pathname, without query or hash. */
  page: string;
  appVersion: string;
  payload: ClientTelemetryPayloads[T];
}

export type AnyClientTelemetryEnvelope = {
  [K in ClientTelemetryEventType]: ClientTelemetryEnvelope<K>;
}[ClientTelemetryEventType];

/** Server-side facts added at ingest. Never contains the client IP. */
export interface ClientTelemetryIngestContext {
  receivedAt: number;
  /** ISO 3166-1 alpha-2 from the edge (x-vercel-ip-country). */
  country: string | null;
  userAgent: string | null;
}
