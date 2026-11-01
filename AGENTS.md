# Wizard Party

An online multiplayer Wizard card game (AGPL-3.0-or-later). The frontend is Next.js 16 (App Router),
React 19, TypeScript and Three.js. The realtime server is a Cloudflare Worker with Durable Objects:
`party/worker.ts` hosts one `GameRoom` (`party/room/game-room.ts`) per room through `partyserver`.
Accounts, social data and tournaments run in Next.js route handlers on Postgres and Redis. The
directory is called `party/` after the `partyserver` and `partysocket` packages, which provide the
room routing and the client socket.

This file is the one source for coding agents; `CLAUDE.md` imports it. Docs by area:
[architecture](docs/architecture.md), [game rules](docs/game-rules/engine.md),
[server](docs/server/room.md), [client](docs/client/connection.md),
[testing](docs/testing/testing.md), [accounts](docs/accounts/accounts.md).

## Layers and the dependency rule

Dependencies point inward. Lint does not enforce this, so review does.

| Layer | Path | May import |
| --- | --- | --- |
| Domain | `shared/domain/` | Itself only. No runtime packages. |
| Application | `shared/application/` | Domain, `shared/telemetry/`, `shared/tournament/` |
| Wire helpers | `shared/telemetry/`, `shared/tournament/`, `shared/realtime/` | TypeScript shared by the web app and the worker; `telemetry` uses `zod`, `tournament` imports the domain |
| Worker | `party/` | `shared/` by relative path (rule 6). Never `src/`, except `party/test-support/`. |
| Adapters | `src/infrastructure/` | `shared/`; the sandbox adapters also host `party/room/`; implements ports |
| Presentation | `src/presentation/`, `src/app/`, `src/lib/` | `shared/`; adapters and containers only from server code in `src/app/` (and the sandbox page) |

- The Game aggregate (`shared/domain/entities/game.ts`) rejects every illegal move with a typed
  `GameError`. Use cases orchestrate it; handlers in `party/handlers/` call use cases.
- Chance and time come from the domain ports `IRandom` and `IClock` (`shared/domain/ports/`).
- Containers (`src/infrastructure/*/*-container.ts`) are `server-only` and wire ports to adapters.
  Route handlers call `getAccountServices()`, `getSocialServices()` or `getTournamentServices()`.

## Directory map

| Path | Holds |
| --- | --- |
| `src/app/` | Pages and API routes. `page.tsx` stays thin. |
| `src/presentation/` | `components/<feature>/`, `hooks/`, `providers/`, `state/`, `config/`, `types/`, `utils/` |
| `src/infrastructure/` | Postgres, Redis, email, auth, telemetry and sandbox adapters |
| `src/lib/`, `src/config/` | Browser helpers (storage, sounds, game traces, client telemetry); `deployment.config.ts` (`REALTIME_HOST`) |
| `shared/domain/` | Entities, value objects, services, events and commands, `expansions/`, `bot-ai/` |
| `shared/application/` | `use-cases/<area>/`, `ports/`, `projections/`, `use-case-registry.ts` |
| `party/` | `worker.ts`, `runtime.ts`, `room/`, `handlers/`, `protocol/`, `telemetry/`, `tournament/`, `bot/`, `session/`, `utils/`, `config/`, `test-support/` |
| `db/migrations/`, `scripts/` | SQL migrations; build, audit, migration, sound and smoke scripts |
| `test/integration/`, `e2e/` | Level-4 suites; Playwright suites |

## Rules agents break

1. **One owner per rule.** Game rules live in `shared/domain/expansions/`. Never re-implement a
   rule in a hook, component, bot or handler, and never `switch` on `CardType` in a rule engine.
2. **Hidden information.** Per-seat views come from `createPersonalizedState`. Broadcast events
   carry no secrets. A new private field is redacted in the projection.
3. **The client displays; the server decides.** UI code never derives legality or scores.
4. **Protocol.** Commands are decoded at the boundary (`shared/domain/events/command-decoders.ts`),
   every field added to an existing message is optional, and the worker and the web app deploy
   separately.
5. **Transactions.** Every room entry point runs inside the `CommitGate`: handlers change the game,
   call `ctx.broadcast`, `ctx.broadcastPersonalizedState` and `ctx.saveState`, and never schedule
   timers. See [docs/server/room.md](docs/server/room.md).
6. **Worker code.** `party/worker.ts` compiles under `tsconfig.worker.json`: ES2022 libs, no DOM,
   no `@/` or `@shared/` aliases. Code reachable from it (`party/`, `shared/`) uses relative
   imports and no browser globals.
7. **Web Storage** goes through `safeLocalStorage` and `safeSessionStorage` from `@/lib/storage`.
   ESLint rejects direct use in `src/`.
8. **Imports.** `@/*` is `src/*` and `@shared/*` is `shared/*` (`tsconfig.json`). Inside a feature
   use relative imports; across features import the folder's `index.ts` barrel.
9. **No secrets, hosts or player data** in the tree. Env vars are documented in `.env.example`
   (Next.js) and `.dev.vars.example` (worker).
10. **Docs ship with the code.** A change that renames a path, export, command, env var, limit or
    protocol field updates the doc that names it.

## Files, size and where things go

| Kind | Name | Example |
| --- | --- | --- |
| Component | `PascalCase.tsx` | `PlayerHand.tsx` |
| Hook | `useCamelCase.ts` | `useDragToPlay.ts` |
| Other modules | `kebab-case.ts` | `card-geometry.ts` |
| Types, config, port | `*.types.ts`, `*.config.ts`, `*.port.ts` | `room.types.ts`, `physics.config.ts` |
| Service, use case | `*.service.ts`, `*.use-case.ts` | `play-card.use-case.ts` |
| Tests | `*.test.ts` next to the source; `*.integration.test.ts` in `test/integration/` | |

Directories are kebab-case. A new feature folder gets an `index.ts` barrel on day one.

- **Size** (`eslint.config.mjs`). `max-lines` is an error at 300 code lines. It is a warning at 400
  in `shared/`, `party/`, `src/presentation/config/`, `src/app/**/*.tsx`, settings components and a
  few listed UI files, and off in tests. `max-lines-per-function` warns above 100, `complexity`
  above 15. Split a module long before the limit.
- **Constants** live in config files: `src/presentation/config/` (`constants.ts` for app-wide values
  and storage keys), `party/config/`, `shared/domain/constants/`. No magic numbers in components or
  handlers.
- **Types.** Domain types come from `@shared/domain` and are never redeclared. Wire types are in
  `shared/domain/events/`. UI-only types go in `src/presentation/types/*.types.ts`, API types in
  `src/app/api/types/`.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev:all` | Next.js (port 3000) and the worker (`wrangler dev`, port 1999) |
| `npm run dev`, `npm run dev:party` | Either one alone |
| `npm run typecheck` | `tsc --noEmit`, then `tsc --project tsconfig.worker.json` |
| `npm run lint`, `npm test`, `npm run build` | ESLint, Vitest (`vitest run`), `next build` |
| `npm run check:worker` | `wrangler deploy --dry-run`: does the worker bundle |
| `npm run e2e:build`, `npm run e2e`, `npm run e2e:perf` | Sandbox build, Playwright suites, frame budgets |
| `npm run audit:animations` | Scenario, theme and viewport matrices in the sandbox |
| `npm run db:migrate` | Applies `db/migrations/` (needs `DATABASE_URL`) |
| `npm run sounds:generate` | Regenerates `public/sounds/` (needs FFmpeg 7 or newer) |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, build, `check:worker`, the realtime
smoke (`scripts/realtime-smoke.mjs`) and the golden path. The full browser matrix
(`.github/workflows/e2e.yml`) costs runner hours; run it narrowly (see the `pull-request` skill).

## Tests

Pick the cheapest boundary that can see the contract; the table is in
[boundaries.md](.claude/skills/test-audit/references/boundaries.md). Levels: 1 domain
(`shared/domain/**`), 2 use case (`shared/application/use-cases/**`), 3 room harness
(`party/test-support/room-harness.ts`, suites in `party/room/*.test.ts`), 4 full stack in process
(`test/integration/`, [README](test/integration/README.md)), 5 animation sandbox in a browser
(`/sandbox/animations`), 6 Playwright (`e2e/`; `e2e/golden-path.spec.ts` plays a full game in the
real app), plus the realtime smoke. Time is fake or virtual, randomness is seeded, and nothing
reaches an external service. More in [docs/testing/testing.md](docs/testing/testing.md).

## Project skills

Skills live in `.claude/skills/<name>/SKILL.md`; read the one that matches your change.

| Skill | Use it for |
| --- | --- |
| `protocol-change` | Client commands, server events, acks, rate limits, `PROTOCOL_VERSION`, deploy order |
| `rules-change` | Game rules, house rules, expansions, scoring, bots disagreeing with the rules |
| `ui-component` | Components, HUD, layout, themes, accessibility, UI tests |
| `sandbox-scenario` | Animation sandbox scenarios and the Playwright suites that assert them |
| `test-audit` | Gate for new tests, choosing a boundary, pruning tests |
| `slop-audit` | Behaviour-preserving cleanup: dead code, duplicates, magic numbers |
| `pull-request` | Branches, conventional titles, PR descriptions, CI failures, the `e2e` label |
| `writing-docs` | Where docs live and how they are written and checked |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
