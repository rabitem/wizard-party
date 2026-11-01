#!/usr/bin/env node
/**
 * Applies db/migrations/*.sql in lexical order, each in its own transaction.
 * Safe to run concurrently (advisory lock) and repeatedly (schema_migrations ledger).
 *
 * Usage: DATABASE_URL=... node scripts/db-migrate.mjs
 * `--if-production` (used by "vercel-build") only migrates production deployments, so preview
 * builds never change the production schema.
 */
/* eslint-disable no-await-in-loop -- migrations must run strictly in order */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const MIGRATIONS_DIR = fileURLToPath(new URL('../db/migrations/', import.meta.url));
const LOCK_ID = 7_281_337;

if (process.argv.includes('--if-production') && process.env.VERCEL_ENV !== 'production') {
  process.stdout.write(`skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'})\n`);
  process.exit(0);
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const client = await pool.connect();

try {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const { rows } = await client.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      process.stdout.write(`applied ${file}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`migration ${file} failed: ${error.message}`, { cause: error });
    }
  }
  process.stdout.write('migrations up to date\n');
} finally {
  await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined);
  client.release();
  await pool.end();
}
