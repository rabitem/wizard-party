# Compatibility and deploy order

## Why two releases always meet

- The worker ships by hand: `npm run deploy:party` (`wrangler deploy`). CI only dry-runs it
  (`npm run check:worker`) and runs the smoke test against `wrangler dev`.
- The app ships through Vercel (`vercel-build`), independently of the worker.
- A worker deploy restarts every room from storage. Clients reconnect with the JavaScript they
  already loaded; nothing forces a reload. An old client can stay on the new worker for as long as
  its tab is open, and a freshly loaded client meets the old worker until the worker is deployed.

Each side learns the other's version per socket:

- worker: `JOIN_GAME.protocolVersion` (absent means 1), kept in `RoomState.connectionProtocols`,
  read through `RoomMessaging.protocolOf`;
- client: `SESSION.protocolVersion`, kept in `GameSession.serverProtocol`, reset to
  `LEGACY_PROTOCOL_VERSION` for every new socket until `SESSION` arrives.

## What the other release does with your change

| Change | Old worker, new client | Old client, new worker | Rule |
| --- | --- | --- | --- |
| New command | Dropped as `UNKNOWN_COMMAND`, no `ERROR`; the outbox expires it after `COMMAND_TTL_MS` | Never sent | Worker first |
| New optional field on a command | The decoder copies only known fields: dropped | Absent; the worker uses a default | Worker first |
| New required field on an existing command | - | Refused with `INVALID_COMMAND` on every send | Never: make it optional |
| Tighter decoder bound | - | Values a shipped client sends are refused | Only for values no shipped client sends |
| New event type | Never sent | Ignored (no entry in `HANDLERS`) | Either order; the client must not wait for it |
| New field on an event or `IGameState` | Absent | Ignored | Optional in the type; the client works without it |
| Changed meaning or shape of an existing field or message | Sends the old form | Misreads the new form | [Version gate](#version-gate) |
| New call from the worker to an app endpoint | - | - | App first (`docs/accounts/tournaments.md`, "Rollout order") |

Existing examples of the optional-field rule: `GameStateEvent.stateVersion` and
`GameCompleteEvent.winnerIds`. Prefer a new field beside the old one over changing what the old
one means: `GameCompleteEvent.winnerId` stays for older clients while `winnerIds` carries ties.
That avoids a version gate.

"Worker first" in practice: land the shared and `party/` half with the client unchanged, deploy the
worker, then land the client half. One PR is acceptable only when the client feature degrades
harmlessly against the old worker (the command expires and nothing on screen waits for it); then
deploy the worker right after the merge.

## Persisted room state

A worker deploy reloads every room through `loadState` (`party/utils/state.ts`). A new
`PersistedState` field (`party/utils/types.ts`) gets a default in `restoreFrom`. A rollback runs
the previous worker on what the new one wrote, so keep persisted changes additive: an older loader
ignores a field it does not know. Bump `PERSISTED_SCHEMA_VERSION` only when the meaning of an
existing field changes, and keep reading the old schema.

## Version gate

Bump `PROTOCOL_VERSION` only when an existing message must look different to clients that already
shipped. Additive changes from the table never need a bump.

1. Bump it in `shared/domain/events/protocol.ts` and add the new version's differences to its doc
   comment. Add a predicate beside `isLegacyProtocol`, named after the capability, instead of
   comparing numbers at call sites.
2. Worker: build the message per connection from `protocolOf(connectionId)`. Existing examples:
   `gameStateMessage` (`toLegacyPause`, `sharedCustomSounds`), `RoomMessaging.syncSharedSounds`,
   `CommandPipeline.acknowledge`. `RoomMessaging.broadcast` serializes one string for everyone,
   so a version-dependent event cannot be broadcast; send it per connection.
3. Client: branch on `serverProtocol` in `GameSession`. Existing examples: the liveness probe
   (`PING` or `REQUEST_STATE`) and `settleRefusal` for an `ERROR` without a requestId.
4. Every existing `isLegacyProtocol` call site (`git grep isLegacyProtocol`, including
   `usesSessionTokens` in `shared/application/use-cases/player/seat-claim.ts`) treats all versions
   above 1 alike. Check that each still holds for the new version.
5. Tests: join the room harness once with the new version and once with the previous one
   (`RoomHarness.join(name, suffix, { protocolVersion })`, `null` for a legacy client without the
   field) and assert what each receives. `game-room.test.ts` ("legacy clients see PAUSED") and
   `party/room/protocol.test.ts` ("never acknowledges ... a legacy connection", "serves a mixed
   table") are the pattern.
6. Update the versions table in `docs/server/protocol.md` and "Wire compatibility" in
   `docs/client/connection.md`.

Deploy the worker first: it serves both versions, and the new client falls back until it sees
`SESSION` with the new version.

## Removing a compatibility path

Legacy paths (protocol 1, the `REQUEST_STATE` probe, `sharedCustomSounds` in snapshots,
`toLegacyPause`, `ERROR` without a requestId) stay until nothing needs them:

- worker side: until no client build that needs it still connects. Server telemetry records each
  socket's build on `client.connected` (`clientVersion`, from the `clientVersion` query parameter
  the client adds);
- client side: until no deployed worker lacks the feature the fallback covers.

Delete the tests that only proved the removed path, and the row in the versions table of
`docs/server/protocol.md`.
