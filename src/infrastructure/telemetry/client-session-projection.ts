import {
  parseUserAgentWithHints,
  type AnyClientTelemetryEnvelope,
  type ClientTelemetryEnvelope,
  type ClientTelemetryIngestContext,
  type DeviceProfile,
  type DeviceType,
} from '@shared/telemetry';

/** Column values for one client_sessions upsert; null means "keep what is stored". */
export interface ClientSessionRow {
  session_id: string;
  first_seen: number;
  last_seen: number;
  player_id: string | null;
  app_version: string;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: DeviceType | null;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  device_pixel_ratio: number | null;
  cpu_cores: number | null;
  device_memory_gb: number | null;
  gpu_vendor: string | null;
  gpu_renderer: string | null;
  connection_type: string | null;
  language: string | null;
  timezone: string | null;
  country: string | null;
  user_agent: string | null;
}

type ProfileColumns = Pick<
  ClientSessionRow,
  | 'browser' | 'browser_version' | 'os' | 'os_version' | 'device_type' | 'screen_width' | 'screen_height'
  | 'viewport_width' | 'viewport_height' | 'device_pixel_ratio' | 'cpu_cores' | 'device_memory_gb'
  | 'gpu_vendor' | 'gpu_renderer' | 'connection_type' | 'language' | 'timezone'
>;

const EMPTY_PROFILE: ProfileColumns = {
  browser: null, browser_version: null, os: null, os_version: null, device_type: null,
  screen_width: null, screen_height: null, viewport_width: null, viewport_height: null,
  device_pixel_ratio: null, cpu_cores: null, device_memory_gb: null, gpu_vendor: null,
  gpu_renderer: null, connection_type: null, language: null, timezone: null,
};

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

/**
 * The payload was validated by deviceProfileSchema at ingest, but its fields are optional for older
 * producers, hence `orNull` (null keeps the stored column value).
 */
function profileColumns(profile: Partial<DeviceProfile>, requestUserAgent: string | null): ProfileColumns {
  const ua = parseUserAgentWithHints({
    userAgent: profile.userAgent || requestUserAgent,
    brands: orNull(profile.uaBrands),
    mobile: orNull(profile.uaMobile),
    platform: orNull(profile.uaPlatform),
    platformVersion: orNull(profile.uaPlatformVersion),
    maxTouchPoints: orNull(profile.maxTouchPoints),
  });
  return {
    browser: ua.browserName,
    browser_version: ua.browserVersion,
    os: ua.osName,
    os_version: ua.osVersion,
    device_type: ua.deviceType,
    screen_width: orNull(profile.screenWidth),
    screen_height: orNull(profile.screenHeight),
    viewport_width: orNull(profile.viewportWidth),
    viewport_height: orNull(profile.viewportHeight),
    device_pixel_ratio: orNull(profile.devicePixelRatio),
    cpu_cores: orNull(profile.hardwareConcurrency),
    device_memory_gb: orNull(profile.deviceMemory),
    gpu_vendor: orNull(profile.webglVendor),
    gpu_renderer: orNull(profile.webglRenderer),
    connection_type: orNull(profile.connectionType),
    language: orNull(profile.language),
    timezone: orNull(profile.timezone),
  };
}

function isSessionStarted(event: AnyClientTelemetryEnvelope): event is ClientTelemetryEnvelope<'session.started'> {
  return event.type === 'session.started';
}

/**
 * Folds a batch into one row per session. Any event creates or extends a session (events can
 * arrive before session.started); only session.started carries the device profile.
 */
export function buildClientSessionRows(
  events: readonly AnyClientTelemetryEnvelope[],
  context: ClientTelemetryIngestContext
): ClientSessionRow[] {
  const rows = new Map<string, ClientSessionRow>();
  for (const event of events) {
    const row = rows.get(event.sessionId) ?? {
      session_id: event.sessionId,
      first_seen: event.occurredAt,
      last_seen: event.occurredAt,
      player_id: null,
      app_version: event.appVersion,
      ...EMPTY_PROFILE,
      country: context.country,
      user_agent: context.userAgent,
    };
    row.first_seen = Math.min(row.first_seen, event.occurredAt);
    if (event.occurredAt >= row.last_seen) {
      row.last_seen = event.occurredAt;
      row.app_version = event.appVersion;
    }
    row.player_id = event.playerId ?? row.player_id;
    if (isSessionStarted(event)) Object.assign(row, profileColumns(event.payload, context.userAgent));
    rows.set(event.sessionId, row);
  }
  return [...rows.values()];
}
