# Deployment

How Wizard Party runs in production and how to ship it to your own accounts: the realtime worker on
Cloudflare, the Next.js app on Vercel, the order to deploy in, how to check a deployment and how
to roll it back. Every variable and secret is described in [configuration.md](configuration.md),
the database in [database.md](database.md). The contracts that decide the deploy order are in
[protocol.md](../server/protocol.md) and [tournaments.md](../accounts/tournaments.md).

No workflow deploys. `.github/workflows/ci.yml` verifies a change, and the worker is deployed by
hand. Vercel builds the repository it is connected to.

## The pieces

| Piece | Runs on | Defined in | Shipped by |
| --- | --- | --- | --- |
| Realtime worker | Cloudflare Workers, one SQLite-backed Durable Object per room (class `Main`) | `wrangler.jsonc`, `party/worker.ts` | `npm run deploy:party` |
| App and API routes | Vercel, region from `vercel.json` | `vercel.json`, `src/app/` | Vercel build, script `vercel-build` |
| Postgres | Neon | `db/migrations/` | `vercel-build` on production |
| Redis, Blob, Resend | Upstash, Vercel Blob, Resend | [configuration.md](configuration.md) | Optional services, set by variables |

The browser talks to both: HTTP to the app, and a WebSocket to the worker at
`/parties/main/<room>`. The worker posts telemetry and tournament results back to the app over
HTTP, signed with shared secrets. The worker serves no pages, and `GameRoom` runs the same code
locally under `wrangler dev` ([room.md](../server/room.md)).

## Before you deploy

CI runs these on every pull request and push to `main`. Run the same scripts before a manual
deploy:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:worker
```

`npm run check:worker` is `wrangler deploy --dry-run`: it builds the worker bundle and validates
`wrangler.jsonc` without deploying.

## Deploy order

Two things ship separately, so a change must work with the previous release on the other side.
The migration step runs inside the app build, before the new app code serves.

| Change | Deploy first | Why |
| --- | --- | --- |
| A new command, a new optional field on a command, or a new `PROTOCOL_VERSION` | Worker | An old worker drops a command or field it does not know, and the worker serves old and new clients per connection. A new event type or event field may ship in either order. See [protocol.md](../server/protocol.md) and `.claude/skills/protocol-change/references/compatibility.md` |
| Tournament tickets or result reports | App, then worker | Both sides accept the other's previous format. See "Rollout order" in [tournaments.md](../accounts/tournaments.md#rollout-order) |
| Database migration | App (the build applies it) | Keep migrations additive so the old code keeps working. See [database.md](database.md) |
| Neither side's contract | Either | No ordering constraint |

## Deploy the worker

```bash
npx wrangler login
npm run deploy:party
```

`wrangler.jsonc` holds the whole worker definition:

| Key | Value |
| --- | --- |
| `name` | The worker name. Change it for your own account |
| `main` | `party/worker.ts`, the Durable Object adapter that hosts `GameRoom` |
| `compatibility_date` | The Workers runtime date the bundle is built against |
| `workers_dev` | `true`: the worker is reachable on your account's `workers.dev` subdomain. `<your-worker>.workers.dev` on this page stands for that full host |
| `durable_objects.bindings` | Binding `Main`, class `Main` |
| `migrations` | Tag `v1` creates `Main` as a SQLite-backed class. Adding, renaming or deleting a Durable Object class needs a new entry with a new tag |
| `dev.port` | `1999`, the port of `npm run dev:party` |
| `observability` | Cloudflare's logs and metrics for the worker, enabled |
| `version_metadata` | Binding `CF_VERSION_METADATA`, the worker version id recorded on server telemetry |
| `vars` | `TELEMETRY_INGEST_URL` and `TOURNAMENT_RESULT_URL` |

**Point `vars` at your own app before you deploy.** The committed values name the official
deployment, and without `TOURNAMENT_RESULT_URL` the worker offers no tournaments. Set `TELEMETRY_INGEST_URL` to `https://<your-site>/api/telemetry/ingest` and
`TOURNAMENT_RESULT_URL` to `https://<your-site>/api/tournaments/match-results`, then deploy the
worker again after any change to a `vars` entry.

Set the worker secrets once. Each must equal the value in the Vercel project:

```bash
npx wrangler secret put TELEMETRY_INGEST_SECRET
npx wrangler secret put TOURNAMENT_SECRET
```

Without `TELEMETRY_INGEST_SECRET` the worker records no telemetry. Without `TOURNAMENT_SECRET` it
refuses every tournament ticket. Neither stops a normal game.

Routes the worker answers (`fetch` in `party/worker.ts`):

| Route | Answer |
| --- | --- |
| `GET /health` | `{ "status": "ok", "service": "wizard-party", "platform": "cloudflare-workers" }` |
| `GET /parties/main/<room>` | Room availability: player count, phase, `isAvailable`. With the seat-proof header (`SEAT_PROOF_HEADER`) it answers the seat attestation the app asks for instead |
| `/parties/main/<room>` as a WebSocket | The game connection |
| `/party/<room>` | Rewritten to `/parties/main/<room>`, so availability URLs under `/party/` resolve to the same room |
| anything else | 404 |

Room state persists in the room's Durable Object storage, so a worker deploy reloads every room
from storage (`party/utils/state.ts`).

## Deploy the frontend

1. Push the repository to GitHub and import it in Vercel.
2. Set the environment variables for Production. A production build needs the settings in
   `PRODUCTION_SETTINGS` (`src/config/deployment-requirements.ts`): `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_REALTIME_HOST` (the worker's hostname with no scheme, for example
   `<your-worker>.workers.dev`) and the imprint (`NEXT_PUBLIC_IMPRINT_NAME`, `_STREET`, `_CITY`
   and `_EMAIL`; `_COUNTRY` and `_WEBSITE` are optional).
3. Set `NEXT_PUBLIC_REALTIME_HOST` for Preview too if previews should play.
4. Deploy.

The code names no site, worker or operator of its own (`src/config/deployment.config.ts`). A
build without them connects to `localhost:1999` and shows a placeholder imprint, so
`next.config.ts` fails a Vercel production build (`VERCEL_ENV=production`) that lacks any of
them, and the previous deployment stays live. A preview without `NEXT_PUBLIC_APP_URL` links to
its own deployment URL. These values are inlined at build time, so rebuild after changing them.

`package.json` defines the script `vercel-build` as
`node scripts/db-migrate.mjs --if-production && next build`. A production deployment applies pending
migrations first; a preview deployment skips them.

`vercel.json` pins the region and registers one cron: a daily call to
`/api/cron/telemetry-retention`, which enforces every storage period of the privacy policy. It
needs `CRON_SECRET` in the project, and answers 401 without it.

Social sign-in needs each provider's callback registered as
`https://<your-site>/api/auth/callback/<provider>` (see [configuration.md](configuration.md)).

## Secrets

Names only. Values never go in the repository, in `wrangler.jsonc` or in an issue. Generate the
random ones with `openssl rand -base64 48`; `DATABASE_URL` comes from your Neon project.

| Secret | Worker | Vercel | Without it |
| --- | --- | --- | --- |
| `TELEMETRY_INGEST_SECRET` | yes | yes, same value | No telemetry or global stats |
| `TOURNAMENT_SECRET` | yes | yes, same value | Tournaments unavailable |
| `BETTER_AUTH_SECRET` | no | yes | Auth does not start in production |
| `DATABASE_URL` | no | yes | No accounts, tournaments or stored telemetry |
| `CRON_SECRET` | no | yes | Retention cron answers 401 |

Rotating a shared secret means setting both sides to the new value. Outstanding tournament tickets
become invalid and players fetch new ones, and undelivered results wait in the worker's outbox
until both sides match. Optional services (Resend, Blob, Redis, OAuth providers) are listed in
[configuration.md](configuration.md).

## Check a deployment

| Check | Command | Expect |
| --- | --- | --- |
| Worker is up | `curl https://<your-worker>.workers.dev/health` | 200 with `"status":"ok"` |
| Room routing | `curl https://<your-worker>.workers.dev/parties/main/<room>` | JSON with `isAvailable` |
| Multiplayer works | `node scripts/realtime-smoke.mjs https://<your-worker>.workers.dev` | Exit code 0 |
| App sees its services | `curl https://<your-site>/api/account/capabilities` | JSON with `providers`, `email`, `passkeys`, `tournaments` matching what you configured |

The smoke script plays a short game over real sockets in throwaway rooms named `smoke-<id>` and
probes one tournament room. It needs no database. Without an argument it tests
`http://localhost:1999`. The capabilities answer is cached for five minutes (`Cache-Control` in the
route).

Finish in a browser: create a room on the site, join it from a second window and play a card.

## Roll back

- **Worker.** `npx wrangler deployments list`, then `npx wrangler rollback <version-id>`. This
  restores code, not storage: the previous worker reads whatever the new one persisted. Keep
  changes to `PersistedState` (`party/utils/types.ts`) additive so an older loader ignores a field
  it does not know.
- **App.** Promote the previous deployment in the Vercel dashboard. This does not undo
  migrations.
- **Database.** There are no down migrations. Fix forward with a new migration
  ([database.md](database.md)).
- **Order.** Roll back the side you deployed last. If a protocol change forced "worker first", the
  old client still works against the rolled-back worker only if the change stayed compatible
  ([protocol.md](../server/protocol.md)).

## Adding things

- **A worker variable or secret.** `Env` in `party/worker.ts`, then `.dev.vars.example`,
  `vars` in `wrangler.jsonc` (a non-secret) or `npx wrangler secret put <NAME>` (a secret), then a
  row in [configuration.md](configuration.md) and in the secrets table above if both sides share it.
- **A Durable Object class.** The class exported from `party/worker.ts`, a binding under
  `durable_objects.bindings` and a new entry with a new tag under `migrations` in `wrangler.jsonc`.
- **A cron.** An entry under `crons` in `vercel.json` and a route that checks `CRON_SECRET` the
  way `src/app/api/cron/telemetry-retention/route.ts` does.
- **A post-deploy check.** Extend `scripts/realtime-smoke.mjs`, which accepts a deployed origin.

## Tests

- `npm run check:worker` in CI validates the worker bundle and `wrangler.jsonc`.
- The CI step "Multiplayer smoke test and golden path" starts `npm run dev:party`, waits for
  `/health`, runs `scripts/realtime-smoke.mjs`, then plays a full game in the built app
  (`e2e/golden-path.spec.ts`). See [testing.md](../testing/testing.md).
