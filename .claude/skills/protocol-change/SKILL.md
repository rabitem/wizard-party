---
name: protocol-change
description: "Use when changing the realtime protocol between the Wizard Party client and the game worker: adding or changing a client command (ClientCommandType, command decoder, command route, rate class) or a server event (GameEventType, BroadcastEvent, GAME_STATE fields), touching acks, retries, requestId idempotency, rate limits, close or error codes, PROTOCOL_VERSION or legacy protocol 1, what each player may see, or deciding whether the worker or Vercel deploys first."
---

# Protocol change

The client (`src/presentation/hooks/connection/`) and the worker (`party/`) share one wire
contract in `shared/domain/events/`. They deploy separately and old tabs keep running, so every
change must work against the other side's previous release. Read `docs/server/protocol.md`
(server guarantees) and `docs/client/connection.md` (session, outbox) once; this skill is
the checklist.

- Adding or changing a command: [command steps](#adding-a-command).
- Adding an event or a field on any message: [events and fields](#events-and-fields).
- Anything a second release could see differently: [compatibility.md](references/compatibility.md)
  before you write code. It decides field optionality, `PROTOCOL_VERSION` and the deploy order.

## Map

| Concern | Where |
| --- | --- |
| Types | `client-commands.ts` (`ClientCommandType`, `ClientCommand`), `game-events.ts` (`GameEventType`, `GameEvent`, `BroadcastEvent`) |
| Versions, close and error codes | `shared/domain/events/protocol.ts` |
| Decoding and frame limits | `command-decoders.ts` (`BODY_DECODERS`), `command-fields.ts` (`CommandFields`), `command-limits.ts` (`COMMAND_LIMITS`, `FRAME_LIMIT_BY_TYPE`) |
| Frame path | `party/utils/client-command-parser.ts`, then `party/room/command-pipeline.ts`: decode, budget, answer or apply once, ack |
| Budgets | `party/config/command-rate-limits.config.ts`, `party/protocol/command-rate-limiter.ts` |
| Idempotency, ordering | `party/protocol/processed-commands.ts`, `party/protocol/commit-gate.ts`, `party/config/protocol.config.ts` |
| Routing and handlers | `party/handlers/command-routes.ts` (`COMMAND_ROUTES`), `party/handlers/*-handlers.ts` |
| Per-player state | `shared/application/projections/personalized-state.ts`, `party/protocol/state-messages.ts` |
| Client | `game-commands.ts` (`GameCommands`), `command-outbox.ts`, `game-session.ts`, `game-event-router.ts` (`HANDLERS`) |

## Adding a command

Each exhaustive table below fails to compile until the command is in it. Do them in order.

1. **Type.** Add the enum member and interface in `client-commands.ts`, add it to `ClientCommand`
   and its segregated union, and export the type from both barrels (`shared/domain/events/index.ts`
   and `shared/domain/index.ts` list names one by one). Every field added to an existing command is
   optional (an old client must still decode).
2. **Decoder.** Add the body decoder to `BODY_DECODERS`. Bound every field with `CommandFields`
   (`string`, `integer`, `oneOf`, `record`, `parsed`, `hint` for animation-only data). New bounds
   go in `COMMAND_LIMITS`. The decoder keeps garbage out; product rules stay in the domain with a
   `GameError`. Large payloads get an entry in `FRAME_LIMIT_BY_TYPE`, otherwise 16 KiB applies.
3. **Budget.** Pick a class in `COMMAND_RATE_CLASS`. Anything broadcast to the table is `social`;
   last-write-wins settings need a budget a person cannot exhaust (see the `settings` comment).
   Add a class only for a cost profile none of the eight covers.
4. **Use case and handler.** Logic goes in a use case under `shared/application/use-cases/<area>/`,
   registered in `IUseCaseRegistry` (`shared/application/use-case-registry.ts`), which also makes
   telemetry record the events it returns. The handler in `party/handlers/` only resolves the
   seat, calls the use case, then `ctx.broadcast(...)`, `ctx.broadcastPersonalizedState()` and
   `ctx.saveState()`. A command that only broadcasts skips the save.
5. **Route.** Add it to `COMMAND_ROUTES`. A command that only reads (like `PING`) is instead
   added to `ServerCommandType` and answered in `CommandPipeline.dispatch`.
6. **Tournament rooms.** If a match fixes what the command changes, add it to `LOCKED_COMMANDS`
   in `party/tournament/match-command-gate.ts`.
7. **Client.** Add a method to `GameCommands` and `createGameCommands`; it reaches screens through
   `useGame()` (`GameContextValue` extends `GameCommands`). If its moment passes with the socket
   (a reaction, a nudge), add it to `EPHEMERAL_COMMANDS` in `command-outbox.ts`. For RTT
   telemetry, add a rule to `COMMAND_ACK_RULES` or the type to `UNTRACKED_COMMANDS` in
   `src/lib/client-telemetry/realtime-telemetry.ts`.
8. **Docs.** Update `docs/server/protocol.md` when a guarantee changes, not for every
   command.

## Refusals, acks and retries

The pipeline decides these; a handler only has to refuse correctly.

- Refuse by throwing a `GameError` subclass (`shared/domain/errors/`): the client gets
  `ERROR { message, code, requestId }`. Any other thrown error reaches the client as
  `Unknown error` without a code. `ctx.sendError` refuses without throwing.
- A handler that returns without refusing has applied the command: its requestId goes into the
  seat's `ProcessedCommandLog` and the connection gets `COMMAND_ACK { requestId, stateVersion }`
  after the messages the command caused. Never ignore a command silently; refuse it.
- A refused command is unmarked, so the client may resend the same requestId later.
- A resend of an applied requestId (five minutes, 200 per seat, persisted) is answered with the
  current `GAME_STATE` and acked again, never applied twice. This only works if the handler's
  effect is saved with `ctx.saveState()` in the same transaction.
- The client resends every unsettled command with its requestId after the next `JOIN_GAME`,
  until an ack, an `ERROR` with that requestId, or `COMMAND_OUTBOX.COMMAND_TTL_MS`
  (`src/presentation/config/connection.config.ts`).
- `JOIN_GAME`, `REQUEST_STATE` and `PING` are answered every time and never logged or acked.
- Unknown command types are dropped without an `ERROR` (telemetry only).

## What each player may see

- `ctx.broadcast` takes only `BroadcastEvent`. An event that carries anything for one player (a
  hand, a hidden bid, a token, a refusal, a targeted sound) goes in the `Exclude<>` of
  `BroadcastEvent` and is sent with `ctx.sendToConnection`, as `handlePlayTimeoutSound` does.
- A new private field on `IGameState` is filtered in `createPersonalizedState`. Every
  `GAME_STATE` is that projection for the receiving seat; never send `game.toJSON()` or a shared
  snapshot.
- Rule-dependent visibility is decided before broadcasting (`handlePlaceBid` checks
  `shouldShowBids` for the hidden-bids rule).
- Never send persistent ids, session tokens (only in `SESSION`) or account ids (tournament
  rooms). Public seat ids are not credentials.

## Events and fields

- New event: add it to `GameEventType` and `GameEvent` (and both barrels), decide broadcast or
  per connection (above),
  and add a handler to `HANDLERS` in `game-event-router.ts` if the client reacts. Old clients
  ignore types they do not know.
- New field on an event or on `IGameState`: optional in the type, and the client handles its
  absence (an old worker never sends it). Example: `stateVersion?` in `GameStateEvent`.
- Telemetry facts from the event: a mapper in `MAPPERS` (`party/telemetry/telemetry-mapper.ts`).
- New close code: `ConnectionCloseCode`, `ConnectionCloseReason`, and `isTerminalCloseCode` if
  the client must not reconnect by itself. New protocol error code: `ProtocolErrorCode`, and
  `REJECTION_CODE` in `client-command-parser.ts` when the decoder can produce it.

## Tests that own it

Gate every new test with the `test-audit` skill. Extend the owner; do not replay a contract at
another layer.

| Contract | Owner |
| --- | --- |
| Field bounds, unknown types, frame size, requestId envelope | `shared/domain/events/command-decoders.test.ts` |
| Rules behind the command | the use case's test next to it |
| Refusal codes, ack after snapshot, idempotent resend, rate limits, write-before-send, protocol dialects | `party/room/protocol.test.ts` on `RoomHarness` |
| Session tokens, seat attestation, projections | `party/room/protocol-sessions.test.ts` on `RoomHarness` |
| Rooms stored by older releases, idempotency over a restart | `party/room/recovery.test.ts` on `RoomHarness` |
| Timers, pause, reconnect, restart from storage, bots, room invariants | `party/room/game-room.test.ts` and `party/room/reconnect.test.ts` on `RoomHarness` (`party/test-support/room-harness.ts`; `join(..., { protocolVersion: null })` joins as a legacy client) |
| Bucket, gate and log mechanics | `party/protocol/protocol-primitives.test.ts` |
| Outbox, resend, settle, legacy uncorrelated `ERROR`, liveness | `src/presentation/hooks/connection/game-session.test.ts`, `game-session.outbox.test.ts` |
| Client reaction to an event | `game-event-router.test.ts` |
| Real room under latency, drops and superseded sockets | `src/infrastructure/sandbox/loopback-game-server.test.ts` |
| Worker shape: routing, upgrade, seats, tokens, retries against `wrangler dev` | `scripts/realtime-smoke.mjs` (CI step in `.github/workflows/ci.yml`) |
| Tournament lock | `party/tournament/tournament-match-room.test.ts` |

Add a smoke step only when the change is about the deployed worker (routing, handshake, seat
proof). After a worker deploy, `node scripts/realtime-smoke.mjs <origin>` runs the same checks
against it.

## Hand-off

- Run the owners' tests (`npx vitest run <paths>`) where your machine can; otherwise read the CI
  run. Say which.
- Report: the contract change, which side must deploy first and why, what an old client and an
  old worker do with it, and what is left unproven.
