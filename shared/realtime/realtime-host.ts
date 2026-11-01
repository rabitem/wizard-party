/**
 * Realtime (game worker) hosts and URLs. Isomorphic: used by the browser and by server routes.
 * Which worker a deployment uses is decided in src/config/deployment.config.ts.
 */
export const LOCAL_REALTIME_HOST = 'localhost:1999';

const EXPLICIT_PROTOCOL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

function stripPathFromHost(host: string): string {
  return host.split(/[/?#]/, 1)[0] ?? '';
}

export function normalizePartyHostInput(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) return '';

  if (EXPLICIT_PROTOCOL_PATTERN.test(trimmed)) {
    try {
      return new URL(trimmed).host.toLowerCase();
    } catch {
      return stripPathFromHost(trimmed.replace(EXPLICIT_PROTOCOL_PATTERN, '')).toLowerCase();
    }
  }

  return stripPathFromHost(trimmed.replace(/^\/+/, '')).toLowerCase();
}

function isLocalPartyHost(host: string): boolean {
  const normalized = normalizePartyHostInput(host);
  return normalized.startsWith('localhost') ||
    normalized.startsWith('127.') ||
    normalized.startsWith('0.0.0.0') ||
    normalized.startsWith('[::1]') ||
    normalized === '::1';
}

export function buildPartyRoomUrl(host: string, roomId: string): string {
  const normalizedHost = normalizePartyHostInput(host);
  const protocol = isLocalPartyHost(normalizedHost) ? 'http' : 'https';
  return `${protocol}://${normalizedHost}/parties/main/${encodeURIComponent(roomId)}`;
}
