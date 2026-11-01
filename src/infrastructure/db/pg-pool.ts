import 'server-only';

import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * TCP pool for libraries that need interactive transactions (Better Auth). Uses Neon's pooled
 * endpoint; attachDatabasePool lets Vercel Fluid compute close idle clients before suspending.
 */
export function getPgPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return pool;
}
