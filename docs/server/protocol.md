# Server protocol

How a client and the game server (`party/`) talk, and what the server guarantees about identity,
validation, ordering, persistence and load. Read this before you add a command, an event, a
message type or a persisted field. How the room behind the socket runs (hosting, alarms, pause,
timers) is in [room.md](room.md); the client's side of the contract is in
[../client/connection.md](../client/connection.md). The change checklist is the
`.claude/skills/protocol-change` skill.

## Protocol versions

`shared/domain/events/protocol.ts` is the wire contract both sides import: `PROTOCOL_VERSION`,
`LEGACY_PROTOCOL_VERSION`, the close codes, the protocol error codes and the seat-proof header
(`SEAT_PROOF_HEADER`). Commands are in `shared/domain/events/client-commands.ts`, events in
`game-events.ts`.

| Version | Who | Seat id | Credential | Shared sounds | Liveness | Acks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (legacy) | clients that send no `protocolVersion` in `JOIN_GAME` | their persistent id | the persistent id | inside every `GAME_STATE` | `REQUEST_STATE` | none |
| 2 (current) | `JOIN_GAME { protocolVersion: 2 }` | opaque, server generated (`p_...`) | the session token | `SHARED_SOUNDS` message | `PING` -> `PONG` | `COMMAND_ACK` |

The server serves both, per connection (`connectionProtocols` in `party/room/room-state.ts`), so a
client and a server from different releases keep working during a deploy:

- a client of a later release talking to a server of an earlier one receives no `SESSION`, so it
  keeps treating the server as legacy (it probes with `REQUEST_STATE`, reads sounds from
  snapshots);
- a client of an earlier release talking to a later server is served the legacy format.

A paused game keeps its phase on the version-2 wire (`pauseState` is set beside it). Version-1
connections are shown phase `PAUSED` with the real phase in `pauseState.previousPhase`
(`gameStateMessage` in `party/protocol/state-messages.ts` applies `toLegacyPause` from
`shared/domain/value-objects/game-pause.ts`). The client normalises either form on arrival
(`toOrthogonalPause`), so it also works against a server of an earlier release. See
[room.md](room.md#pause-is-not-a-phase).

## Messages

Client to server, by rate class (`COMMAND_RATE_CLASS` in `party/config/command-rate-limits.config.ts`)
and the file that handles it:

| Class | Commands | Handled in |
| --- | --- | --- |
| `session` | `JOIN_GAME` | `party/handlers/join-handlers.ts`, or the tournament controller for match rooms |
| `liveness` | `PING` | `party/room/command-pipeline.ts` |
| `sync` | `REQUEST_STATE` | `party/room/command-pipeline.ts` |
| `game` | `START_GAME`, `SELECT_TRUMP`, `PLACE_BID`, `PLAY_CARD`, `RESOLVE_EFFECT`, `NEXT_ROUND`, `REQUEST_REMATCH` | `party/handlers/game-handlers.ts` |
| `lobby` | `LEAVE_GAME`, `SET_READY`, `KICK_PLAYER`, `TRANSFER_HOST`, `ADD_BOT`, `REMOVE_BOT` | `party/handlers/player-handlers.ts` |
| `settings` | `SET_ROOM_SETTINGS`, `SET_RULESET` | `party/handlers/settings-handlers.ts` |
| `social` | `SEND_EMOTE`, `SEND_CHAT`, `PLAY_TIMEOUT_SOUND` | `party/handlers/social-handlers.ts` (emote, chat), `party/handlers/sound-handlers.ts` (timeout sound) |
| `sound` | `UPDATE_SOUND_PREFERENCES` | `party/handlers/sound-handlers.ts` |

Server to client, the messages that go to one connection and never to the table:

| Message | Carries | Sent when |
| --- | --- | --- |
| `GAME_STATE` | the receiving seat's projection, `yourPlayerId`, `stateVersion`, `tournamentMatch` in match rooms | after every change, and as the answer to `REQUEST_STATE` |
| `SESSION` | `playerId`, `sessionToken`, `protocolVersion` | after a protocol-2 join |
| `SHARED_SOUNDS` | the room's shared custom sounds | on a protocol-2 join and when the set changes |
| `COMMAND_ACK` | `requestId`, `stateVersion` | after an applied command, protocol 2 only |
| `PONG` | `requestId` | the answer to `PING` |
| `ERROR` | `message`, `code`, `requestId` | a refused command |
| `TIMEOUT_SOUND_PLAYED` | a timeout sound | to the timed-out player and the sender |

Every other `GameEvent` goes to the whole table (see [Broadcasts carry no secrets](#broadcasts-carry-no-secrets)).

## Identity: seats and session tokens

The public player id is never a credential.

- On join the server creates the seat. A version-2 seat gets an opaque id from
  `ISessionCredentialFactory.createSeatId()`. The browser's persistent id is kept only in the
  server's `persistentIdToPlayerId` (kick bans, join de-duplication) and never sent to anyone.
- The joining connection, and only it, receives `SESSION { playerId, sessionToken,
  protocolVersion }`. The token is 32 random bytes (base64url, `party/session/seat-sessions.ts`),
  created the first time the seat needs one and the same for every later join of the seat. It is
  kept server-side in `sessionTokens` (seat -> token), persisted in the room's private storage.
- `claimSeat` (`shared/application/use-cases/player/seat-claim.ts`) decides every join against the
  `ISeatSessionStore` port (implemented by `party/session/seat-sessions.ts`):
  1. a seat attested by a credential the room verified itself (a tournament ticket) is resumed;
  2. a token opens the seat it was issued for (constant-time comparison);
  3. a persistent id opens its seat only while that seat never received a token. This is the
     migration path for seats created by legacy clients: they keep working, and the first
     version-2 join upgrades the seat;
  4. a persistent id that names a token-protected seat is refused with `SESSION_REJECTED`.
  A token the room does not know is ignored, not refused.
- Seat attestation for the social features is an HTTP `GET` on the room carrying the
  `x-seat-proof` header (the `seat` query parameter is read too). `GameRoom.onRequest` answers
  `{ seat }` through `attestSeat` (`party/session/seat-sessions.ts`): a token proves its seat, a
  persistent id proves only a seat without a token, a seat id proves nothing. The web app's caller
  is `src/infrastructure/social/party-room-membership-verifier.ts`; see
  [../accounts/social.md](../accounts/social.md).
- A tournament match ticket proves the account, and the account holds its seat
  (`attestedPlayerId` in `claimSeat`), so a member takes a token-protected seat back from another
  device.
- The client keeps tokens per room in `src/presentation/hooks/connection/seat-session-store.ts`,
  sends the token with every `JOIN_GAME`, forgets it when it is kicked, and keeps it when the player
  leaves on purpose, because the token is what takes the seat back from its bot
  ([../client/connection.md](../client/connection.md)).

When a seat leaves for good (intentional leave from the lobby, kick, grace expiry)
`forgetSeatCredentials` drops its token and persistent ids. A kick also bans the browser ids
behind the seat.

## Commands: decoded at the boundary

Every frame goes through `parseClientCommand` (`party/utils/client-command-parser.ts`) and
`decodeClientCommand` (`shared/domain/events/command-decoders.ts`) before any handler runs:

- frames above `MAX_FRAME_LENGTH`, and above the limit of their command type
  (`maxFrameLengthFor`), are refused with `PAYLOAD_TOO_LARGE`. Frame sizes are `FRAME_LIMITS` and
  field bounds are `COMMAND_LIMITS`, both in `shared/domain/events/command-limits.ts`;
- each command type has exactly one body decoder (`BODY_DECODERS` is exhaustive, so a command
  without one does not compile). Decoders check types, ranges, enums and lengths with
  `CommandFields` and copy only known fields: a bid is a whole number up to `COMMAND_LIMITS.MAX_BID`,
  a suit is one of `ALL_SUITS` or null, a difficulty is one of `BOT_DIFFICULTY_LEVELS`, an emote id
  matches `EMOTE_ID_PATTERN`, chat is bounded text, an effect response goes through
  `parseEffectResponse`. A card's throw only animates it, so it is a hint (`CommandFields.hint`): kept
  as three bounded, finite vectors, otherwise dropped while the card is still played. Nested objects
  the domain owns (room settings, rulesets, sounds, declarations) are required to be objects and
  are normalised by the domain;
- a refusal is answered with `ERROR { code: INVALID_COMMAND | PAYLOAD_TOO_LARGE }`, carrying the
  `requestId` when the frame had a valid one. A frame that is not JSON is answered with a generic malformed-message `ERROR`. Unknown command types
  are refused silently and recorded in telemetry only, so a newer client can probe for features.

The domain still enforces its own invariants (bid range for the hand, one bid per round, the hook
rule by seat, trump suits) with typed errors; the decoder only keeps garbage out.

## Answers and errors

- `ERROR` carries the `code` (a `ProtocolErrorCode` or the `GameError` code; absent for an error
  that is not a `GameError`) and the `requestId` of the command it refuses, also for refusals from
  the catch-all path. `ProtocolErrorCode` has `INVALID_COMMAND`, `PAYLOAD_TOO_LARGE` and
  `RATE_LIMITED`.
- An applied command is answered, after the messages it caused, with
  `COMMAND_ACK { requestId, stateVersion }` (protocol-2 connections only; a resend of an applied
  command is acknowledged again). The client's outbox stops resending it then
  ([../client/connection.md](../client/connection.md)).
- `PING` is answered with `PONG { requestId }` on any connection, joined or not. `REQUEST_STATE`
  from a connection whose join failed is also answered with `PONG`, so a liveness check never loops
  on a socket that has no state to sync.
- Close codes the server uses to end a connection on purpose. The server closes after the messages
  already queued for the connection.

  | Code | Name | Meaning | Terminal (`isTerminalCloseCode`) |
  | --- | --- | --- | --- |
  | 4000 | `SUPERSEDED` (`superseded`) | the seat connected elsewhere (another tab or device) | yes |
  | 4001 | `KICKED` (`kicked`) | the host removed the player from the lobby | yes |
  | 1003 | RFC 6455 unsupported data | the worker received a binary frame (`party/worker.ts`) | no |

  `isTerminalCloseCode` is true for the two 4xxx codes: a client must not reconnect on its own
  after them.

## Idempotency

State-changing commands (everything routed through `party/handlers/command-routes.ts`) from a
joined seat that carry a `requestId` are applied once per (seat, requestId). `ProcessedCommandLog`
(`party/protocol/processed-commands.ts`) remembers applied requestIds for a window and up to a
maximum per seat (`PROCESSED_COMMAND_LIMITS` in `party/config/protocol.config.ts`), persisted with
the room. It is written with the save every state-changing command makes; commands that only
broadcast, such as emotes and chat, cause no storage write.

- A resent command (a client retrying after a reconnect) is answered with the current `GAME_STATE`,
  and with a `COMMAND_ACK` on protocol 2, instead of being applied again.
- A command that was refused (its handler threw, or answered with an `ERROR`) did not happen and is
  forgotten, so it may be sent again once the reason is gone.
- `JOIN_GAME`, `REQUEST_STATE` and `PING` are answered every time.

## Ordering and state versions

Every entry point (a message, an alarm, a bot turn, a disconnect timer) runs as one transaction of
the `CommitGate` (`party/protocol/commit-gate.ts`): handlers change the game, ask for a save and
queue messages. When the transaction ends the gate issues the storage write and only then hands the
messages to the sockets. A Durable Object holds outgoing messages while a write it issued is
pending, so no client sees a move that a crash could lose. `saveState` issues the write
synchronously; there is no promise chain in front of it. What the room does at the end of a
transaction is in [room.md](room.md#transactions-and-settling).

`GAME_STATE.stateVersion` grows by one with every broadcast snapshot and is persisted with the state
it labels, so it keeps growing across restarts. Direct answers (`REQUEST_STATE`, a de-duplicated
command) repeat the current version. The client applies a snapshot only when its version is not
older than the one it holds (`SnapshotOrder`, `src/presentation/hooks/connection/snapshot-order.ts`,
reset for every socket). Snapshots without a version (older servers, the in-browser sandbox
transport) are always applied.

## Broadcasts carry no secrets

`ctx.broadcast` accepts only `BroadcastEvent`: every `GameEvent` except `GAME_STATE`, `ERROR`,
`SESSION`, `PONG`, `COMMAND_ACK` and `TIMEOUT_SOUND_PLAYED`. A broadcast reaches joined connections
only. Hands, hidden bids and tokens leave the server only in per-connection messages: `GAME_STATE`
is always `createPersonalizedState` for the receiving seat
(`shared/application/projections/personalized-state.ts`), and `GAME_STARTED` carries only
`playerIds`, `dealerId` and `maxRounds`.

## Tournament match rooms

Match mode (`party/tournament/`, [../accounts/tournaments.md](../accounts/tournaments.md#game-worker-match-mode))
runs inside the same pipeline:

- `JOIN_GAME` in a match room (or with a `tournamentTicket`, or an `appearanceTicket` on a worker
  with `CHARACTER_TICKET_SECRET`) is decoded and budgeted like every join. Tickets are verified
  asynchronously (both at once); meanwhile the socket's later frames are held (at
  most `TOURNAMENT_ROOM_LIMITS.MAX_HELD_MESSAGES_PER_JOIN`) and handled in order afterwards, each
  as its own transaction. The join itself runs as one transaction under the command's telemetry
  cause, with the client's `protocolVersion` and `sessionToken`, so a protocol-2 member gets an
  opaque seat id and a token like anywhere else. Room settings are never taken from the client.
- The commands a match fixes (settings, rules, bots, kicks, host transfer, start, rematch) are
  refused with `TOURNAMENT_MATCH_LOCKED` after decoding and before anything is applied.
- Each connection's `GAME_STATE` carries `tournamentMatch` beside `state`. The lock follows the
  game on every broadcast (`TournamentMatchController.sync`) and is loaded after the room's state
  is restored. See [room.md](room.md#tournament-match-mode).

## Shared custom sounds

Uploaded sounds are bounded where they enter, in `CUSTOM_SOUND_LIMITS`
(`shared/domain/constants/custom-sound-limits.ts`): the data URL length (not the size the client
declares), id and name lengths, the sounds per player, and a byte budget for the whole room. The
server truncates to these limits instead of refusing a whole preference update; only a frame above
`FRAME_LIMITS.SOUND_PREFERENCES` is refused.

Version-2 clients receive the room's set in `SHARED_SOUNDS` when they join and whenever the set
changes (`SharedSoundsTracker`); snapshots do not carry it. Updating sound preferences broadcasts
no snapshot. Uploaded audio is not persisted: every client resends its preferences when it
connects, and the persisted room keeps only the built-in sound choice.

## Rate limits

`CommandRateLimiter` (`party/protocol/command-rate-limiter.ts`) keeps token buckets per sender and
command class. The classes and their budgets (`burst`, `refillPerSecond`) are in
`party/config/command-rate-limits.config.ts`, with `MAX_RATE_LIMITED_SENDERS` bounding the
limiter's memory. The sender is the seat once joined (a reconnect does not refill it), the socket
before. Over-budget commands are refused with `RATE_LIMITED`.

The classes separate what is cheap (pings) from what is broadcast to the table (emotes, chat,
timeout sounds) and what is large (sound uploads, full snapshots). Commands whose last write wins
(room settings and rules, sound preferences) get budgets that a person cannot exhaust: a slider
drag sends one update per step and every saved setting resends the sound preferences, and refusing
one would leave the room on a stale value.

## Persistence

A room persists under one key of its Durable Object's storage (`PERSISTED_STATE_KEY`).
`party/utils/state.ts` writes schema 2 (`PersistedState` in `party/utils/types.ts`):

- the game's own `toJSON` (restored with `Game.fromJSON`, the only deserialiser);
- seat bookkeeping (persistent ids, session tokens);
- room settings and the bot counter;
- the state version;
- built-in sound choices;
- the processed-command log (`recentCommandIdsByPlayer`).

Fields that are not part of the current schema are ignored on load and not written by the next
save. The loader also reads schema 1 (no `schemaVersion`; players, host, pause and ruleset stored
twice). The storage keys of the other subsystems are in [room.md](room.md#storage).

The restore policy is explicit: humans start disconnected (no socket survived the restart) and an
active game pauses for them; bots stay connected with their difficulty.

## Adding things

- **A command.** Add the type and interface in `client-commands.ts`, its body decoder in
  `command-decoders.ts`, its rate class in `command-rate-limits.config.ts`, and its route in
  `command-routes.ts`. A command the pipeline answers itself, like `PING`, goes into
  `ServerCommandType` in `command-routes.ts` and is answered in `party/room/command-pipeline.ts`.
  Add a frame limit to `FRAME_LIMIT_BY_TYPE` in `command-limits.ts` only if it carries more than
  the default. The compiler flags each exhaustive table you missed.
- **An event.** Add it to `GameEvent`. If it carries anything private, exclude it from
  `BroadcastEvent` and send it per connection.
- **A persisted field.** Add it to `PersistedState`, write it in `toPersistedState`, read it in
  `restoreFrom` with a default for older blobs; bump `PERSISTED_SCHEMA_VERSION` when the meaning of
  an existing field changes.
- **A protocol version.** Bump `PROTOCOL_VERSION`, keep the previous behaviour per connection, and
  follow `.claude/skills/protocol-change/references/compatibility.md`.

## Tests

Server behaviour is tested next to the code on the real room at level 3 (`RoomHarness` in
`party/test-support/room-harness.ts`, driven by `table-driver.ts`; see [room.md](room.md#tests)):

- `party/room/protocol-sessions.test.ts`: tokens, seat attestation, projections.
- `party/room/protocol.test.ts`: validation, idempotency, rate limits, liveness, ordering, sounds,
  a mixed protocol-1 and protocol-2 table.
- `party/room/recovery.test.ts`: rooms stored by older releases, idempotency over a restart.
- `party/protocol/protocol-primitives.test.ts`: the commit gate, rate limiter and processed-command
  log in isolation.
- `party/utils/state.test.ts`: persisted state, both schemas.
- `shared/domain/events/command-decoders.test.ts` and
  `shared/application/use-cases/player/seat-claim.test.ts`: decoding and seat claims at levels 1
  and 2.
- `party/tournament/tournament-match-room.test.ts`: the match room's join and locked commands.

Level 4 (`test/integration/`, see `test/integration/README.md`) covers the client and server
together: command acknowledgements, retries, superseded and zombie sockets, state sync. The CI
realtime smoke test (`scripts/realtime-smoke.mjs`) plays a legacy game against `wrangler dev` and
checks protocol-2 seats (`SESSION`, opaque id, no takeover by id, resume by token).
