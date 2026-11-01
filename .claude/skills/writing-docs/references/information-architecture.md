# Where docs live

Root files stay where GitHub and agents look for them: `README.md`, `CONTRIBUTING.md`,
`SECURITY.md`, `AGENTS.md`, `CLAUDE.md`, and the licence. Everything else is under `docs/`,
grouped by the area a contributor is about to change, not by the date it was written.

## Target layout

```
docs/
  README.md                  index: one line per page, grouped as below
  getting-started.md         prerequisites, npm install, dev:all, local env vars, first game, sandbox
  architecture.md            layers and the dependency rule, src/ shared/ party/ db/, composition roots
  game-rules/
    rules.md                 the game as players see it: deck, rounds, bids, scoring, rule variants,
                             special cards
    engine.md                the rules policy, Game aggregate, determinism, hidden information, bots
  server/
    room.md                  GameRoom, its hosts, transactions, pause, timers, rematch
    protocol.md              versions, seats and tokens, commands, events, rate limits, persistence
  client/
    connection.md            GameSession, outbox, state store, trick presentation
    hud-layout.md            responsive policy and HUD regions
    render-scene.md          frame scheduling, quality tiers, draw calls
    cards-camera.md          card meshes, faces, hand, camera
    platform.md              storage, audio, multi-touch
  testing/
    testing.md               boundaries, running tests, CI, the sandbox, budgets, baselines
    sandbox-framework.md     how the sandbox and browser suites are built
  operations/
    deployment.md            worker (wrangler) and frontend (Vercel), health checks, rollbacks
    configuration.md         every env var and secret in one table
    database.md              db/migrations, scripts/db-migrate.mjs, how to add a migration
    dependency-updates.md    Dependabot and the auto-merge workflow
  accounts/
    accounts.md              auth, progress, achievements, profiles
    social.md                friends, presence, invites, inbox
    tournaments.md           tournaments, match tickets, attested results
```

File and directory names are kebab-case, like the rest of the repo. A new page goes into the
group of the layer that implements it; a page that fits no group is a sign it should be a section
of an existing page.

## Sources of truth per page

Check each page against these before you write or review it.

| Page | Read |
| --- | --- |
| `getting-started.md` | `package.json` scripts, `wrangler.jsonc` (`dev.port`), `src/app/sandbox/animations/` |
| `architecture.md` | `tsconfig.json` and `tsconfig.worker.json` (`@/*`, `@shared/*`, what the worker compiles), `eslint.config.mjs` (`max-lines` per area), `party/worker.ts`, `src/infrastructure/*/*-container.ts` |
| `game-rules/rules.md` | `shared/domain/expansions/`, `shared/domain/value-objects/ruleset-config.ts` (`IRulesetConfig`, `DEFAULT_RULESET_CONFIG`), the in-app text in `src/presentation/components/TutorialModal.tsx` and `room-browser/LearnToPlaySection.tsx` |
| `server/protocol.md` | `shared/domain/events/protocol.ts`, `client-commands.ts`, `command-decoders.ts`, `party/protocol/`, `party/config/` |
| `server/room.md` | `party/room/`, `party/config/room-timing.config.ts`, `party/test-support/room-harness.ts` |
| `client/*` | `src/presentation/hooks/connection/`, `src/presentation/config/`, `src/presentation/components/three/` |
| `testing/*` | `vitest.config.ts`, `playwright.config.ts`, `e2e/`, `.github/workflows/ci.yml`, `.github/workflows/e2e.yml` |
| `operations/*` | `wrangler.jsonc`, `vercel.json`, `scripts/db-migrate.mjs`, `db/migrations/`, env reads in code |
| `accounts/*` | `shared/domain/account/`, `social/`, `tournament/`, `src/app/api/`, `src/infrastructure/` |
| `SECURITY.md` | `src/app/privacy/`, `party/protocol/`, `src/infrastructure/auth/` |

## Moving a page

1. `git mv` the file so history follows it.
2. `git grep -n '<old file name>'` over the whole repo. Code comments, `scripts/`, other docs,
   skills and `docs/README.md` all link to pages, some with `#anchors`. Fix every hit.
3. Keep heading text stable; anchors are derived from it.
4. One PR moves pages and changes nothing else in them, so review can diff by rename.

## Page shape

```
# Title (what the area is, not "Overview")

One paragraph: what this covers and when to read it. Link the neighbouring pages.

## How it works        layers or flow, as a code-block tree or a table of module -> path
## Contracts           invariants other code relies on
## Adding things       one bullet per kind of change: the files to touch, in order
## Tests               which suites own which contract (see the test-audit skill)
```

`docs/server/protocol.md` and `docs/client/hud-layout.md` are the models to follow.
