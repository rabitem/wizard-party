import 'server-only';

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Neon's HTTP driver: one stateless HTTPS request per query or transaction. No connection pool to
 * exhaust, which is what serverless functions need when traffic spikes.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  sql = neon(url);
  return sql;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
