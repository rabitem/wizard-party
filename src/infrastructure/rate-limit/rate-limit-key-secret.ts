import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

const RANDOM_SECRET_BYTES = 32;
/** Domain separation: the derived key is never usable as the telemetry ingest signing key. */
const DERIVATION_LABEL = 'wizard-party/rate-limit-key/v1';

/**
 * Secret for hashing rate-limit subjects (IP-derived). Uses RATE_LIMIT_KEY_SECRET, else a key
 * derived from TELEMETRY_INGEST_SECRET. Without either, a random per-instance secret keeps keys
 * irreversible; limits are then per function instance instead of global.
 */
export function rateLimitKeySecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.RATE_LIMIT_KEY_SECRET) return env.RATE_LIMIT_KEY_SECRET;
  if (env.TELEMETRY_INGEST_SECRET) {
    return createHmac('sha256', env.TELEMETRY_INGEST_SECRET).update(DERIVATION_LABEL).digest('hex');
  }
  return randomBytes(RANDOM_SECRET_BYTES).toString('hex');
}
