# Client connection

How the web client holds its realtime connection to a room, keeps the game state, presents tricks
and sends commands. Read this before you touch `src/presentation/hooks/connection/`,
`src/presentation/hooks/useGameConnection.ts`, `src/presentation/providers/` or the game page's
routing. The server side of the protocol is in [protocol.md](../server/protocol.md), the room in
[room.md](../server/room.md).

## How it works

Everything under `src/presentation/hooks/connection/` below the React hooks is plain TypeScript
with unit tests beside it. Handlers are methods of long-lived objects, so no socket listener
reads React state through a closure captured when the socket opened.

```
GameSocket (port)          PartySocket (partysocket package) in the browser, LoopbackSocket
                           (src/infrastructure/sandbox/loopback-socket.ts) in the animation
                           sandbox and the integration tests (game-socket.ts)
  SocketLine               one live socket at a time, generations, connect watchdog
  GameSession              reconnect policy, liveness, outbox, seat token, protocol version
    GameSessionListener    status, game events, settled commands (session-listener.ts)
createGameClient           composition root (game-client.ts): wires the parts below
  ExternalStore            GameClientState: status, error, server state, legal plays, pending play
  TrickPresentation        the trick timeline the table shows
  game-event-router        one handler per server message (HANDLERS registry)
  createGameCommands       stable command functions; the outbox sits behind them
  TableFeeds               emotes, chat, bids, notices, lobby activity, tournament seat state
useGameConnection          builds the browser adapters and calls createGameClient
GameProvider               GameClientContext (stable handles), TableFeedContext, session actions
  focused hooks            useConnectionView, useGameSnapshot, useTrickPresentation, useTableFeed
  useGame()                the composed facade for screens that use most of it
```

| Module | Path | Owns |
| --- | --- | --- |
| `createGameClient` | `src/presentation/hooks/connection/game-client.ts` | Builds the store, `TrickPresentation`, `GameSession`, `ErrorNotice` and the commands; routes the session into them from construction, so no status or message that arrives before the UI subscribes is lost. `createConnectionActions` returns the stable `ConnectionActions` |
| `GameSession` | `game-session.ts` (types in `game-session.types.ts`) | One player's connection to one room: status, join, reconnect, liveness, outbox, seat token, protocol version |
| `SocketLine` | `socket-line.ts` | The current socket, its generation number, retired sockets whose late `close` is swallowed, the connect watchdog |
| `CommandOutbox` | `command-outbox.ts` | Unsettled commands keyed by `requestId` |
| `ConnectionLiveness` | `connection-liveness.ts` | Probes of a socket that claims to be open |
| `ReconnectPolicy` | `reconnect-policy.ts` | Backoff, the attempt counter, the one pending retry |
| `SnapshotOrder` | `snapshot-order.ts` | Drops a `GAME_STATE` older than the one applied |
| `GameClientState` | `game-client-state.ts` | The server's snapshot as received, with structural sharing |
| `selectDisplayState` | `display-state.ts` | What the table shows: snapshot, presented trick, pending play |
| `TableFeeds` | `table-feeds.ts` | One external store for the feeds around the table |
| `TrickPresentation` | `trick-presentation.ts` | The trick timeline |
| Telemetry and traces | `connection-telemetry.ts`, `session-trace.ts` | Socket lifecycle to client telemetry, wire events to game traces |
| Seat tokens | `seat-session-store.ts` | The per-room seat token in browser storage |

All timing and size values are in `src/presentation/config/connection.config.ts`
(`RECONNECT_POLICY`, `CONNECTION_TIMING`, `CONNECTION_LIVENESS`, `COMMAND_OUTBOX`) and
`src/presentation/config/trick-presentation.config.ts` (`TRICK_PRESENTATION`).

### The composition root

`createGameClient({ feeds, ...sessionDeps })` takes a `GameSessionDeps`
(`game-session.types.ts`): the socket factory, the seat token store, `ConnectionTelemetry`, the
persistent id, the app version and an optional trace sink and random source. `useGameConnection`
only supplies the browser's adapters (`createPartyGameSocket`, the functions of
`seat-session-store.ts`, `recordGameTrace`, `getOrCreatePlayerId`) and creates one client per
mounted provider. The animation sandbox passes its own `socketFactory` through `GameProvider`. The
integration tests call `createGameClient` directly on a `LoopbackSocket`
(`test/integration/support/player-client.ts`).

`useGameConnection` returns `{ handles, feed, tournament }`. `handles` (`GameClientHandles`: store,
trick presentation, commands, connection actions) never changes identity. `feed` and `tournament`
are `useSyncExternalStore` views of `TableFeeds`: `useSocialState`, `useLobbyActivity`,
`useSpecialCardNotices` and `useTournamentSeat` each select their slice. `useSessionWakeups` wires
the session to the page.

`GameProvider` publishes the handles in `GameClientContext`, the feed in `TableFeedContext` and
the navigation actions (`connect`, `disconnect`, `leaveGame`, `sessionLoaded`, `clearSession`) in
a session-actions context. Components subscribe to slices of the store with `useStoreSelector`
(`src/presentation/state/external-store.ts`, built on `useSyncExternalStore`), so a connection
status change does not re-render the table and an emote does not re-render the HUD. `Game3DCanvas`,
`Game3DScene`, `GameTable`, `PlayerAreaRenderer` and `TableDecorations` are `memo` boundaries; the
game page passes them stable callbacks and a memoised hand order, so a HUD-only change (a timer, a
chat line, the connection notice) does not re-render the table.

## Connection status

`ConnectionStatus` (`src/presentation/types/connection.types.ts`) is owned by the session:

| Status | Meaning | UI |
| --- | --- | --- |
| `idle` | nothing asked for, or closed on purpose | join form / home |
| `connecting` | first connection to a room | loading |
| `connected` | socket open | live table |
| `reconnecting` | dropped unexpectedly, restoring by itself | table stays mounted, non-blocking notice |
| `failed` | retry budget spent | page stays, "Connection lost / Try again" |
| `superseded` | the seat opened in another tab or device (close 4000) | page stays, "Playing in another tab / Play here" |
| `kicked` | removed by the host (close 4001 or `PLAYER_KICKED`) | lobby's kicked screen |
| `rejected` | refused for good (tournament seat, `SESSION_REJECTED`); the room's state is forgotten | lobby / tournament gate |

`superseded`, `kicked` and `rejected` are terminal (`isTerminalConnectionStatus`); the session
never reconnects from them by itself.

The `failed` and `superseded` prompts are one component, `ConnectionStatusOverlay`
(`src/presentation/components/overlays/ConnectionStatusOverlay.tsx`), shown on the game page, the
lobby and the results page: two tabs on one invite link supersede each other in the lobby as often
as at the table.

Routing reads the status, never the raw socket flag:

- `resolveGameRedirectTarget` (`src/app/game/[id]/useGameRedirect.ts`) keeps the table mounted
  through `reconnecting`, `failed` and `superseded`. A page without a game waits while
  `isAwaitingSeat` holds (a fresh load connecting) and sends a client without a seat to the lobby.
- `resolveResultsRedirect` (`src/app/results/[id]/results-redirect.ts`) keeps the results on
  screen through a drop and sends a client without a seat, or seated in another room, home.
- `useGameNavigation` (`src/presentation/providers/useGameNavigation.ts`) follows the phase while
  `shouldFollowPhase(status)` holds (any status except `idle` and the terminal ones), so a drop
  does not send the player through the lobby and back. Its saved-session rejoin runs only from
  `idle`.

## Reconnecting

`ReconnectPolicy` (config `RECONNECT_POLICY`):

- Full jitter over a doubling ceiling with a floor. The first retry stays within
  `RECONNECT_TIMING.CLIENT_FIRST_RETRY_MS` (`shared/domain`), which the server's disconnect
  debounce is derived from. After a server restart every client of a room retries at a different
  moment.
- After an unexpected drop the attempt counter resets on an answered join (a `GAME_STATE` on the
  new socket, `ReconnectPolicy.confirmed`), not on any message, so a socket that opens and is
  closed again keeps backing off. A deliberate `connect` and `retryNow` also start the budget
  over.
- After `MAX_ATTEMPTS` the status is `failed`. `online`, `pageshow` and `visibilitychange`, and the
  "Try again" button, retry at once, also during a backoff (`GameSession.wake` calls
  `ReconnectPolicy.retryNow`, which restarts the budget).
- Terminal close codes never reconnect: `classifySocketClose` (`socket-close.ts`) maps
  `ConnectionCloseCode.SUPERSEDED` and `KICKED` (`shared/domain/events/protocol.ts`) to
  `superseded` and `kicked`; every other close is transient. "Play here" (`takeOverSeat`, which
  is `GameSession.takeOver`) reconnects on purpose and the server closes the other tab as
  superseded.

The connect timeout is part of the socket port (`GameSocketOptions.connectTimeoutMs`, PartySocket's
`connectionTimeout`). `SocketLine` keeps a watchdog with the same timeout for transports without
one, and a timed-out socket is retired and retried instead of left dead. Expected socket errors
log as warnings; the close that follows drives the retry.

`useSessionWakeups` wires the page: `visibilitychange`, `pageshow` (a back/forward cache restore
resumes the session), `online`, `pagehide` (`GameSession.unload` closes the socket at once) and a
periodic liveness check while the page is visible (`CONNECTION_LIVENESS.CHECK_INTERVAL_MS`). The
session's `suspend` and `resume` make React's strict-mode effect rehearsal reconnect instead of
staying down.

## Liveness

`ConnectionLiveness` probes a socket that claims to be open. The probe is `PING` (answered with
`PONG`, no snapshot) for servers that announced protocol 2 and `REQUEST_STATE` for older ones. A
probe goes out after `QUIET_MS` without any message, when the page comes back, and
`COMMAND_ANSWER_MS` after a command that saw no message at all, so a command sent into a zombie
socket is noticed within `COMMAND_ANSWER_MS + PROBE_TIMEOUT_MS`. An unanswered probe replaces the
socket at once (`GameSession.replaceDeadSocket`), and any message cancels the probe. While a probe
is in flight the line is suspect and the outbox holds commands.

## Commands: the outbox

Every command goes through `GameSession.send` into the `CommandOutbox`, keyed by `requestId`
(`withRequestId` in `socket-command.ts` adds one):

- A command is sent at once on an open, unsuspected line, and held while the line is suspect
  (until the probe is answered) or closed.
- `COMMAND_ACK { requestId, stateVersion }` settles it as `acknowledged`: the server sends it after
  the snapshot the command caused. `ERROR { requestId }` settles it as `rejected`.
- Unsettled commands are sent again, with the same `requestId`, right after `JOIN_GAME` on the
  next socket. The server applies a `requestId` once, so a resend of an applied command only
  repeats its answer.
- A command expires after `COMMAND_OUTBOX.COMMAND_TTL_MS`, sent or not. Expiry is swept on every
  flush and on the periodic liveness check, so a command nothing will ever answer cannot block
  anything for longer.
- Emotes and timeout sounds (`EPHEMERAL_COMMANDS` in `command-outbox.ts`) that were lost with their
  socket are dropped, not replayed on the next one.
- The outbox holds at most `COMMAND_OUTBOX.MAX_SIZE` commands. When it is full, the oldest are
  evicted and settled as `expired`, so a dropped card play does not stay pending.
- `disconnect`, `leave`, a kick and a refusal clear the outbox, settling every command as
  `expired`. Connecting to another room clears it too, so no command reaches the wrong room.
- A server that does not announce protocol 2 sends `ERROR` without a `requestId`. Such a refusal
  settles the newest command sent on that socket (`CommandOutbox.newestSentOn`), so a refused
  card play goes back to the hand at once instead of after the TTL.

Every settlement reaches `GameSessionListener.onCommandSettled`, which `session-listener.ts` turns
into the pending-play handling below. `ErrorNotice` shows errors one at a time: a newer one gets
its full display time, and the kick message is sticky.

## Local card plays

`playCard` (`game-commands.ts`) is optimistic: the command goes into the outbox,
`pendingPlay { cardId, requestId }` is set in the store and the card's throw starts in the
presentation. `selectDisplayState` takes the card out of the hand and onto the open trick until the
server decides; the server's state itself is never changed. While a play is pending
`useGameSnapshot` reports no legal cards, so a double tap sends nothing. The play is settled by:

- a snapshot whose hand no longer holds the card (confirmed);
- `ERROR` with its `requestId`, expiry from the outbox, or an acknowledgement whose snapshot still
  shows the card (refused): `settlePendingPlay` calls `TrickPresentation.retractLocalPlay` and the
  card leaves the table and reappears in the hand. An `ERROR` also shows its message.

## State and rendering

`GameClientState` (`game-client-state.ts`) keeps the server's `GAME_STATE` exactly as received,
with structural sharing (`replaceEqualDeep`, `src/presentation/utils/replace-equal-deep.ts`;
arrays of objects with ids are matched by id). An identical snapshot (a liveness answer from a
server before protocol 2) changes nothing and re-renders nothing, and a snapshot that only moved
the turn keeps every player, hand, card and trick object. `legalCardIds` is derived once per
snapshot from `getLegalPlays` (`shared/application/projections/legal-plays.ts`) and keeps its
identity while unchanged.

## Snapshot ordering

`SnapshotOrder` compares the `stateVersion` of each `GAME_STATE` on a socket. A snapshot older
than the one applied is dropped before it reaches the state, so a late answer cannot roll the table
back. An equal version is applied, because direct answers (a state request, a resent command)
repeat the version. A snapshot without a version is always applied. A new socket resets the
sequence (`GameSession.open`).

## Trick presentation

`TrickPresentation` (`trick-presentation.ts`) is the single owner of the trick timeline on the
client: played, landed, completed (pending result), all landed (result), collected. It absorbs the
pure lifecycle modules (`played-card-registry.ts`, `played-card-animation-sequencer.ts`,
`trick-complete-lifecycle.ts`, `trick-replay-recovery.ts`) and publishes an immutable
`TrickPresentationView` (`frozenTrick`, results, visible played cards, backlog) through
`useTrickPresentation`.

- It never patches the server state. While a completed trick is presented the table shows
  `frozenTrick` in place of the server's current trick; after the collection it catches up from
  the latest snapshot it holds, without a state request.
- A trick that completes while another is presented waits in a deferred queue, also when the
  completion is only found in a snapshot (missed while away).
- Catch-up: a backlog of announced cards beyond `TRICK_PRESENTATION.MAX_FLIGHT_BACKLOG` is placed
  at rest instead of flown one by one, so the table never lags seconds behind after a reconnect, a
  stall or a burst of bot moves. When the local player is to act, the whole backlog lands first,
  and the local player's own throw lands every waiting card before it flies. `backlog > 0` blocks
  playable cards, so the player never acts on a lead that is not visible.
- The server waits for the presentation: `TRICK_PRESENTATION_TIMING` (`@shared/domain`) is how
  long the slowest landing and collection of a trick takes, and bots and hostless round advances
  wait that long after a trick completed. A test in `collecting-card-animation.test.ts` fails when
  the animation config outgrows it; raise the shared timing with it.

The 3D side (`useCardLandingTracking`, `useCollectingAnimation`, the held drag play, the pending
drop pose) reports landings and collections to the presentation through callbacks
(`playedCardLanded`, `allCardsLanded`, `trickCollected`).

## Table feeds

`TableFeeds` (`table-feeds.ts`) is one `ExternalStore<TableFeedsState>` for what happens around
the table besides the game state. The event router writes through four handler groups on the
instance, each stable for the life of the client:

| Group | Holds | Cleared by |
| --- | --- | --- |
| `social` | emotes, chat, bid bubbles; each entry expires on its own timer (`CONSTANTS.SOCIAL`) | `REMATCH_STARTED` |
| `lobby` | joins, leaves, removals, host changes, rule and settings changes (`lobby-activity.ts`) | room change, rematch, leaving |
| `notices` | special-card announcements (`CONSTANTS.SPECIAL_CARDS`) | rematch |
| `tournament` | the match a room is locked to (`tournamentMatch`) and the lasting refusal of a seat (`tournamentRejection`) | the match: leaving, or a refused seat; the refusal: `dismissRejection` on a deliberate connect |

`TableFeeds.joinFields` supplies the extra `JOIN_GAME` fields for a room: the stored tournament
ticket (`tournament-join.ts`). `game-client.ts` adds the player's character ticket
(`characterTicketJoinFields` in `src/lib/account/character-ticket.ts`). `tournament-match.ts` validates the `tournamentMatch` that the
worker sends with every `GAME_STATE` of a match room and moves its deadlines onto the device's
clock. See [tournaments.md](../accounts/tournaments.md).

## Wire compatibility

The client works against servers on either protocol version (`shared/domain/events/protocol.ts`;
the server's side is in [protocol.md](../server/protocol.md)):

- `COMMAND_ACK` goes only to protocol-2 connections. Against a server without it, commands
  expire by TTL and an uncorrelated `ERROR` refuses the newest command sent.
- The session assumes `LEGACY_PROTOCOL_VERSION` until a socket's `SESSION` message arrives, and the
  probe is `REQUEST_STATE` until then.
- `SESSION`, `PONG` and `COMMAND_ACK` are answered by the session and never reach the client state
  (`PROTOCOL_EVENTS` in `game-session.ts`).
- Legacy pause snapshots (phase `PAUSED`) are normalised on arrival (`toOrthogonalPause`).

## Adding things

- **A server message the client reacts to**: add a handler to `HANDLERS` in
  `game-event-router.ts`. If the message is protocol bookkeeping, handle it in
  `GameSession.consume` instead.
- **A command**: add it to `GameCommands` and `createGameCommands` (`game-commands.ts`); decide
  whether it is ephemeral (`EPHEMERAL_COMMANDS` in `command-outbox.ts`).
- **A feed around the table**: add a slot to `TableFeedsState` and a handler group to `TableFeeds`,
  a `useSyncExternalStore` view next to `useSocialState`, and the field in `TableFeed`
  (`types.ts`).
- **A connection tunable**: add it to `connection.config.ts`, not to the module that reads it.
- **A trick stage** (for example an expansion effect between landing and collection): extend
  `TrickPresentation` and its view; the table reads the view, not new props.

## Tests

| Suite | Contract |
| --- | --- |
| `game-session.test.ts` | superseded and kicked closes, backoff without an answered join, the retry budget, wake, connect timeout, held commands, `PING`, settlement, uncorrelated refusals, expiry on a live socket, snapshot order, strict-mode resume |
| `game-session.outbox.test.ts` | probes, commands sent before open or on a failed send, lost emotes, offline expiry, the outbox bound, disconnect, room switch |
| `game-client.test.ts` | the composition root: acknowledged plays, second taps, leaving |
| `trick-presentation.test.ts`, `trick-presentation.flights.test.ts` | the trick timeline, deferral, catch-up and flight backlog |
| `reconnect-policy.test.ts`, `session-listener.test.ts`, `game-event-router.test.ts`, `display-state.test.ts`, `game-client-state.test.ts`, `error-notice.test.ts` | the units each file is named after |
| `src/presentation/utils/replace-equal-deep.test.ts` | structural sharing |
| `src/app/game/[id]/useGameRedirect.test.ts`, `src/app/results/[id]/results-redirect.test.ts` | the redirect tables |
| `test/integration/` | several real clients against the real `GameRoom` with seeded latency, stalls and zombie sockets; see [test/integration/README.md](../../test/integration/README.md) |
| `party/room/protocol.test.ts` | the server's acknowledgement |

The session suites run on the fake socket in `hooks/connection/test-support/fake-socket.ts`. In
the animation sandbox, the `superseded-close` scenario checks that a 4000 close stays down until
`take-over-seat`.
