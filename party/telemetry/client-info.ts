import {
  CLIENT_VERSION_QUERY_PARAM,
  TELEMETRY_PAYLOAD_LIMITS,
  boundedText,
  parseUserAgent,
  type TelemetryClientInfo,
} from '../../shared/telemetry';

/**
 * Derives TelemetryClientInfo from a WebSocket upgrade request.
 *
 * Only reads the User-Agent and Accept-Language headers, one query parameter and the country/colo of
 * Cloudflare's `request.cf`. The client IP (CF-Connecting-IP, X-Forwarded-For, ...) is never read.
 */

export { CLIENT_VERSION_QUERY_PARAM };

const { MAX_SHORT_TEXT_LENGTH, MAX_USER_AGENT_LENGTH } = TELEMETRY_PAYLOAD_LIMITS;
const LANGUAGE_TAG = /^[a-z]{1,8}(?:-[a-z0-9]{1,8})*$/i;
const COUNTRY_CODE = /^[A-Z0-9]{2}$/;
const COLO_CODE = /^[A-Z]{3,4}$/;
const CLIENT_VERSION = /^[\w.+-]{1,64}$/;

export const UNKNOWN_CLIENT_INFO: TelemetryClientInfo = {
  ...parseUserAgent(null),
  userAgent: null,
  language: null,
  country: null,
  colo: null,
  clientVersion: null,
};

function matching(value: unknown, pattern: RegExp): string | null {
  const text = boundedText(value, MAX_SHORT_TEXT_LENGTH);
  return text !== null && pattern.test(text) ? text : null;
}

/** "de-DE,de;q=0.9,en;q=0.8" -> "de-DE". */
export function primaryLanguage(acceptLanguage: string | null): string | null {
  const first = acceptLanguage?.slice(0, MAX_SHORT_TEXT_LENGTH).split(',')[0]?.split(';')[0];
  return matching(first, LANGUAGE_TAG);
}

function clientVersionFrom(url: string): string | null {
  try {
    return matching(new URL(url).searchParams.get(CLIENT_VERSION_QUERY_PARAM), CLIENT_VERSION);
  } catch {
    return null;
  }
}

/** `request.cf` exists on Cloudflare only; it is read structurally to stay runtime-agnostic. */
function edgeMetadata(request: Request): { country: string | null; colo: string | null } {
  const cf = (request as { cf?: unknown }).cf;
  if (typeof cf !== 'object' || cf === null) return { country: null, colo: null };
  const { country, colo } = cf as { country?: unknown; colo?: unknown };
  return { country: matching(country, COUNTRY_CODE), colo: matching(colo, COLO_CODE) };
}

export function extractClientInfo(request: Request): TelemetryClientInfo {
  const userAgent = boundedText(request.headers.get('user-agent'), MAX_USER_AGENT_LENGTH);
  return {
    ...parseUserAgent(userAgent),
    userAgent,
    language: primaryLanguage(request.headers.get('accept-language')),
    ...edgeMetadata(request),
    clientVersion: clientVersionFrom(request.url),
  };
}
