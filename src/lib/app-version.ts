import { CLIENT_TELEMETRY_LIMITS } from '@shared/telemetry';

/** Version of builds made outside Vercel (local dev, CI); it never counts as a release. */
export const APP_VERSION_FALLBACK = 'dev';

/** Commit SHA exposed by Vercel at build time; a constant outside Vercel builds. */
export function resolveAppVersion(): string {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_APP_VERSION_CHARS) : APP_VERSION_FALLBACK;
}

/** True for the id of a deployed release; false for unversioned builds and missing answers. */
export function isReleaseVersion(version: string | null | undefined): version is string {
  return typeof version === 'string' && version.length > 0 && version !== APP_VERSION_FALLBACK;
}
