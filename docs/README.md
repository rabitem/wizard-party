# Documentation

One page per area a contributor is about to change. Start with
[getting-started.md](getting-started.md) to run the game, then read the page for the layer you
are touching. The repository root holds [README.md](../README.md),
[CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md) and
[AGENTS.md](../AGENTS.md) (code conventions). The `writing-docs` skill
(`.claude/skills/writing-docs/SKILL.md`) says where a new page goes and how it is written.

## Start here

| Page | What it covers |
| --- | --- |
| [getting-started.md](getting-started.md) | Prerequisites, install, local environment files, scripts, a first game, the sandbox, sounds |
| [architecture.md](architecture.md) | The layers and the dependency rule; `src/`, `shared/`, `party/` and `db/`; the composition roots |

## Game rules

| Page | What it covers |
| --- | --- |
| [game-rules/rules.md](game-rules/rules.md) | The game as players see it: deck, rounds, bids, scoring, rule variants, special cards |
| [game-rules/engine.md](game-rules/engine.md) | The rules policy, the `Game` aggregate, determinism, hidden information, the bots |

## Server

| Page | What it covers |
| --- | --- |
| [server/room.md](server/room.md) | `GameRoom` and its hosts, transactions, pause, timers, rematch |
| [server/protocol.md](server/protocol.md) | Protocol versions, seats and tokens, commands, events, rate limits, persistence |

## Client

| Page | What it covers |
| --- | --- |
| [client/connection.md](client/connection.md) | The game client: connection status, reconnecting, the command outbox, state and snapshot order, trick presentation, table feeds |
| [client/hud-layout.md](client/hud-layout.md) | The responsive policy and the HUD regions |
| [client/render-scene.md](client/render-scene.md) | Frame scheduling, quality tiers, the draw-call budget |
| [client/cards-camera.md](client/cards-camera.md) | Card meshes and faces, the hand, the camera |
| [client/platform.md](client/platform.md) | Web Storage, settings surfaces, custom sound audio, Web Audio, multi-touch drag |
| [client/characters.md](client/characters.md) | Character models: the asset build, loading, palettes and portraits |

## Testing

| Page | What it covers |
| --- | --- |
| [testing/testing.md](testing/testing.md) | The test levels, running tests, CI, the sandbox, budgets, visual baselines |
| [testing/sandbox-framework.md](testing/sandbox-framework.md) | How the animation sandbox and the browser suites are built |

## Operations

| Page | What it covers |
| --- | --- |
| [operations/deployment.md](operations/deployment.md) | Deploying the worker (Wrangler) and the frontend (Vercel), health checks |
| [operations/configuration.md](operations/configuration.md) | Every environment variable and secret |
| [operations/database.md](operations/database.md) | `db/migrations/`, `scripts/db-migrate.mjs`, adding a migration |
| [operations/dependency-updates.md](operations/dependency-updates.md) | Dependabot and the auto-merge workflow |

## Accounts and community

| Page | What it covers |
| --- | --- |
| [accounts/accounts.md](accounts/accounts.md) | Sign-in, progress, achievements, profiles |
| [accounts/social.md](accounts/social.md) | Friends, presence, invites, the inbox |
| [accounts/tournaments.md](accounts/tournaments.md) | Tournaments, match tickets, server-attested results |

## Skills

The skills under `.claude/skills/` hold the working rules for recurring changes:
`protocol-change`, `rules-change`, `ui-component`, `sandbox-scenario`, `test-audit`,
`pull-request`, `writing-docs` and `slop-audit`. Each holds the steps for one kind of change.
