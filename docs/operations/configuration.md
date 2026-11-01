# Configuration

Every environment variable and secret the code reads, in one table. Read it before you add a
setting, deploy to your own accounts or wonder why a feature answers "unavailable". Steps for
shipping live in [deployment.md](deployment.md); the database variables are used by
[database.md](database.md).

## Where values live

| Target | Holds | Local file | Deployed |
| --- | --- | --- | --- |
| Next.js app (Vercel) | Everything except the worker and shell rows | `.env.local`, copied from `.env.example` | Vercel project environment variables |
| Game worker (Cloudflare) | `TELEMETRY_INGEST_URL`, `TELEMETRY_INGEST_SECRET`, `TOURNAMENT_SECRET`, `TOURNAMENT_RESULT_URL`, `CHARACTER_TICKET_SECRET` | `.dev.vars`, copied from `.dev.vars.example` | `vars` in `wrangler.jsonc`, secrets with `npx wrangler secret put <NAME>` |
| Shell | Test and tooling knobs | none | none |

- The worker does not read `.env.local`, and the app does not read `.dev.vars`. A value shared by
  both sides (`TELEMETRY_INGEST_SECRET`, `TOURNAMENT_SECRET`, `CHARACTER_TICKET_SECRET`) is set in both places and must be
  identical.
- `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time. Changing one needs a
  rebuild. `src/config/deployment.config.ts` reads each one literally for that reason.
- Everything is optional for local play. A feature whose backing service is missing answers
  "unavailable" (HTTP 503 or a capability flag) instead of failing.
- Secrets never go in the repository or in `vars`. `.env.example` and `.dev.vars.example` hold
  names, comments and local URLs, never secret values.

## Variables

Rows are grouped by area. "Set on" is the target from the table above. "Unset" says what the code
does when the value is missing.

| Name | Set on | Read by | Required | Unset | Purpose |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | app, build time | `src/config/deployment.config.ts` | Production | `https://<NEXT_PUBLIC_VERCEL_URL>` on Vercel, else `http://localhost:3000` | Public origin for metadata, sitemap, robots, profile, invite and email links |
| `NEXT_PUBLIC_IMPRINT_NAME` | app, build time | `src/config/deployment.config.ts` | Production | A placeholder operator | Operator named on `/imprint`. Setting it switches the whole imprint to the `NEXT_PUBLIC_IMPRINT_*` values, and unset ones are left out |
| `NEXT_PUBLIC_IMPRINT_STREET` | app, build time | `src/config/deployment.config.ts` | Production | Left out of the imprint (when `NEXT_PUBLIC_IMPRINT_NAME` is set) | First address line |
| `NEXT_PUBLIC_IMPRINT_CITY` | app, build time | `src/config/deployment.config.ts` | Production | Left out | Second address line (postal code and city) |
| `NEXT_PUBLIC_IMPRINT_COUNTRY` | app, build time | `src/config/deployment.config.ts` | No | Left out | Third address line |
| `NEXT_PUBLIC_IMPRINT_EMAIL` | app, build time | `src/config/deployment.config.ts` | Production | Empty | Contact address on the imprint |
| `NEXT_PUBLIC_IMPRINT_WEBSITE` | app, build time | `src/config/deployment.config.ts` | No | Empty, so no link | Operator website (absolute URL) |
| `NEXT_PUBLIC_REALTIME_HOST` | app, build time | `src/config/deployment.config.ts` | Production, and Preview if previews should play | `localhost:1999` | Game worker host the browser connects to: hostname[:port], no scheme |
| `REALTIME_HOST` | app, runtime | `serverRealtimeHost()` in `src/config/deployment.config.ts` | No | The build's `REALTIME_HOST` constant | Worker host server routes use to check room membership and attest seats |
| `NEXT_PUBLIC_PARTYKIT_HOST` | app, build time | `src/config/deployment.config.ts` | No | Ignored | Legacy name of `NEXT_PUBLIC_REALTIME_HOST`, read as a fallback. Leave unset |
| `TELEMETRY_INGEST_URL` | worker `vars` | `party/worker.ts` | No | Worker records no telemetry | Endpoint the worker posts signed event batches to (`/api/telemetry/ingest` of your app) |
| `TELEMETRY_INGEST_SECRET` | worker secret and app | `party/worker.ts`, `src/app/api/telemetry/ingest/route.ts`, `src/infrastructure/rate-limit/rate-limit-key-secret.ts` | Both sides, same value, for telemetry and global stats | Worker: no telemetry. App: the ingest route answers 503 | HMAC key that signs and verifies telemetry batches. Also the fallback source for `RATE_LIMIT_KEY_SECRET` |
| `TOURNAMENT_SECRET` | worker secret and app | `party/worker.ts`, `src/infrastructure/tournament/tournament-config.ts` | Both sides, same value, for tournaments | Tournaments are unavailable: no tickets issued, worker refuses tickets | Signs match tickets and result reports. Surrounding whitespace is trimmed on both sides. See [tournaments.md](../accounts/tournaments.md#configuration) |
| `CHARACTER_TICKET_SECRET` | worker secret and app | `party/worker.ts`, `src/infrastructure/account/hmac-character-ticket-signer.ts` | Both sides, same value, for looks at the table | App: `POST /api/account/character/ticket` answers 503. Worker ignores tickets. Seats of signed-in players show a silhouette to anyone who cannot see their account | Signs character tickets (a username and a look). Surrounding whitespace is trimmed on the app side. See [characters.md](../client/characters.md#at-the-table) |
| `TOURNAMENT_RESULT_URL` | worker `vars` | `party/worker.ts`, `party/tournament/tournament-match-services.ts` | For tournaments | The worker offers no tournaments | Where the worker posts attested match results (`/api/tournaments/match-results` of your app) |
| `DATABASE_URL` | app | `src/infrastructure/db/neon.ts`, `src/infrastructure/db/pg-pool.ts`, `scripts/db-migrate.mjs`, `scripts/telemetry-query.mjs` | For accounts, friends, tournaments, leaderboard, community stats and stored telemetry | Those features answer "unavailable" (`isDatabaseConfigured()`) | Neon Postgres connection string (pooled). The HTTP driver needs Neon |
| `DATABASE_URL_UNPOOLED` | app environment, read by migrations only | `scripts/db-migrate.mjs` | No | Falls back to `DATABASE_URL` | Direct (non-pooled) connection that `npm run db:migrate` uses |
| `BETTER_AUTH_SECRET` | app | `src/infrastructure/auth/auth-options.ts`, `src/infrastructure/email/email-unsubscribe.ts` | Production, wherever `DATABASE_URL` is set | Better Auth refuses to start in production without it | Signs and encrypts sessions. Also the fallback key for unsubscribe links |
| `BETTER_AUTH_URL` | app | `resolveBaseUrl()` in `src/infrastructure/auth/auth-options.ts` | No | Production (`VERCEL_ENV`): `SITE_URL`. Preview: `https://<VERCEL_URL>`. Otherwise `http://localhost:3000` | Auth base URL and trusted origin |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | app | `src/infrastructure/auth/social-providers.ts` | No | Provider not offered | Google sign-in. Offered once both values exist |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | app | `src/infrastructure/auth/social-providers.ts` | No | Provider not offered | Discord sign-in |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | app | `src/infrastructure/auth/social-providers.ts` | No | Provider not offered | GitHub sign-in |
| `RESEND_API_KEY` | app | `src/infrastructure/email/email-sender.ts` | No | Emails are logged, not sent. Email verification is off and code flows are hidden (`email: false` in `/api/account/capabilities`) | Resend key for every email the app sends: codes, password resets, account notices and friend requests |
| `EMAIL_FROM` | app | `src/infrastructure/email/email-sender.ts` | No | `Wizard Party <noreply@...>` on the host of `SITE_URL` | Sender address |
| `EMAIL_UNSUBSCRIBE_SECRET` | app | `src/infrastructure/email/email-unsubscribe.ts` | No | Key derived from `BETTER_AUTH_SECRET` | Signs one-click unsubscribe links. Set it to keep links valid when `BETTER_AUTH_SECRET` is rotated |
| `BLOB_READ_WRITE_TOKEN` | app | `@vercel/blob`, used by `src/infrastructure/account/vercel-blob-audio-storage.ts` | For custom sound uploads | Uploads fail | Vercel Blob store token |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | app | `src/lib/redis.ts` | No | The URL and the token are each read before their `UPSTASH_*` equivalent. Without both, there is no Redis | Upstash Redis through the Vercel KV integration |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | app | `src/lib/redis.ts` | No | No Redis: friend presence, room rosters and global stats are skipped, usage counters and the username-check limit fail open, and auth rate limiting uses Better Auth's default storage | Upstash Redis used directly |
| `RATE_LIMIT_KEY_SECRET` | app | `src/infrastructure/rate-limit/rate-limit-key-secret.ts` | No | Key derived from `TELEMETRY_INGEST_SECRET`, else random per instance (limits are then per instance) | Hashes IP-derived rate-limit subjects |
| `CRON_SECRET` | app | `src/app/api/cron/telemetry-retention/route.ts` | On Vercel, for the retention cron | The route answers 401 to every call | Bearer token Vercel Cron sends to `/api/cron/telemetry-retention` |
| `NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX` | app, build time | `src/app/sandbox/animations/page.tsx` | No | `/sandbox/animations` is a 404 in production builds. Development builds and Vercel previews serve it | Set to `1` to serve the sandbox in a production build. `npm run e2e:build` sets it |
| `NODE_ENV` | platform | `src/infrastructure/auth/auth-options.ts`, `src/infrastructure/email/email-sender.ts`, `src/app/sandbox/animations/page.tsx`, `src/app/dev/theme-gallery/page.tsx` | Set by Next.js | n/a | Selects auth rate limiting, email log redaction and whether the developer pages are served |
| `VERCEL_ENV` | platform | `next.config.ts`, `scripts/db-migrate.mjs`, `src/infrastructure/auth/auth-options.ts`, `src/app/sandbox/animations/page.tsx`, `src/app/dev/theme-gallery/page.tsx` | Set by Vercel | Treated as not production | `production` or `preview`. Gates the production settings check, migrations in `vercel-build` and the developer pages |
| `VERCEL_URL` | platform | `src/infrastructure/auth/auth-options.ts` | Set by Vercel | n/a | Deployment host, the auth base URL on previews |
| `NEXT_PUBLIC_VERCEL_URL` | platform, build time | `src/config/deployment.config.ts` | Set by Vercel when system variables are exposed | `http://localhost:3000` | Site URL of a deployment without `NEXT_PUBLIC_APP_URL` |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | platform | `src/lib/client-telemetry/session-context.ts` | Set by Vercel | `APP_VERSION_FALLBACK` in `CLIENT_TELEMETRY_CONFIG` | Build id on browser telemetry |
| `CF_VERSION_METADATA` | platform | `party/worker.ts` | Binding `version_metadata` in `wrangler.jsonc` | Server version recorded as null | Worker version id on server telemetry. Not a variable you set |
| `CI` | platform | `playwright.config.ts` | Set by GitHub Actions | n/a | Playwright retries, `forbidOnly` and the reporter |
| `E2E_BASE_URL` | shell | `playwright.config.ts` | No | Playwright starts a local server | Run the browser suites against a deployed URL |
| `E2E_PORT` | shell | `playwright.config.ts` | No | `3210` | Port of the local server Playwright starts |
| `E2E_WORKERS` | shell | `playwright.config.ts` | No | `2` | Playwright worker count |
| `E2E_FULL_MATRIX` | shell | `e2e/*.spec.ts` | No | Off | `1` widens the browser suites: every viewport, every pair of settings, every table size (see [testing.md](../testing/testing.md)) |
| `FULL_MATRIX` | shell | `party/test-support/matrix.ts` | No | Off | `1` runs the full product of the level-3 and level-4 matrix suites instead of the pairwise subset (about 5 minutes) |
| `PERF_TARGET_FPS` | shell | `e2e/performance.spec.ts` | No | `FRAME_BUDGETS.DEFAULT_TARGET_FPS` in `src/presentation/config/sandbox-budgets.config.ts` | Frame rate the performance suite enforces |
| `PROPERTY_GAMES` | shell | `shared/application/use-cases/game/random-games.property.test.ts` | No | 24 | Seed count of the random-games property test |
| `AUDIT_BROWSER` | shell | `scripts/lib/audit-browser.mjs` | No | The first existing path in `BROWSER_CANDIDATES` (Edge, Chrome or Chromium install paths) | Browser for `npm run audit:animations` |

## Rules for a variable

- **Optional by default.** A missing value turns a feature off with an "unavailable" answer. It
  never stops `npm run dev:all` from starting a game.
- **Read at the edge.** The app reads the environment in config modules (`deployment.config.ts`,
  `tournament-config.ts`, `social-providers.ts`), infrastructure adapters and route handlers, and
  the worker reads its `env` in `party/worker.ts`. Nothing under `shared/` reads the environment
  outside test files.
- **No deployment in the code.** The code names no site, worker or operator. Defaults are local
  (`localhost`, a placeholder imprint) and live in `src/config/deployment.config.ts`. What a
  production deployment must set is `PRODUCTION_SETTINGS` in
  `src/config/deployment-requirements.ts`; `next.config.ts` fails a Vercel production build
  without it.
- **Provider ids are data.** `PROVIDERS` in `src/infrastructure/auth/social-providers.ts` lists
  each identity provider with its two variable names. A provider is offered once both exist. The
  callback URL to register with the provider is `<your-site>/api/auth/callback/<provider>`.

## Adding things

- **An app variable.** Read it in a config module under `src/config/` or `src/infrastructure/`.
  Add it to `.env.example` with a comment, and add a row here.
- **A worker variable or secret.** Add it to `Env` in `party/worker.ts`, pass it into the room
  through the composition root, and add it to `.dev.vars.example`. A non-secret default goes in
  `vars` in `wrangler.jsonc`. A secret is set with `npx wrangler secret put <NAME>`. Add a row
  here.
- **A sign-in provider.** Add an entry to `PROVIDERS` and to `AuthProviderId` in
  `src/infrastructure/auth/auth-capabilities.ts`, then add its two variables to
  `.env.example` and this table.
- **A shared secret.** Set the same value on both sides, document both in the table and name the
  failure when they differ.

## Tests

- `serverRealtimeHost()`, `resolveBaseUrl()`, `tournamentSecret()`, `configuredSocialProviders()`,
  `rateLimitKeySecret()` and the unsubscribe signing key take an `env` argument, so tests pass a
  plain object. The `deployment.config.ts` constants are read once at import.
- `npm run check:worker` (`wrangler deploy --dry-run`) builds the worker bundle and validates
  `wrangler.jsonc`. It does not check that secrets exist.
- The golden path in CI plays against a local worker and a build with no service credentials, so it
  exercises the "optional by default" rule.
