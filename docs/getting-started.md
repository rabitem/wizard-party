# Getting started

How to run Wizard Party on your machine, play a first game and find the developer tools. Read it
before your first change. The layers and the dependency rule are in
[architecture.md](architecture.md); how to test a change is in [testing/testing.md](testing/testing.md).

## Prerequisites

| Need | Where it is defined | Note |
| --- | --- | --- |
| Node.js | `engines` in `package.json` (`^22.13.0 \|\| ^24.0.0 \|\| ^26.0.0`) | `.nvmrc` names the major version to use with nvm or fnm; CI runs Node 26 (`.github/workflows/ci.yml`) |
| npm | ships with Node.js | `npm ci` and `npm install` both work; the lockfile is `package-lock.json` |
| Git | | |
| FFmpeg 7.0 or newer with libmp3lame | `scripts/generate-sounds.mjs` | Only for `npm run sounds:generate` |
| A browser with WebGL 2 | | The table is a Three.js scene |

You need no account on any service to play locally. A database, Redis, email and the other
services in `.env.example` switch on optional features (see [Optional services](#optional-services)).

## Install and run

```bash
git clone https://github.com/rabitem/wizard-party.git
cd wizard-party
npm install
npm run dev:all
```

`npm run dev:all` runs two processes through `concurrently`:

| Process | Command | Port | Config |
| --- | --- | --- | --- |
| Next.js app | `npm run dev` | 3000 | |
| Game worker (Cloudflare Worker with Durable Objects, `party/worker.ts`) | `npm run dev:party` (`wrangler dev`) | 1999 | `dev.port` in `wrangler.jsonc` |

Open <http://localhost:3000>. Unless `NEXT_PUBLIC_REALTIME_HOST` names a worker, a page served from
`localhost` connects to `LOCAL_REALTIME_HOST` (`localhost:1999`, `shared/realtime/realtime-host.ts`),
chosen by `getDefaultHost` in `src/presentation/components/room-browser/utils.ts`. Development builds
never default to the hosted worker (`src/config/deployment.config.ts`), so a local run does not
reach the production deployment.

## Your first game

1. Open <http://localhost:3000>. Answer the privacy banner (the game works with "Essential only")
   and enter a name.
2. Choose **Create room** in the Play section and confirm. You land in the lobby at
   `/lobby/<room-code>`.
3. Open **Table settings** to change the rules, the expansion set or the turn timers. Rooms are
   public or private; the invite link in the lobby brings others to the same code.
4. Select an open seat and add bots until three seats are taken (`CONSTANTS.MIN_PLAYERS` in
   `src/presentation/config/constants.ts`).
5. Start the game. Bots bid and play on their own; you bid, play a card and read the round
   summary.

To test multiplayer, open the invite link in a second browser profile or a private window: each
browser keeps its own player id in local storage. `e2e/golden-path.spec.ts` plays this flow
against the real app.

## Environment variables

Two files carry local configuration, and neither is required.

| File | Read by | Copy it from |
| --- | --- | --- |
| `.env.local` | The Next.js app (`npm run dev`) | `.env.example` |
| `.dev.vars` | The game worker (`npm run dev:party`) | `.dev.vars.example` |

Both templates explain every value in comments. Three rules to keep:

- The worker does not read `.env.local`, and the app does not read `.dev.vars`. A secret shared
  by both sides (`TELEMETRY_INGEST_SECRET`, `TOURNAMENT_SECRET`) must have the same value in each
  file.
- `wrangler.jsonc` `vars` point at the production site. `.dev.vars.example` replaces them with
  `http://localhost:3000` URLs, so copy it before you run tournaments or telemetry locally.
- Never point `DATABASE_URL` at a production database from a development machine.

[operations/configuration.md](operations/configuration.md) lists every variable and secret.

### Optional services

Everything is optional. A feature whose backing service is missing is unavailable or skipped
instead of failing the app.

| Feature | Needs |
| --- | --- |
| Accounts, friends, inbox, leaderboard | `DATABASE_URL` (Neon Postgres) and `BETTER_AUTH_SECRET`; run `npm run db:migrate` once |
| Tournaments | the above plus an identical `TOURNAMENT_SECRET` in `.env.local` and `.dev.vars` |
| Social sign-in | the client id and secret of at least one provider in `.env.example` |
| Sign-in codes and other emails | `RESEND_API_KEY`; without it, emails are logged to the server console |
| Friend presence, shared rate limits | Upstash Redis (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`) |
| Custom sound uploads | `BLOB_READ_WRITE_TOKEN` |
| Server telemetry | `TELEMETRY_INGEST_SECRET` in both files, and `DATABASE_URL` to store the batches |
| Global stats | Server telemetry, and Upstash Redis for the totals |

`npm run db:migrate` applies `db/migrations/*.sql` through `scripts/db-migrate.mjs`, using
`DATABASE_URL_UNPOOLED` when set and `DATABASE_URL` otherwise. See
[operations/database.md](operations/database.md).

## Scripts

All scripts are in `package.json`. Commands marked "worker" need `npm run dev:party` running.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run dev:party` | Game worker on port 1999 |
| `npm run dev:all` | Both of the above |
| `npm run typecheck` | `tsc --noEmit` for the app, then `tsc --project tsconfig.worker.json` for the worker |
| `npm run lint` | ESLint |
| `npm test` | Vitest, every unit, room and integration suite |
| `npm run build` | Production build of the app |
| `npm run check:worker` | `wrangler deploy --dry-run`: bundles the worker without deploying |
| `node scripts/realtime-smoke.mjs [origin]` (worker) | Raw-socket smoke test; the origin defaults to `http://localhost:1999` |
| `npm run e2e:build` | Production build with the animation sandbox route enabled |
| `npm run e2e` | Playwright suites; run `npx playwright install` first, and see [testing/testing.md](testing/testing.md) before running more than one project |
| `npm run e2e:perf` | Frame-rate budgets on real hardware |
| `npm run audit:animations` | Animation audit over the sandbox (`scripts/animation-audit.mjs`; the dev server must run) |
| `npm run test:physics` | The physics subset of the unit tests |
| `npm run sounds:generate` | Regenerate `public/sounds/*.mp3` (needs FFmpeg) |
| `npm run db:migrate` | Apply database migrations |
| `npm run deploy:party` | Deploy the worker; see [operations/deployment.md](operations/deployment.md) |

[CONTRIBUTING.md](../CONTRIBUTING.md) lists what CI runs on a pull request.

## The animation sandbox

`/sandbox/animations` plays the production client against an in-browser loopback server, on a
virtual clock unless you ask for the real one. It needs no worker and no database. The route is
served by `npm run dev`, by a build made with `npm run e2e:build` and on Vercel preview
deployments. Any other production build answers 404 unless `NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX=1`
was set at build time (`isSandboxEnabled` in `src/app/sandbox/animations/page.tsx`).

Open <http://localhost:3000/sandbox/animations> for the control panel and its scenarios. The `clock`
query parameter picks the clock (`play`, `paused`, `fast` or `real`) and `ui=0` hides the panel
(`src/app/sandbox/animations/sandbox-app.tsx`). The browser suites in `e2e/` drive the same page.
How to run them is in [testing/testing.md](testing/testing.md); how the sandbox is built is in
[testing/sandbox-framework.md](testing/sandbox-framework.md).

## Sounds

The sound effects in `public/sounds/` are synthesised, not recorded. They come from the designs in
`scripts/lib/sound-designs-*.mjs` through `scripts/generate-sounds.mjs`:

```bash
npm run sounds:generate
npm run sounds:generate -- bonk coin
```

The first command renders every sound, the second only the named ones. FFmpeg 7.0 or newer with
libmp3lame must be on `PATH`. [public/sounds/README.md](../public/sounds/README.md) describes how
to add a sound.

## Where to go next

| To change | Read |
| --- | --- |
| A rule, a card or a bot | [game-rules/engine.md](game-rules/engine.md) |
| Room behaviour or the wire protocol | [server/room.md](server/room.md), [server/protocol.md](server/protocol.md) |
| The table, HUD or connection code | [client/connection.md](client/connection.md), [client/hud-layout.md](client/hud-layout.md) |
| Accounts, friends or tournaments | [accounts/accounts.md](accounts/accounts.md) |
