# Database

The Postgres schema lives in plain SQL files under `db/migrations/`, applied by one script,
`scripts/db-migrate.mjs`. Read this page before you change a table, run a migration or wonder why
a deploy applied one. The database is optional for local play: without `DATABASE_URL` accounts,
friends, tournaments, the leaderboard and stored telemetry answer "unavailable"
([configuration.md](configuration.md)). Where migrations run in a release is in
[deployment.md](deployment.md). The tables themselves are described by the feature pages
[accounts.md](../accounts/accounts.md), [social.md](../accounts/social.md) and
[tournaments.md](../accounts/tournaments.md).

## How it works

```
db/migrations/NNNN_name.sql           the schema, applied in file-name order
scripts/db-migrate.mjs                the runner (npm run db:migrate)
src/infrastructure/db/neon.ts         getSql(): Neon HTTP driver, one request per query
src/infrastructure/db/pg-pool.ts      getPgPool(): pooled TCP connection for Better Auth
scripts/telemetry-query.mjs           read-only SQL against DATABASE_URL (npm run telemetry:query)
```

The runner (`scripts/db-migrate.mjs`):

1. Connects with `DATABASE_URL_UNPOOLED`, else `DATABASE_URL`. With neither set it exits 1.
2. Takes a Postgres advisory lock, so two concurrent runs apply each file once.
3. Creates the ledger table `schema_migrations (name, applied_at)` if it is missing.
4. Reads every `*.sql` file in `db/migrations/`, sorted by name, and skips the names in the ledger.
5. Runs each remaining file in its own transaction together with its ledger insert. A failure rolls
   that file back, stops the run and names the file.

The ledger holds names only. There are no down migrations and no checksums, so editing a file that
is already applied changes nothing in databases that applied it.

File names are `NNNN_snake_case.sql`. `0001`-`0003` are telemetry, and the application schema
(auth, accounts, social, tournaments) starts at `0100`. The next migration takes the highest
number plus one.

## Commands

| Command | Does | Needs |
| --- | --- | --- |
| `npm run db:migrate` | Applies pending migrations to the database in the environment | A database. The script reads the process environment only and does not load `.env.local`: export `DATABASE_URL`, or run `node --env-file=.env.local scripts/db-migrate.mjs` |
| `node scripts/db-migrate.mjs --if-production` | Does nothing unless `VERCEL_ENV=production`. This is what `vercel-build` runs | Vercel |
| `npm run telemetry:query -- "<sql>"` | Runs one statement in a `READ ONLY` transaction with a 30 second timeout. `--json` prints JSON, and stdin works too | `DATABASE_URL` in `.env.local` |

## Where migrations run

- **Production.** The production build on Vercel runs `vercel-build`, which applies pending
  migrations and then runs `next build`. The old code keeps serving until the new build is live.
- **Previews.** Preview builds skip migrations, so a preview never changes the production schema.
  A preview whose database has an older schema needs `npm run db:migrate` run against that
  database by hand.
- **Local.** Nothing runs by itself. Use a throwaway Neon project or branch.

Never run `npm run db:migrate` against production from a laptop without intent. A `.env.local`
created with `vercel env pull .env.local --environment=production` (the way
`scripts/telemetry-query.mjs` expects it) holds the production `DATABASE_URL`. The script asks for
no confirmation, so it applies migrations to whichever database `DATABASE_URL_UNPOOLED` or
`DATABASE_URL` names in the shell that runs it. Check both before you run it, and prefer letting the
production build apply the migration.

## Writing a migration

- **Additive only.** The migration runs while the previous release still serves, and a rollback
  runs the previous release on the new schema. Add tables, add nullable columns or columns with a
  default, add indexes. Drop or rename a column in a later release, once no deployed code reads it.
- **One transaction per file.** Do not use statements Postgres refuses inside a transaction, such
  as `CREATE INDEX CONCURRENTLY`.
- **Plain statements.** The ledger applies each file once, so files do not need `IF NOT EXISTS`.
- **Open with a comment** that says what the migration is for and why, as the existing files do.
- **Player data hangs off `auth_users`** with `ON DELETE CASCADE`, so deleting an account removes
  it. See the header of `db/migrations/0105_social.sql`.

## Adding things

- **A table or column.** A new `db/migrations/NNNN_name.sql`, then the repository under
  `src/infrastructure/<feature>/` and its row mapping, then the use case and port in
  `shared/application/`.
- **Player data.** Reference `auth_users` with `ON DELETE CASCADE`, add the table to its feature's
  export use case (`GET /api/account/export`, see [accounts.md](../accounts/accounts.md)), and
  list what you store and for how long in `src/app/privacy/privacy-tables.ts`. Data held outside
  the database needs a purge step before the account row goes (`purgeExternalData` in
  `src/infrastructure/auth/auth.ts`).
- **A retention period.** `TELEMETRY_RETENTION` in
  `src/infrastructure/telemetry/telemetry-retention.ts` is enforced by the daily cron
  `/api/cron/telemetry-retention`. A changed period must also change the
  matching rows in `src/app/privacy/privacy-tables.ts`.
- **A Better Auth schema change.** Adding a plugin or field to
  `src/infrastructure/auth/auth-options.ts` changes Better Auth's tables. Generate the SQL with
  Better Auth's `getMigrations`, as the headers of `db/migrations/0100_auth.sql` and
  `0102_auth_username.sql` say, and commit it as a new migration.

## Tests

- Repositories are covered by unit tests next to them (for example
  `src/infrastructure/tournament/postgres-tournament-repository.test.ts`).
- No suite runs `db/migrations/` against a real Postgres, and CI sets no `DATABASE_URL`. Apply a
  new migration to a throwaway Neon branch and run the feature against it before you open the
  pull request.
