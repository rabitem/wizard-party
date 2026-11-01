#!/usr/bin/env node
/**
 * Runs one SQL statement against the telemetry database inside a READ ONLY transaction.
 *
 * Usage:
 *   node --env-file=.env.local scripts/telemetry-query.mjs "SELECT count(*) FROM games"
 *   node --env-file=.env.local scripts/telemetry-query.mjs --json "SELECT * FROM games LIMIT 5"
 *   echo "SELECT 1" | node --env-file=.env.local scripts/telemetry-query.mjs
 *
 * `.env.local` comes from `vercel env pull .env.local --environment=production`.
 */
import { Pool } from '@neondatabase/serverless';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
let sql = args.filter((arg) => arg !== '--json').join(' ').trim();
if (!sql && !process.stdin.isTTY) {
  for await (const chunk of process.stdin) sql += chunk;
  sql = sql.trim();
}
if (!sql) {
  process.stderr.write('usage: telemetry-query.mjs [--json] "<sql>"\n');
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  process.stderr.write('DATABASE_URL missing - run: vercel env pull .env.local --environment=production\n');
  process.exit(2);
}

const pool = new Pool({ connectionString });
const client = await pool.connect();
try {
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '30s'");
  const result = await client.query(sql);
  await client.query('ROLLBACK');

  if (asJson) {
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
  } else {
    console.table(result.rows); // eslint-disable-line no-console
    process.stdout.write(`${result.rowCount ?? result.rows.length} row(s)\n`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
