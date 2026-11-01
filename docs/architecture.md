# Architecture

How the code is layered, where each layer lives, which files wire the layers together and how one
player command travels through them. Read this before you add a module and are unsure where it
goes. The room is described in [server/room.md](server/room.md), the wire contract in
[server/protocol.md](server/protocol.md), the client connection in
[client/connection.md](client/connection.md) and the rules in
[game-rules/engine.md](game-rules/engine.md).

## How it works

Two deployables share one body of TypeScript. The web app (Next.js, deployed to Vercel) serves the
pages and the HTTP API. The game worker (Cloudflare Workers, `wrangler.jsonc`) hosts one Durable
Object per room. The browser talks to the worker over a WebSocket; the Next.js routes talk to
Postgres, Redis and, for a few reads, to the worker over HTTP.

```
src/                      the web app
  app/                    pages and API routes (App Router)
  presentation/           components, hooks, providers, state, config, types, utils
  infrastructure/         adapters for ports: Postgres, Redis, email, auth, telemetry, sandbox
  lib/                    storage, sounds, client telemetry, game traces
  config/                 deployment.config.ts: site URL, REALTIME_HOST, operator details
shared/                   code that runs in the browser, in Next.js and in the worker
  domain/                 entities, value objects, services, events and commands, errors,
                          expansions/ (card rules), bot-ai/, ports/ (IRandom, IClock)
  application/            use-cases/<area>/, ports/, projections/, use-case-registry.ts
  telemetry/ tournament/  wire schemas, signatures and ticket helpers
  realtime/               realtime host names and room URLs
party/                    the game worker (named after partyserver and partysocket)
  worker.ts               Durable Object class, alarms, HTTP entry point
  runtime.ts              the room ports under the names the handlers use (Connection, Room)
  room/                   GameRoom and its parts, independent of any runtime
  handlers/ protocol/     command handlers; rate limits, commit gate, idempotency
  tournament/ telemetry/  match rooms and result reports; fact recording and the outbox
  bot/ session/ utils/    bot turns; seat session tokens; state persistence, parsing, alarms
  config/ test-support/   limits and timings; the room harness and drivers
db/migrations/            SQL, applied by scripts/db-migrate.mjs
test/integration/         level-4 suites; e2e/ holds the Playwright suites
```

### Layers

```
presentation  src/presentation, src/app, src/lib
      |  depends on
application   shared/application                (use cases, ports, projections)
      |  depends on
domain        shared/domain                      (entities, rules, events)
```

`src/infrastructure/` and `party/` are outer rings. They implement application ports and call use
cases; nothing in `shared/` imports them.

| Layer | May import | Must not import |
| --- | --- | --- |
| `shared/domain/` | Itself | Any package, `shared/application`, `src/`, `party/` |
| `shared/application/` | Domain, `shared/telemetry/`, `shared/tournament/` | `src/`, `party/` |
| `party/` | `shared/`, its own folders | `src/`; only `party/test-support/` reaches `src/infrastructure/sandbox/seeded-random.ts` |
| `src/infrastructure/` | `shared/`; the sandbox adapters also host `party/room/` | `src/presentation`, except the types and helpers the sandbox adapters and `public-profile-cache.ts` take from it |
| `src/presentation/`, `src/app/` | `shared/`, `src/lib/`, `src/config/` | `src/infrastructure/` adapters and containers, except from server code in `src/app/`, the sandbox page (`src/app/sandbox/animations/sandbox-app.tsx`) and the types of `src/infrastructure/auth/auth-capabilities.ts` |

Lint does not enforce the table (`eslint.config.mjs` has no import-boundary rule), so a reviewer
checks it. These checks catch most violations:

```bash
git grep -nE "from '(@/|.*src/)" -- shared
git grep -nE "from '@shared" -- party shared
```

Both print nothing.

### Two compile targets

`tsconfig.json` type-checks the web app and everything else except `party/worker.ts`, with the DOM
lib and the aliases `@/*` (`src/*`) and `@shared/*` (`shared/*`). `tsconfig.worker.json` type-checks
`party/worker.ts` and the files it imports with the ES2022 lib and `@cloudflare/workers-types`: no
DOM and no path aliases. `npm run typecheck` runs both; `npm run check:worker` runs
`wrangler deploy --dry-run` to prove the bundle builds.

Consequences for code reachable from the worker, which is all of `party/` and the parts of
`shared/` it imports:

- Imports are relative (`../../shared/domain`), never `@shared/...` or `@/...`.
- No `window`, `document`, `localStorage` or other browser globals.
- Only `party/worker.ts` imports `partyserver`. Handlers and the room use the `Connection`, `Room`
  and `RoomStorage` ports (`party/runtime.ts`, `party/room/ports.ts`).

### Ports and adapters

The domain owns two ports: `IRandom` and `IClock` (`shared/domain/ports/`). The sandbox implements
them with `src/infrastructure/sandbox/seeded-random.ts` and `virtual-clock.ts`. The application
layer owns the ports for stores, mail, counters and verifiers (`shared/application/ports/`).
Adapters live in `src/infrastructure/<area>/`, for example `ResendEmailSender` and `LogEmailSender`
for `IEmailSender`, `PostgresTelemetryStore` for `ITelemetryEventStore` and `RedisUsageCounter`
for `IUsageCounter`.

The room has its own ports in `party/room/ports.ts` (`RoomConnection`, `RoomStorage`, `RoomHost`,
`RoomTimers`). Three hosts implement them: the worker, the sandbox's `LoopbackRoomHost` and the
test `RoomHarness`. [server/room.md](server/room.md) describes them.

### Composition roots

Each root is the one place that picks concrete classes.

| Root | File | Wires |
| --- | --- | --- |
| Game worker | `party/worker.ts` | `Main` (the Durable Object) builds a `GameRoom` with Durable Object storage, the alarm multiplexer (`party/utils/alarm-multiplexer.ts`), the telemetry recorder and outbox, and the tournament match services |
| Use cases | `shared/application/use-case-registry.ts` | `createUseCaseRegistry()` builds every game use case; `GameRoom` wraps it with `instrumentUseCases` (`party/telemetry/`), which hands the events each use case returns to telemetry (not `botTurn` or `turnTimeout`) |
| Accounts | `src/infrastructure/account/account-container.ts` | `getAccountServices()`: profile, progress, game history, public profiles, sounds, leaderboards |
| Social | `src/infrastructure/social/social-container.ts` | `getSocialServices()`: friends, presence, invites, inbox |
| Tournaments | `src/infrastructure/tournament/tournament-container.ts` | `getTournamentServices()`: tournaments, tickets, match results |
| Game client | `src/presentation/hooks/connection/game-client.ts` | `createGameClient`: the session, the state store, the trick presentation and the table feeds |
| Browser adapters | `src/presentation/hooks/useGameConnection.ts` | Builds the browser's seat tokens, telemetry and socket factory (`createPartyGameSocket`, a `PartySocket`), then calls `createGameClient` |
| Sandbox | `src/infrastructure/sandbox/loopback-game-server.ts` | The real `GameRoom` on a loopback transport |

The three containers are `server-only`. Route handlers and server components under `src/app/` call
them; each caches its services for the process.

## A command from click to screen

```
browser   component -> useGame() / GameCommands (game-commands.ts)
            -> GameSession.send (game-session.ts) -> CommandOutbox (requestId) -> socket
worker    Main.onMessage (party/worker.ts) -> GameRoom.onMessage -> CommandPipeline.onMessage
            -> CommitGate.run: one transaction per frame
            -> receive: parseClientCommand
            -> dispatch: admit (rate budget) -> applyOnce (skip a requestId already applied)
            -> routeCommand (party/handlers/command-routes.ts) -> handler (party/handlers/)
use case  ctx.useCases.<name>.execute({ game, playerId, ... }) (shared/application/use-cases/)
domain    Game aggregate (shared/domain/entities/game.ts) enforces legality, throws GameError
events    handler: ctx.broadcast(event), ctx.broadcastPersonalizedState(), ctx.saveState()
          CommandPipeline.acknowledge: COMMAND_ACK with the state version (protocol 2 clients)
commit    CommitGate when the outermost transaction ends:
            RoomClockwork.settle (next bot turn, durable alarm), then the storage write,
            then the queued messages go out
browser   GameSession.handleMessage -> session-listener -> routeGameEvent (game-event-router.ts)
            -> ExternalStore / TrickPresentation / TableFeeds -> hooks -> components
```

Steps worth knowing:

- **Decode at the boundary.** `parseClientCommand` (`party/utils/client-command-parser.ts`) turns a
  frame into a typed `ClientCommand` with the decoders in
  `shared/domain/events/command-decoders.ts`.
  Anything that does not decode is refused and recorded; the handlers see typed commands only.
- **Routes are exhaustive.** `COMMAND_ROUTES` has an entry for every `ClientCommandType` the room
  applies. `JOIN_GAME`, `REQUEST_STATE` and `PING` are answered in `CommandPipeline.dispatch`.
- **Handlers are thin.** A handler resolves the seat, calls one use case and announces the result.
  Rules live in the domain; use cases orchestrate; neither schedules timers.
- **Hidden information.** Each connection receives its own projection from
  `createPersonalizedState` (`shared/application/projections/personalized-state.ts`), built into a
  `GAME_STATE` message by `gameStateMessage` (`party/protocol/state-messages.ts`).
  `ctx.broadcast` accepts only `BroadcastEvent` types, which carry no private data.
- **Persist before announce.** The gate writes the room to Durable Object storage before any
  message of the transaction reaches a socket, so no client sees a move a crash could lose.
- **Once per requestId.** The outbox resends commands after a reconnect with the same `requestId`;
  the room applies each `(seat, requestId)` once and answers a duplicate with the current state.
- **Time is an input.** Bot turns, pause, turn timers and the grace periods are derived from the
  state by `RoomClockwork` and `roomDeadlines`; the room never sleeps inside a handler.

Things that do not travel the WebSocket:

- Telemetry. The worker records facts and posts signed batches to `/api/telemetry/ingest`
  (`party/telemetry/`). Global stats are built from that stream only.
- Tournament results. A match room posts its signed result to the URL in `TOURNAMENT_RESULT_URL`
  ([accounts/tournaments.md](accounts/tournaments.md)).
- Seat checks. Social routes ask the worker's `onRequest` which seat a proof holds
  (`src/infrastructure/social/party-room-membership-verifier.ts`).
- Accounts, social features and tournaments are HTTP routes under `src/app/api/`
  ([accounts/accounts.md](accounts/accounts.md), [accounts/social.md](accounts/social.md)).

## Contracts

- **Dependencies point inward.** The table above is the rule. A module that needs something from an
  outer ring declares a port in `shared/application/ports/` and receives an adapter.
- **One owner per rule.** Game rules live in `shared/domain/expansions/`; the server, the client
  projections, the bots and the tests all call them.
- **The server decides.** The client shows state and sends intent; it never derives legality.
- **Wire changes work across releases.** The worker and the web app deploy separately and old tabs
  keep running; see [server/protocol.md](server/protocol.md).
- **`shared/` stays isomorphic.** Nothing in it assumes a browser, Node or Workers runtime.
- **Containers stay server-side.** `server-only` makes the build fail when client code imports one.

## Adding things

- **A use case.** `shared/application/use-cases/<area>/<name>.use-case.ts` with a test beside it,
  an export from the area's `index.ts`, and a field in `IUseCaseRegistry` and
  `createUseCaseRegistry()` if the room calls it. Its handler goes in `party/handlers/`.
- **A port and its adapter.** The interface in `shared/application/ports/`, exported from its
  `index.ts`; the adapter in `src/infrastructure/<area>/`; the container of the area
  (`*-container.ts`) constructs it, or the route that uses it where the area has no container.
- **A client command or server event.** Use the `protocol-change` skill; it lists the exhaustive
  tables in order.
- **A rule.** Use the `rules-change` skill.
- **An API route.** `src/app/api/<area>/route.ts` calls the container's services; shape and
  validation stay in the route, behaviour in a use case. Response types go in `src/app/api/types/`.
- **A feature in the UI.** `src/presentation/components/<feature>/` with an `index.ts`; a hook or
  state object under `src/presentation/hooks/` when several features use it.
- **A migration.** The next number in `db/migrations/`, plain SQL; `scripts/db-migrate.mjs` applies
  files in lexical order.

## Tests

The boundary for each contract is in
[.claude/skills/test-audit/references/boundaries.md](../.claude/skills/test-audit/references/boundaries.md)
and [testing/testing.md](testing/testing.md). In short: rules at the domain, one command at a use
case, the whole server at the room harness (`party/test-support/room-harness.ts`), client and server
together at `test/integration/` and pixels in the sandbox and `e2e/`.
