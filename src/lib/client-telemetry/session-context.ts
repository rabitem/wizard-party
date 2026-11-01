import { v7 as uuidv7, validate as isUuid } from 'uuid';

import { CLIENT_TELEMETRY_LIMITS } from '@shared/telemetry';

import { safeSessionStorage } from '../storage';
import { CLIENT_TELEMETRY_CONFIG } from './client-telemetry.config';

/**
 * Per-tab session id: sessionStorage survives reloads within the tab but is not shared between
 * tabs. Falls back to an in-memory id when storage is unavailable (private mode, sandboxed frames).
 */
export function getOrCreateTabSessionId(): string {
  const existing = safeSessionStorage.getItem(CLIENT_TELEMETRY_CONFIG.SESSION_STORAGE_KEY);
  if (existing && isUuid(existing)) return existing;
  const created = uuidv7();
  safeSessionStorage.setItem(CLIENT_TELEMETRY_CONFIG.SESSION_STORAGE_KEY, created);
  return created;
}

export function currentPagePath(): string {
  if (typeof location === 'undefined') return '';
  return location.pathname.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_PAGE_CHARS);
}

export { resolveAppVersion } from '../app-version';
