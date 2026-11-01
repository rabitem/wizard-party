# Server room

How a game room lives: which hosts run it, what it waits for, how it keeps moving when people do
not, and how it is tested. Read this before you touch `party/`, the leave, resume and rematch use
cases or the pause model. The wire contract (versions, seats, commands, close codes, rate limits)
is in [protocol.md](protocol.md); the client side is in
[../client/connection.md](../client/connection.md).

## One room core, three hosts

```
party/room/game-room.ts   GameRoom: the room, independent of any runtime
  ├─ room-state.ts         RoomState: the game and all bookkeeping (one object, never copied)
  ├─ command-pipeline.ts   CommandPipeline: decode -> budget -> answer or apply once
  ├─ room-messaging.ts     RoomMessaging: every send, through the commit gate
  ├─ room-clockwork.ts     RoomClockwork: what happens next (bot turns, alarm, debounce)
  ├─ room-deadlines.ts     roomDeadlines(game): durable deadlines derived from the state
  ├─ room-scheduler.ts     RoomScheduler: named single-flight in-memory timers
  └─ ports.ts              RoomConnection, RoomStorage, RoomHost, RoomTimers

hosts:
  party/worker.ts                              Cloudflare Worker + Durable Object (class Main)
  src/infrastructure/sandbox/loopback-*.ts     the browser sandbox (LoopbackRoomHost)
  party/test-support/room-harness.ts           vitest fake timers (RoomHarness)
```

`GameRoom` depends only on its ports. A connection is `{ id, send, close? }`, storage is `get` and
`put` plus the one durable alarm (`setAlarm`, `deleteAlarm`), and timers are `setTimeout` and
`clearTimeout`, looked up on every call, so the sandbox's virtual clock and vitest's fake timers
drive the room. Handlers reach the room through `ServerContext` (`party/utils/types.ts`) and the
`Party.*` aliases in `party/runtime.ts`; no game code imports a hosting runtime.

The sandbox runs the same `GameRoom`. `LoopbackRoomHost` turns loopback sockets into connections
and keeps storage and the alarm in memory; network shaping stays in the loopback. The sandbox
deals its own table and hands it over with `GameRoom.adoptGame`. The host vouches for its one
local seat through the `attestSeat` option (the way a tournament ticket vouches for a member), so
the ids the client stored never matter. Every room entry point runs under the seeded random, so a
replay deals and decides identically. `GameRoom` also exposes `setBotPacing`, `playBotTurnNow`,
`resync` and `dispose` for such drivers.

## The worker

`party/worker.ts` is the production host. It exports a Durable Object class `Main` (built on the
`partyserver` package's `Server`), bound as `Main` in `wrangler.jsonc` as a SQLite-backed class
(`migrations`). There is one object per room id; `this.name` is the room id. The worker's `fetch`
answers three things:

| Request | Answer |
| --- | --- |
| `/health` | JSON `{ status, service, platform }` |
| `/party/<room>` | Rewritten to `/parties/main/<room>` and routed like the next row |
| `/parties/main/<room>` | WebSocket upgrade or HTTP `GET`, routed to that room's object by the `partyserver` request router |

Anything else is a 404. `npm run dev:party` runs `wrangler dev` on the port in `wrangler.jsonc`
(`dev.port`); `npm run check:worker` is `wrangler deploy --dry-run`.

The object forwards each platform callback to `GameRoom`:

| Callback | Goes to |
| --- | --- |
| `onStart` | builds `GameRoom` over `ctx.storage`, then `GameRoom.onStart` (restore, recover, re-arm) and resumes the tournament result outbox |
| `onConnect` | `GameRoom.onConnect`, with client facts from `extractClientInfo(request)` (`party/telemetry/client-info.ts`) |
| `onMessage` | `GameRoom.onMessage` for text frames. A binary frame goes to `GameRoom.onInvalidFrame` and the socket closes with code 1003 |
| `onClose` | `GameRoom.onClose` with the close code, reason and `wasClean` |
| `onRequest` | `GameRoom.onRequest`: room info and seat attestation (see [protocol.md](protocol.md#identity-seats-and-session-tokens)), `OPTIONS` for CORS, other methods get 405 |
| `onAlarm` | `AlarmMultiplexer.dispatch` |

Configuration the worker reads is declared in the `Env` interface of `party/worker.ts`: the
`TELEMETRY_INGEST_URL` and `TOURNAMENT_RESULT_URL` vars and the `TELEMETRY_INGEST_SECRET` and
`TOURNAMENT_SECRET` secrets (`wrangler.jsonc` sets the two vars and names the secrets in comments;
`.dev.vars.example` is the local template), plus the `CF_VERSION_METADATA` binding whose id labels
telemetry. Without the telemetry URL or secret the worker records nothing (`NOOP_TELEMETRY`);
without `TOURNAMENT_SECRET` it refuses every tournament ticket.

### One alarm, four channels

A Durable Object has one alarm. `AlarmMultiplexer` (`party/utils/alarm-multiplexer.ts`) lets
independent subsystems own a named deadline and arms the platform alarm for the earliest:

| Channel | Owner | When it fires |
| --- | --- | --- |
| `game` | `GameRoom.onAlarm` | the earliest of `roomDeadlines(game)` |
| `telemetry` | `DurableObjectOutbox.flush` | a batch of telemetry facts is due for delivery |
| `tournament` | `GameRoom.onTournamentAlarm` | a match room's start countdown, no-show deadline or round advance |
| `tournament-results` | `MatchResultOutbox.flush` | a match result or progress report is due for delivery |

Deadlines live in memory; each subsystem re-arms its channel in `onStart`, which also runs before
`onAlarm` when an alarm wakes an evicted object. Channels are isolated: a handler that throws is
logged and its channel runs again after `ALARM_HANDLER_RETRY_MS`, and later channels still run.

### Storage

| Key or prefix | Owner | Holds |
| --- | --- | --- |
| `gameState` (`PERSISTED_STATE_KEY`, `party/utils/types.ts`) | `party/utils/state.ts` | the room: game, seats, tokens, settings, state version, processed commands |
| `tournamentMatch` (`TOURNAMENT_MATCH_STORAGE_KEY`) | `TournamentMatchController` | a match room's lock (`party/tournament/match-room.constants.ts`) |
| `telemetry:*` (`OUTBOX_KEYS`, `party/telemetry/durable-object-outbox.ts`) | `DurableObjectOutbox` | undelivered telemetry facts and the delivery cursor |
| `tournament:results:*`, `tournament:progress:*` (`MATCH_RESULT_OUTBOX`) | `MatchResultOutbox` | undelivered match results and progress pings |

The format of `gameState` is in [protocol.md](protocol.md#persistence).

## Transactions and settling

Every entry point (a frame, a disconnect timer, a bot turn, the alarm) runs as one transaction of
the `CommitGate` (`party/protocol/commit-gate.ts`). Handlers change the game, request a save and
queue messages; on commit the state is written before any message goes out (see
[protocol.md](protocol.md#ordering-and-state-versions)). Handlers never schedule anything. At the
end of every outermost transaction the gate calls `RoomClockwork.settle()`, which derives from the
state the transaction left:

- **The next bot turn.** One named task (`bot-turn`). When the table changed (the state version
  moved) and a bot is to act, the task is (re)armed a full `ROOM_TIMING.BOT_ACTION_DELAY_MS` later.
  When a trick just completed, that delay counts from when the tables have landed and collected it
  (`getTrickPresentationMs`, `shared/domain/constants/trick-presentation-timing.ts`), so no bot leads
  the next trick or answers a special card while the last one is still on screen. When nothing changed, a pending task stands (an emote does not push a bot back). When no bot is to
  act (a human's turn, a paused table, another phase) it is cancelled. Two chains cannot exist.
- **The durable alarm.** Armed for the earliest of `roomDeadlines(game)`
  (`party/room/room-deadlines.ts`):

  | Deadline | From the state | When it is due |
  | --- | --- | --- |
  | grace | `graceStates` (lobby) | the seat is freed, host re-applied |
  | pause | `pauseState.pausedAt + timeoutDuration` | a bot takes the seat, the next disconnected human is waited for |
  | turnTimer | `turnTimerState.expiresAt` | `TURN_TIMER_EXPIRED`, heckling opens |
  | turnTimeout | `expiresAt + TURN_TIMEOUT_POLICY.autoActAfterMs` (human timed player, mode `auto-act`) | the room makes the legal default move |
  | roundAdvance | `roundEndedAt` + `ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS`, or `getTrickPresentationMs` (one card per seat) + `HOSTLESS_ROUND_END_ADVANCE_MS` when no connected human hosts | the next round is dealt |

  While paused only the pause deadline exists. When the alarm fires, every kind is handled only if
  its own deadline has passed, so an early or stale alarm does nothing. A handler that throws, or
  leaves its deadline where it was, is retried after `FAILED_DEADLINE_RETRY_MS`
  (`party/room/room-clockwork.ts`) instead of re-firing the alarm in a loop.

Tournament match rooms pass `advanceRounds: false` to the deadline policy (`GameRoom.deadlinePolicy`)
and advance rounds through their own controller; see [Tournament match mode](#tournament-match-mode).

Because every deadline is derived from persisted state, a restart re-arms all of them in `onStart`.
No socket survives a restart, so `onStart` also recovers the restored game
(`RoomClockwork.recoverRestoredGame`). A running game pauses for its humans. A casual lobby puts
its humans in lobby grace, so one who never returns is freed by the grace alarm instead of keeping
the table from starting. Match rooms keep their own rule: members restored without a connection
are no-shows at the start.

## Bots never stall a table

`processBotTurn` (`party/bot/bot-turn.ts`) decides, applies and publishes one turn and returns
`acted | idle | failed`; it never schedules. The use case already replaces a failing or illegal
brain decision with a deterministic legal fallback. When applying fails before the game moved,
the fallback is tried once. A turn that could not be made at all is `failed`: the clockwork
retries it after `BOT_RETRY_BASE_MS`, doubling up to `BOT_RETRY_MAX_MS`. Bot difficulties are
parsed by the `Player` constructor (`parseBotDifficulty`), so no client value can break a brain.

## Pause is not a phase

`Game.pause()` sets `pauseState` (who, since when, for how long, `previousPhase` = the phase it is
in) and keeps the phase. While paused:

- every move (`selectTrump`, `placeBid`, `playCard`, `resolveEffect`, `startNextRound`) throws
  `GamePausedError`;
- `getLegalPlays` is empty, nobody is timed and no bot acts;
- `resume()` clears the pause, restarts the current decision's timer and, in `ROUND_END`, the
  round-end wait.

`GamePhase.PAUSED` is the wire value for protocol-1 connections and the value a room saved by an
earlier release may hold; `Game.fromJSON` restores such a room into its real phase. See
[protocol.md](protocol.md#protocol-versions).

On the client, `toOrthogonalPause` normalises snapshots on arrival, `isGamePaused` drives the
overlay and `getDisplayPhase` the phase sounds (all in `shared/domain/value-objects/game-pause.ts`),
so a disconnect elsewhere freezes the table under the overlay instead of unmounting hands, the
open trick and its collection.

## Leaving, dropping, coming back

| What happened | Lobby | Running game (DEALING..ROUND_END) | GAME_END |
| --- | --- | --- | --- |
| `LEAVE_GAME` | seat removed, credentials forgotten | a bot takes the seat at once (`Game.replaceWithBot`); the player keeps the token that takes it back | marked disconnected |
| socket closed, not back within `DISCONNECT_DEBOUNCE_MS` | grace period (`RECONNECT_WINDOW_MS`) | pause for them, or queued behind the current pause | marked disconnected |
| back with their token | grace restored | seat reclaimed (also from its bot), pause resumed | reconnected |
| pause or grace ran out | seat freed | a bot takes the seat, next disconnected human is waited for | - |

Every way a pause ends (the awaited player returns or runs out of time) goes on to wait for the
next disconnected human before the table resumes. A seat a bot holds has no
connection to lose: a late close of one of its sockets changes nothing.

The windows are in `party/config/room-timing.config.ts`:

- `DISCONNECT_DEBOUNCE_MS` is `SERVER_DISCONNECT_DEBOUNCE_MS`
  (`shared/domain/constants/reconnect-timing.ts`): the client's first reconnect attempt plus a slow
  handshake, so a network blip resolves through `JOIN_GAME` before anyone sees a pause. The client's
  first retry is `RECONNECT_TIMING.CLIENT_FIRST_RETRY_MS` from the same file
  (`BASE_DELAY_MS` in `src/presentation/config/connection.config.ts`).
- `RECONNECT_WINDOW_MS` is `DEFAULT_GRACE_DURATION_MS`: how long a dropped player pauses a running
  game, or keeps a lobby seat, before losing it.

A second socket for a seat that joins while the first is open takes the seat over and the first
closes with `SUPERSEDED` (see [protocol.md](protocol.md#answers-and-errors)). `JOIN_GAME` repeated
within a short window by the same browser moves the seat to the new connection without running
the join use case again (`JOIN_DEDUP_WINDOW_MS` in `party/handlers/join-handlers.ts`).

## Host invariant

`Game.ensureHost()`: the host is a connected human whenever one is seated; otherwise a human who
may come back; otherwise the seat as it is (an all-bot table needs no host because the room
advances rounds itself). It runs after every change of who is connected or who is a bot: join,
leave, drop, pause timeout, grace expiry and rematch. Each change broadcasts `HOST_CHANGED`. The
lobby keeps its grace semantics: a host in lobby grace gets the seat back if they return in time.

## Turn timers and round ends

Timers come from the room's rules (`ITurnRules`). When one runs out the table may heckle
(`TURN_TIMER_EXPIRED`, timeout sounds). With `TURN_TIMEOUT_POLICY.mode = 'auto-act'` the room then
makes the move `TurnTimeoutUseCase` picks (most-held suit, lowest allowed bid, first legal card,
first acceptable effect answer), applied exactly like the player's own. `ROUND_END` advances after
`ROUND_END_AUTO_ADVANCE_MS` (`roundEndedAt` is persisted; a pause restarts the wait); the host may
advance earlier with `NEXT_ROUND`. All timings live in `party/config/room-timing.config.ts`.

## Rematch

`REQUEST_REMATCH` is handled by `RequestRematchUseCase`, which checks only that the game is over
and the sender is the host. `Game.createRematch()` builds the next game at the table: same id,
host, adapters, rules (expansions included), lobby bans and seats, bots with their level. Scores
and history start over. A human who is not connected is put in lobby grace, so the grace alarm
frees the seat if they do not come back and the lobby is never blocked. `GameRoom` swaps the game
in `RoomState` through `ctx.setGame`, which is why collaborators read `state.game` and never keep
a copy.

## Tournament match mode

A room whose id is a tournament room code (`isTournamentRoomCode`) runs the same pipeline with a
`TournamentMatchController` (`party/tournament/`). The match design, ticket and result formats
are in [../accounts/tournaments.md](../accounts/tournaments.md#game-worker-match-mode); this
page covers where it plugs into the room:

- **Joins.** `JOIN_GAME` in a match room, or with a `tournamentTicket`, is verified
  asynchronously. The socket's later frames are held, up to
  `TOURNAMENT_ROOM_LIMITS.MAX_HELD_MESSAGES_PER_JOIN`, and handled in order afterwards. The first
  valid ticket locks the room to its match, persisted under `tournamentMatch`.
- **Locked commands.** Settings, rules, bots, kicks, host transfer, manual start and rematch are
  refused with `TOURNAMENT_MATCH_LOCKED` after decoding and before anything is applied
  (`party/tournament/match-command-gate.ts`).
- **Clock.** The controller arms its own alarm channel (`tournament`) for the start countdown, the
  no-show deadline and the round advance (`party/tournament/match-schedule.ts`).
  `GameRoom.onTournamentAlarm` runs it as a commit-gate transaction. Round-advance and retry
  timings are `TOURNAMENT_ROOM_TIMING` in `party/tournament/match-room.constants.ts`; the start
  countdown and no-show grace are `TOURNAMENT_TIMING` in `shared/domain/tournament/`.
- **Lock follows the game.** `RoomMessaging.broadcastPersonalizedState` calls
  `TournamentMatchController.sync` before every snapshot, and each snapshot carries
  `tournamentMatch` beside `state`. `sync` also enqueues progress pings and the attested result in
  the durable outbox.
- **Room info.** `GET` on a match room answers the usual room info with `isAvailable: false`, and
  the match caption as its only tournament detail (`TournamentMatchController.roomInfo`).

## Adding things

- **A deadline.** Derive it from persisted state in `roomDeadlines`, handle it in
  `RoomClockwork.processDueDeadlines` (checking its own due time) and test it on the harness.
- **A reason for the room to act on its own.** Make it a deadline or a settled task, never a
  `setTimeout` in a handler.
- **A timing.** Put it in `party/config/room-timing.config.ts` and take it by name in the code
  and the tests.
- **A host.** Implement the ports in `party/room/ports.ts` and forward connect, message, close
  and alarm to `GameRoom`, as `party/worker.ts` does.
- **An alarm subsystem.** Add a channel to `ALARM_CHANNELS` and the `onAlarm` handler map in
  `party/worker.ts`, and re-arm it in `onStart`.
- **A command, event or persisted field.** Follow [protocol.md](protocol.md#adding-things) and the
  `.claude/skills/protocol-change` skill.

## Tests

Server behaviour is tested at level 3 of the boundaries in
`.claude/skills/test-audit/references/boundaries.md`: the real `GameRoom` on
`party/test-support/room-harness.ts`, with vitest fake timers. Client and server together are
level 4, and the CI realtime smoke test covers the deployed worker shape.

| Support file | Gives a suite |
| --- | --- |
| `party/test-support/room-harness.ts` | `RoomHarness`: a seeded `GameRoom` with in-memory storage and connections. `advance(ms)` runs the in-memory timers and fires the durable alarm and the tournament alarm whenever one comes due, as the worker would. `restart()` evicts the room and starts a new one on the same storage |
| `party/test-support/table-driver.ts` | Lobbies of humans, a started game, the simplest legal move of whoever the game waits for, and `expectRoomInvariants` (a connected human hosts, hands stay hidden, snapshot versions never go backwards) |
| `party/test-support/match-driver.ts` | A tournament match room: ticketed joins, the controller's alarm, members who bid low and play their first legal card |
| `party/test-support/room-doubles.ts`, `memory-outbox-storage.ts`, `recording-telemetry.ts` | Test connections, memory storage and alarm, and recording doubles for telemetry |

The level 3 suites in `party/room/` and `party/tournament/`:

- `game-room.test.ts`: pause beside the phase, blips below the debounce, resume, stale alarms,
  bot takeover, host transfer, bot cadence after a pause (one chain), bot failure retry,
  turn-timeout auto move, round-end advance, rematch with grace, and the invariants checked after
  every step of a game with drops, leaves and returns.
- `reconnect.test.ts`: joining again from a new socket, deliberate leave (and taking the seat back
  from its bot), a pause that waits for several dropped players in turn, restart and reclaim by
  token, a restarted lobby in grace, lobby grace alarms.
- `lobby.test.ts`, `round-flow.test.ts`, `social.test.ts`: join refusals, host-only commands,
  kicks and room rules; the event order of a trick, the Bomb, Juggler passes, hidden bids and the
  game's end; chat, emotes, their budget and the timeout soundboard.
- `protocol.test.ts`, `protocol-sessions.test.ts`, `recovery.test.ts`: the wire contract; see
  [protocol.md](protocol.md#tests).
- `telemetry-activity.test.ts`, `telemetry-connections.test.ts`: the facts the room records.
- `party/tournament/tournament-match-room.test.ts` and `tournament-match-lifecycle.test.ts`: match
  mode on `match-driver.ts`. `tournament-match-services.test.ts` covers the worker's ticket
  verifier and result transport.
- `party/utils/state.test.ts`: persisted rooms restore correctly.

Domain and use-case tests sit beside their sources: `game-aggregate.test.ts`, `game-pause.test.ts`,
and the `leave-game`, `resume-game`, `turn-timeout` and `request-rematch` use case tests.

Level 4 (`test/integration/`, see `test/integration/README.md`) plays several production game
clients against the same room on a shaped network, including reconnects, stalls, restarts and
superseded sockets. `src/infrastructure/sandbox/loopback-game-server.test.ts` checks that the
sandbox host runs the production join, supersede and pause. `scripts/realtime-smoke.mjs` plays a
game against `wrangler dev` in CI.
