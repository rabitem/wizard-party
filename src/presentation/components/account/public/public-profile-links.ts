import { normalizeUsername, validateUsername } from '@shared/domain/account/username';

import { SITE_URL } from '@/config/deployment.config';

export function publicProfilePath(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

/** On the canonical origin: preview deployments still share production links. */
export function publicProfileUrl(username: string): string {
  return `${SITE_URL}${publicProfilePath(username)}`;
}

export type ProfileHandleResolution =
  | { kind: 'canonical'; username: string }
  | { kind: 'redirect'; username: string }
  | { kind: 'not-found' };

/**
 * Maps the raw /u/[username] route param to the one URL a profile is served at. Every other
 * spelling (other casing, padding, percent-encoded letters) redirects there, so each handle has
 * a single cached page and purging it reliably removes the profile.
 */
export function resolveProfileHandle(rawParam: string): ProfileHandleResolution {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawParam);
  } catch {
    return { kind: 'not-found' };
  }
  const username = normalizeUsername(decoded);
  if (validateUsername(username) !== null) return { kind: 'not-found' };
  return rawParam === username ? { kind: 'canonical', username } : { kind: 'redirect', username };
}
