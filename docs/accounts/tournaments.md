# Tournaments

Signed-in players create tournaments, others register, and every match is played at a real game
table: a Durable Object room of the game worker. The worker, not the browser, attests the result.
Standings and rounds update live by polling, a tournament moves on by itself (lazy transitions, no
cron), grants awards (trophies and XP) and feeds achievements. Read this before you change the
tournament rules, the HTTP API, the ticket and result wire formats or the worker's match mode.
Accounts, XP and achievements are in [accounts.md](accounts.md); the inbox that carries table calls
and invites is in [social.md](social.md); the room and protocol behind a match are in
[../server/room.md](../server/room.md) and [../server/protocol.md](../server/protocol.md).

This page is the contract between the layers. When code and page disagree, fix one of them in the
same change.

## How it works

```
shared/domain/tournament/        pure rules, no I/O, unit tested
  tournament.types.ts            Tournament aggregate, Entrant, TournamentMatch, MatchLiveState,
                                 MatchReport, MatchProgress, RECORD_RESULT_OUTCOMES
  tournament.constants.ts        TOURNAMENT_LIMITS, TOURNAMENT_TIMING, TOURNAMENT_POINTS,
                                 TOURNAMENT_XP, TOURNAMENT_RATE_LIMITS
  tournament.ts                  the state machine: create, update, register, withdraw, start,
                                 cancel, recordMatchResult, resolveStaleMatch, applyDueTransitions
  tournament-error.ts            TournamentError, TOURNAMENT_ERROR_CODES
  formats/                       ITournamentFormat strategies and the TOURNAMENT_FORMATS registry
  table-planner.ts               planTables, planSeating (bot padding), snake and in-order dealing
  match-records.ts, standings.ts points, per-entrant records, the format comparators, rankings
  awards.ts, participation.ts    TOURNAMENT_AWARDS, XP scaling, TournamentParticipation
  match-activity.ts              recordMatchProgress, isMatchActive, matchResolvableAt
  match-room.ts                  TournamentMatchRoomState, rankMatchSeats
  tournament-ids.ts              ids, invite codes, matchIdFor, matchRoomCode, isTournamentRoomCode
  tournament-validation.ts       parseTournamentDraft, parseTournamentChanges, defaults
  seat-names.ts, seeded-random.ts
shared/tournament/               isomorphic wire codec on WebCrypto (party/ and src/ import it)
  match-ticket.ts                signMatchTicket, verifyMatchTicket, parseMatchTicketClaims
  match-result-report.ts         result report, buildMatchResultRequest, verifyMatchResultSignature
  match-progress-report.ts       progress ping, matchReportKind
  tournament-wire.ts             TOURNAMENT_WIRE_LIMITS, TOURNAMENT_RESULT_HEADERS,
                                 tournamentTicketStorageKey
shared/application/ports/tournament/
                                 ITournamentRepository, ITournamentHistoryReader,
                                 ITournamentTicketSigner, ITournamentInbox, IProgressRefresher,
                                 ITournamentThrottle, ITournamentIdGenerator
shared/application/use-cases/tournament/
                                 TournamentStore, TournamentEffects, view models
                                 (tournament-views.ts), one file per use case group
src/infrastructure/tournament/   Postgres repository and history reader, Redis throttle, HMAC
                                 signer, progress refreshers, tournament-config.ts,
                                 tournament-container.ts (the composition root)
src/app/api/tournaments/**       route handlers (tournament-route.ts, tournament-http.ts,
                                 match-results/)
party/tournament/                match mode of the game worker: TournamentMatchController and the
                                 result outbox
src/app/tournaments/**           pages: list, new, [id], [id]/edit
src/lib/tournament/              tournamentApi (the only browser module that knows the routes),
                                 match ticket storage, error copy
src/presentation/hooks/          useTournament*, connection/useTournamentSeat.ts
src/presentation/components/tournament/
                                 page views, in-game/ (lobby, banner, join gate, results)
```

Import paths follow the other bounded contexts, not the top-level barrels:
`@shared/domain/tournament`, `@shared/application/ports/tournament`,
`@shared/application/use-cases/tournament`, `@shared/tournament`. The worker imports the same code
by relative path.

```
registration --start (host, or startsAt passed with enough entrants)--> running --> completed
     |                                                                     |
     +-----------------------------cancel (host)---------------------------+--> cancelled
```

## Domain rules

`Tournament` is immutable data. Every transition is a pure function that returns a new value or
throws `TournamentError`. `version` is the optimistic concurrency token, bumped by the store.

- **Registration.** `registerEntrant` (a private tournament needs the invite code, except for the
  host), `withdrawEntrant` (removes the entry; seeds close the gap), `updateTournament` (host
  only; turning private issues `inviteCode`, public clears it; `maxEntrants` cannot drop below the
  field).
- **Start.** `startTournament` (host only) needs `minimumEntrants(settings)`. Seeds are assigned by
  level, then registration time; round 1 is seated. A field that cannot be split into tables
  without bots is refused with `invalid_state`.
- **Rounds.** A match has the deterministic id `${tournamentId}-${round}-${table}` and the room
  code `matchRoomCode(id)`. Seat order is a shuffle seeded by the match id, so the top seed does not
  always deal first. `deadlineAt = createdAt + MATCH_HARD_TIMEOUT_MS`.
- **Results.** `recordMatchResult` is idempotent per match: `duplicate` when already completed,
  `superseded` when the table was voided before the result arrived, `ignored` after the tournament
  ended. Otherwise it validates room and roster (`invalid_input`), stores points and, when the round
  is complete, lets the format plan the next round or complete.
- **Progress.** The worker pings when a match game starts, at every round end and, during a long
  round, every `MATCH_PROGRESS_HEARTBEAT_MS`. `recordMatchProgress` stores
  `match.live = { round, maxRounds, lastActivityAt }` on a pending match of a running tournament
  (`lastActivityAt = min(at, now)`). Pings for decided matches, for a tournament that is not
  running, older than the stored one or for an earlier round are `ignored` and save nothing.
- **Void.** A pending table is voided at its deadline, or by the host through `resolveStaleMatch`
  once `matchResolvableAt(match)` has passed: stale (`MATCH_STALE_AFTER_MS`) and quiet
  (`isMatchActive` false, window `MATCH_ACTIVITY_GRACE_MS`). The host never resolves a table they
  play at (`canResolveMatch`). Everyone at a voided table gets last place and no points. A
  knockout podium needs the player's last table played, so a voided Final crowns nobody.
- **Unseatable field.** When a format cannot seat the next round (accounts deleted mid-tournament),
  the tournament completes with the standings so far, so due transitions never throw.
- **Lazy transitions.** `applyDueTransitions(t, now)` runs before every read and write: a
  scheduled auto-start, cancelling a scheduled tournament still short of players
  `UNSTARTED_GRACE_MS` after `startsAt`, cancelling an unscheduled registration after
  `REGISTRATION_MAX_AGE_MS`, and voiding pending matches past `deadlineAt`. Lists settle due
  registrations too (`registrationDueAt`); a row whose status changed leaves that page, and the
  cursor keeps following the stored order.
- **Completion.** Final ranks are frozen on the entrants (`Entrant.final`) and awards computed.

Limits (names, sizes, rounds, list pages, invites, scheduling window) are `TOURNAMENT_LIMITS`;
timings (match timeouts, ticket lifetime, no-show grace, start countdown, poll interval) are
`TOURNAMENT_TIMING`; per-user budgets (`create`, `register`, `ticket`, `invite`, `invite_pair`) are
`TOURNAMENT_RATE_LIMITS`; all in `shared/domain/tournament/tournament.constants.ts`.

### Seating and formats

- `planTables(count, { min, max })` makes the fewest tables with sizes differing by at most one,
  larger first, and throws when no split exists. `planSeating(humans, maxTableSize, allowBots)`
  falls back to the fewest tables padded with bots up to the minimum table size. Bots never appear
  in standings.
- Formats are strategies (`ITournamentFormat`: `validateSettings`, `expectedRounds`,
  `decideNextRound`, `compare`, `roundLabel`), pure and deterministic, so concurrent writers plan
  identical rounds.

| id | name | rules |
| --- | --- | --- |
| `series` | Swiss Series | `settings.rounds` rounds, everyone plays every round. Round 1 tables are a seeded shuffle of the field; later rounds sort by standings and fill tables in order. A field shrunk by deleted accounts is padded with bots; fewer than two left ends the series. Ranking: points, table wins, total game score, bid accuracy, seed. |
| `knockout` | Elimination | Round 1 deals seeds in snake order. The top `advanceCount(humans, advancePerTable)` of each table advance (default half, rounded up, always at least one left behind); no-shows never advance and void tables advance nobody. A round with one table is the Final. If the survivors cannot be seated without bots, the best seatable number advances; two survivors play the Final with a bot. Ranking: round reached, placement there, score there, total points, seed. |

Points per match are `placementPoints(placement, size)`: a share of `TOURNAMENT_POINTS.MAX_POINTS`
by placement, normalised across table sizes, plus `WIN_BONUS` for the table winner. No-shows and
void matches score nothing.

### Awards

`TOURNAMENT_AWARDS` (`awards.ts`) is a registry of pure rules over the final outcome. Base XP is
in each definition and is scaled by `fieldSizeFactor(entrants)` (`TOURNAMENT_XP`).

| id | tier | who |
| --- | --- | --- |
| `champion`, `runner-up`, `third-place` | gold, silver, bronze | ranks 1 to 3, for players who played a table; in an elimination the player's last table must have been played too |
| `oracle` | special | best bid accuracy, with at least `ORACLE_MIN_BIDS` bids |
| `high-roller` | special | highest single-match score |
| `comeback` | special | a champion who was in the bottom half after round 1 (two or more rounds) |
| `iron-mage` | special | a series of two or more rounds in which the player played every round |
| `finisher` | participation | everyone who played at least one table |

## Application layer

- **Ports** are in `shared/application/ports/tournament/index.ts`. `ITournamentRepository.save`
  is atomic: the whole aggregate is written and the stored version moves from `expectedVersion` to
  `tournament.version`, or nothing changes and it answers `conflict`.
- **`TournamentStore`.** `mutate(id, change)` loads, applies due transitions, applies `change`,
  saves with the loaded version and retries up to `MAX_SAVE_ATTEMPTS` on a conflict, then throws
  `conflict`. `read(id)` is `mutate` with no change. While tournaments are unavailable
  (`isTournamentsAvailable()` false) a read returns the stored state without applying due
  transitions and a change throws `unavailable`, so nothing moves that the worker could not play.
- **`TournamentEffects.dispatch(before, after)`** runs once, after the winning save:
  `tournament_table_ready` for every human of every new match; on completion `tournament_finished`
  for entrants and host plus `IProgressRefresher.refresh`. Failures go to the error reporter and
  never throw.
- **Creating.** `CreateTournamentUseCase` takes the draft plus `joinAsEntrant` (default true: the
  host plays). At `MAX_ACTIVE_HOSTED` it first reads the host's active tournaments, so ones that
  expired unseen free their slot. `PATCH` accepts the same fields and changes only the present
  ones (`description: null` and `startsAt: null` clear).
- **Use cases.** Each is a class with `execute`, wired in `tournament-container.ts`:
  `CreateTournamentUseCase`, `UpdateTournamentUseCase`, `StartTournamentUseCase`,
  `CancelTournamentUseCase`, `ResolveStaleMatchUseCase`, `RegisterForTournamentUseCase`,
  `WithdrawFromTournamentUseCase`, `InviteToTournamentUseCase`, `GetTournamentUseCase`,
  `ListTournamentsUseCase`, `ListMyTournamentsUseCase`, `GetTrophyCabinetUseCase`,
  `IssueMatchTicketUseCase`, `RecordMatchResultUseCase`, `RecordMatchProgressUseCase`,
  `ExportTournamentDataUseCase`, `PurgeTournamentDataUseCase`. Create, register and invite need an
  account; the username names the player on tables and standings.
- **Invites.** The host invites up to `MAX_INVITES_PER_REQUEST` players. Each recipient's invite
  policy and blocks decide, as for game invites; refused recipients come back as `skipped` with
  `not_allowed`, so policies and blocks cannot be told apart.
- **View models** are in `tournament-views.ts`: `TournamentDetailView` (tournament, entrants,
  rounds with matches, standings, awards, `viewer`, `serverTime`), `TournamentViewerView` (what the
  viewer may do, `myMatch`, `resolvableMatchIds`), `TournamentListPage`, `MyTournamentsView`,
  `MatchTicketView`. A private tournament's `inviteCode` is only in the view of the host and the
  entrants.
- **Account deletion.** `PurgeTournamentDataUseCase` runs before the account row goes: it cancels
  hosted tournaments still in registration (entrants are not notified), clears the host's handle
  and replaces the host's name with "Former host" on every tournament they hosted. Running
  tournaments finish hostless. `ExportTournamentDataUseCase` adds tournaments, participations,
  trophies, entry snapshots and every stored per-table result to the account export.

## HTTP API

Session routes go through `tournamentRoute()` (`src/app/api/tournaments/tournament-route.ts`):
`accountRoute()` (database check, CSRF origin check, session, account and social error mapping),
`TournamentError` mapping, and a `503 unavailable` for any mutation while tournaments are
unavailable (no `TOURNAMENT_SECRET`). Public reads use `publicTournamentRoute()`: a database check
and an optional session. Reads stay open while tournaments are unavailable. Bodies are read bounded
(`readJsonObject`, `TOURNAMENT_INFRASTRUCTURE` in `tournament-config.ts`); an oversized or non-object
body is `invalid_input`.

| Method | Path | Auth | Use case | Body or query | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/tournaments?status=open\|live\|finished&cursor=&limit=` | public | `ListTournamentsUseCase` | | `TournamentListPage`, plus `recentChampions` on the first page |
| `POST` | `/api/tournaments` | session | `CreateTournamentUseCase` | draft and `joinAsEntrant` | `201 TournamentDetailView` |
| `GET` | `/api/tournaments/me` | session | `ListMyTournamentsUseCase` | | `MyTournamentsView` |
| `GET` | `/api/tournaments/[id]?code=` | optional session | `GetTournamentUseCase` | | `TournamentDetailView` |
| `PATCH` | `/api/tournaments/[id]` | session (host) | `UpdateTournamentUseCase` | partial draft | `TournamentDetailView` |
| `POST` | `/api/tournaments/[id]/start`, `/cancel` | session (host) | `StartTournamentUseCase`, `CancelTournamentUseCase` | | `TournamentDetailView` |
| `POST`, `DELETE` | `/api/tournaments/[id]/registration` | session | `RegisterForTournamentUseCase`, `WithdrawFromTournamentUseCase` | `{ inviteCode? }` | `TournamentDetailView` |
| `POST` | `/api/tournaments/[id]/ticket` | session | `IssueMatchTicketUseCase` | | `MatchTicketView` |
| `POST` | `/api/tournaments/[id]/matches/[matchId]/resolve` | session (host) | `ResolveStaleMatchUseCase` | | `TournamentDetailView` |
| `POST` | `/api/tournaments/[id]/invites` | session (host) | `InviteToTournamentUseCase` | `{ userIds }` | `InviteToTournamentResult` |
| `POST` | `/api/tournaments/match-results` | worker HMAC | `RecordMatchResultUseCase`, `RecordMatchProgressUseCase` (by `kind`) | result or progress report | `200 { outcome, tournamentStatus }` or `200 { outcome }` |

The public list is CDN cached briefly (`LIST_CACHE_CONTROL`); the detail and "my tournaments" are
`private, no-store`. A private tournament answers `404` to anyone without an entry, the host role
or the right `?code=`, like an unknown id.

### Error statuses

The body is `{ error: { code, message } }` with `Cache-Control: no-store`. `TournamentError` codes
map in `TOURNAMENT_ERROR_STATUS` (`tournament-http.ts`); `tournament-http.test.ts` pins each status
and fails when a code in `TOURNAMENT_ERROR_CODES` has none. Errors from the shared wrapper keep
their meaning ([accounts.md](accounts.md#http-api)).

| Code | Status | Code | Status |
| --- | --- | --- | --- |
| `invalid_input` | `422` | `already_registered` | `409` |
| `not_found` | `404` | `not_registered` | `409` |
| `forbidden` | `403` | `too_few_entrants` | `409` |
| `invalid_state` | `409` | `conflict` | `409` |
| `full` | `409` | `rate_limited` | `429` |
| `unavailable` | `503` | no session (`unauthenticated`) | `401` |

Clients branch on a few of these in `src/lib/tournament/tournament-errors.ts`: `401` is "sign in",
`503` or `unavailable` is "feature switched off" (`isTournamentsUnavailable`), `404` has its own
handling (`isNotFound`), and `rate_limited` and `conflict` have fixed copy
(`tournamentErrorMessage`). Other codes show the player-facing message.

### Match results endpoint

`POST /api/tournaments/match-results` is not a session route. It dispatches on the body's `kind`
(`matchReportKind`): none is a result, so workers that predate progress pings keep working,
`progress` is a ping, anything else is `400 unknown_kind`. The handler is
`handleMatchResultRequest` (`match-results/match-result-handler.ts`), unit tested with an injected
secret, clock and use cases. Its statuses are the producer contract, like telemetry ingest:

| Status | Meaning | Worker action |
| --- | --- | --- |
| `200` | recorded, duplicate, superseded or ignored (`{ outcome, tournamentStatus }`); progress `{ outcome }` | delivered |
| `400` | invalid JSON or unknown `kind` | never retried |
| `413` | body over `TOURNAMENT_WIRE_LIMITS.MAX_RESULT_BODY_BYTES` | never retried |
| `422` | `invalid_input`, `not_found`, `forbidden` or `invalid_state`: the report can never be recorded (the tournament or match is gone, or the roster does not match) | never retried |
| `401` | bad or stale signature | retried with backoff |
| `409`, `429` | `conflict`, `rate_limited` | retried |
| `503` | `TOURNAMENT_SECRET` unset, or storage unavailable | retried |

The worker side is `postForDelivery` (`party/utils/http-delivery.ts`): `2xx` delivered,
`400`, `413` and `422` rejected, anything else retried with exponential backoff.

## Wire formats

Ticket and result both use HMAC-SHA256 with the shared `TOURNAMENT_SECRET` over WebCrypto
(`shared/tournament/`). Each signs a different context string (`SIGNING_CONTEXT`), so a ticket
signature can never pass as a result signature.

### Match ticket

Server to browser to worker: `v1.<base64url(JSON(claims))>.<base64url(HMAC)>`, signed over the
ticket context plus the first two parts (`signMatchTicket`). Claims are `MatchTicketClaims`:

- `v`, `tid` (tournament id), `mid` (match id), `room` (always `matchRoomCode(mid)`);
- `uid` and `name`: the account the ticket was issued to and its seat name;
- `exp`: epoch ms, never beyond the match deadline;
- `match`: the descriptor, identical in every roster member's ticket: `round`, `table`, `roster`
  (`uid`, `name`, `seat` of each human), `bots`, `botDifficulty`, `rulesetConfig`, `label` and
  `deadlineAt`.

`verifyMatchTicket({ secret, ticket, now, roomCode })` checks the signature first, then the claims
(`parseMatchTicketClaims`: ids bound together, unique roster, valid names, a table size in range),
the room and the expiry. It answers `{ ok: true, claims }`, or `{ ok: false, reason }` with `reason`
one of `malformed`, `bad_signature`, `invalid_claims`, `wrong_room` or `expired`. An expired ticket
still carries its authentic claims, so the worker can let its holder take back a seat they hold.
The size limit is `TOURNAMENT_WIRE_LIMITS.MAX_TICKET_LENGTH`.

### Match result

Worker to server, `POST` to `TOURNAMENT_RESULT_URL` (unset: the worker offers no tournaments) with
`content-type: application/json` and the headers in `TOURNAMENT_RESULT_HEADERS`: a hex HMAC over
the result context, the timestamp and the body, and the timestamp (tolerance
`TOURNAMENT_WIRE_LIMITS.SIGNATURE_TOLERANCE_MS`). Build it with
`buildMatchResultRequest(secret, report, now)`; verify with `verifyMatchResultSignature`. The body is `MatchResultReport`:

- `v`, `tid`, `mid`, `room`, `gameId`, `completedAt`;
- `standings`: one entry per roster member (no bots), unique `uid`, each with `placement` among
  all seats (bots included; ties share a placement), `score`, `rounds` (`bid`, `tricksWon`,
  `roundScore`), `noShow` and `botTakeover`.

`rankMatchSeats` (domain) computes the placements. The route verifies the signature,
`parseMatchResultReport` the body, and the domain checks that the reported uids equal the human
seats of the stored match. The `200` answer's `outcome` tells the worker what happened
(`parseRecordResultOutcome`; absent or unknown reads as `recorded`), and the table shows it.

### Match progress

Same endpoint, headers and signature, sent when a match game starts, at every round end and as a
heartbeat during long rounds. `MatchProgressReport` carries `kind: 'progress'`, the ids, `gameId`,
`round` (the round in play: after round `r` ended it already names `r + 1`), `maxRounds` and `at`.
`parseMatchProgressReport` validates it. A server that does not know pings refuses them with a
`4xx`, and the worker drops refused pings.

### Rollout order

The web app deploys before the worker, and each side stays compatible with the other's previous
version: workers without pings send results without `kind` and read no answer; a worker reading an
answer without `outcome` counts the result as recorded; an app that predates progress pings refuses
them and the worker drops them; tickets without `deadlineAt` stay valid (no expiry check for those
tables). The compatibility checklist is the `protocol-change` skill.

## Game worker: match mode

Rooms whose code matches `isTournamentRoomCode` (`t-` plus 14 characters of
`TOURNAMENT_ID_ALPHABET`) are tournament rooms. Casual codes are shorter, so the namespaces never
overlap. `TournamentMatchController` (`party/tournament/tournament-match-controller.ts`) owns match
mode; `createTournamentMatchServices` wires it. The room-side hooks are in
[../server/room.md](../server/room.md) and the pipeline in
[../server/protocol.md](../server/protocol.md#tournament-match-rooms).

- **No secret, no tournaments.** Without `TOURNAMENT_SECRET` every join to a tournament room, and
  every ticketed join, fails with `TournamentsUnavailableError` (`TOURNAMENTS_UNAVAILABLE`).
- **Every join needs a ticket.** `JoinGameCommand.tournamentTicket` is verified with
  `verifyMatchTicket` against the room id; a failure is `TournamentTicketInvalidError` with the
  reason (`TOURNAMENT_TICKET_INVALID`), a missing ticket is `TournamentTicketRequiredError`
  (`TOURNAMENT_TICKET_REQUIRED`). Player ids are visible to the whole table, so a persistent id
  alone never takes a seat. An expired ticket still lets its account take back a seat it already
  holds, but seats nobody new and never locks the room.
- **The first valid ticket locks the room** to its match, persisted under
  `TOURNAMENT_MATCH_STORAGE_KEY` in Durable Object storage. Later tickets must be `isSameMatch`.
  The lock applies the descriptor: not public, max players is roster plus bots, the ruleset, and the
  label as the room name.
- **Seats by account.** A player is seated by `claims.uid` under `claims.name`; the client's name
  is ignored. A second join of the same uid takes over the same seat. A member arriving after the
  match started without them gets `TOURNAMENT_NO_SHOW`, which the client treats as final.
- **Locked commands.** The commands in `LOCKED_COMMANDS` (`match-command-gate.ts`: settings, rules,
  bots, kicks, host transfer, manual start, rematch) answer `TournamentMatchLockedError`
  (`TOURNAMENT_MATCH_LOCKED`). Frames a socket sends while its ticket is verified are held (up to
  `TOURNAMENT_ROOM_LIMITS.MAX_HELD_MESSAGES_PER_JOIN`) and run once the join settled.
- **Start.** When every roster member is seated, the match starts after
  `AUTO_START_COUNTDOWN_MS`; at the latest `NO_SHOW_GRACE_MS` after the first join, absent members
  become no-shows. At the start, a member still inside a reconnect grace is taken over by a bot
  (they may come back); an absent member, or one remembered without a connection or grace, is a
  no-show whose seat a bot plays; the descriptor's extra bots join at `botDifficulty`. A table
  where nobody is seated forfeits (`buildForfeitReport`). The match counts as started only once
  `startGame` succeeded; a failed start or round advance retries after
  `FAILED_ALARM_RETRY_MS`. A table never starts at or after `deadlineAt`: the record gets
  `expiredAt`, the worker logs `tournament_match_expired` and nothing is reported.
- **During the game** the normal grace period and bot takeover apply, and taken-over seats are
  marked `botTakeover`. A finished round moves on by itself after `ROUND_END_AUTO_ADVANCE_MS`
  (sooner without a present host). Timings are in `party/tournament/match-room.constants.ts`.
- **Progress.** On start, at every round end and, while a round is in play, on the first change at
  least `MATCH_PROGRESS_HEARTBEAT_MS` after the last ping, the controller hands a progress report to
  the outbox, never once the result was handed over or after the deadline. The heartbeat is paced
  from the first change a restarted instance sees, so a restored room claims no activity; a table
  where nothing moves goes quiet and becomes resolvable.
- **Result outbox.** At game end the controller builds the report and appends it to a durable
  outbox in the same turn (`MatchResultOutbox`, prefixes in `MATCH_RESULT_OUTBOX`). Delivery is
  at least once with backoff (`deliveryBackoffMs`). The outbox keeps at most one ping per match,
  sends pings only while no result waits, drops refused pings, and parks refused results under
  the dead-letter prefix. The server's answer goes to the controller
  (`onResultDelivered`), which stores it as `reportOutcome` and rebroadcasts the state; a
  dead-lettered result reads as `rejected`. The listener hears about a result before it leaves the
  outbox, so the record write and the delete land in one storage batch.
- **Room state.** `TournamentMatchRoomState` (label, round, table, roster names with
  `joined` and `noShow`, `bots`, `autoStartAt`, `noShowDeadlineAt`, `reported`, `reportOutcome`,
  `deadlineAt`, `expired`) is the top-level `tournamentMatch` field of every `GAME_STATE` message,
  beside `state`. It never contains account ids.
- **Public room info** (`GET /parties/main/<room>`) reports a tournament room as not available and
  exposes only its label.

## Browser flow

- **Pages.** `/tournaments` lists (Open, Live and Finished tabs, recent champions),
  `/tournaments/new` creates, `/tournaments/[id]/edit` edits (host, registration only), and
  `/tournaments/[id]` shows the detail, polling `GET /api/tournaments/[id]` every
  `TOURNAMENT_UI.POLL_INTERVAL_MS` (`TOURNAMENT_TIMING.POLL_INTERVAL_MS`) while the tab is visible
  and the tournament is not completed or cancelled (`useTournament.ts`, the pattern of
  `useRoomOccupancy`). Private links carry `?code=<inviteCode>`. Page views come from the
  `src/presentation/components/tournament` barrel; the rounds view per format is picked from
  `ROUNDS_VIEWS` in `TournamentPageView.tsx`, a `Record` keyed by format, so a new format does not
  compile without one. Availability comes from `useTournamentAvailability()` (the `tournaments`
  capability).
- **Joining a table.** `joinTable` (`useTournamentActions.ts`) calls
  `POST /api/tournaments/[id]/ticket`, stores `{ ticket, tournamentId, expiresAt }` in
  `sessionStorage` under `tournamentTicketStorageKey(roomCode)` (`match-ticket-storage.ts`), leaves
  any other room the connection is in and navigates to `/lobby/<roomCode>`, where a signed-in
  player joins automatically. The connection sends the ticket as `tournamentTicket` with
  `JOIN_GAME`, on every reconnect while it is stored, and also after it expired.
- **Inbox "Join".** `/tournaments/[id]?join=1` fetches the ticket and opens the table at once when
  the viewer has a pending match, then drops the parameter. Accepting "Join" while in another room
  asks first during a running game.
- **Seat state.** Tournament seat state lives in `TableFeeds`
  (`src/presentation/hooks/connection/table-feeds.ts`), the one external store of the game client
  (see [../client/connection.md](../client/connection.md#table-feeds)). Its `tournament` handler
  group holds `tournamentMatch`, which `tournament-match.ts` validates and moves onto the device
  clock, and `tournamentRejection`, the worker's lasting refusal of a seat
  (`TOURNAMENT_TICKET_REQUIRED`, `TOURNAMENT_TICKET_INVALID`, `TOURNAMENT_NO_SHOW`,
  `TOURNAMENTS_UNAVAILABLE`; `tournament-join.ts`). `useTournamentSeat` is a
  `useSyncExternalStore` view of those two fields, and `TournamentTableProvider` exposes them as
  `useTournamentTable()` so the lobby, HUD and results read them without joining the game context.
  A refusal that makes the stored ticket useless clears it, so it is not resent on every visit;
  `TournamentJoinGate` shows it with a link back to the tournament, which carries `?join=1` for a
  fresh ticket where a new ticket can help (`rejectionCopy`).
- **In game** (`components/tournament/in-game/`): a match banner with the deadline, a waiting
  roster with the start or no-show countdown (`matchLobbyPhase`) and no host controls, invites or
  room code, a badge under the round bar, and after the game a notice whether the result reached
  the tournament (`resultStatus`: counted, voided before it arrived, or rejected) with "Back to
  tournament" instead of Play Again.
- **Tournament page tables.** A table the worker reported shows its round
  (`matchStatusPresentation`); for the host of a running tournament (`managesTables`) an overdue
  table that is still active explains why it cannot be resolved yet (`resolveBlockedReason`).
- Friends see a player at a tournament table as "in a game", never as a joinable lobby.

## Persistence

`db/migrations/0108_tournaments.sql` creates `tournaments` (with `version`, `settings` as jsonb, a
snapshot of the host's names, and `host_user_id` with `ON DELETE SET NULL`), `tournament_entrants`
(a name and level snapshot, `final_*` columns for `EntrantFinal`), `tournament_matches` (`seats` as
jsonb, deterministic id, unique `room_code`), `tournament_match_results` and `tournament_awards`
(both reference the entry, so they go with it). Partial indexes serve the three public lists,
hosting limits and scheduled starts, and further indexes serve per-user lists, champions and the
trophy cabinet. Entrants, results and awards
cascade from `auth_users`. `0109_tournament_match_activity.sql` adds the nullable live state to
`tournament_matches` (`last_activity_at`, `live_round`, `live_max_rounds`: all or none).

`PostgresTournamentRepository` loads an aggregate in one snapshot transaction and saves it in one
transaction whose first statement checks the version and fails the transaction on a mismatch (a
division by zero, SQLSTATE `22012`), which the repository answers as `conflict`. It then upserts
changed entrants (and deletes withdrawn ones), new and changed matches (including live state) and
inserts results and awards once. A progress ping is an ordinary aggregate save: it bumps
`version` and updates the `tournaments` row, so a ping that loses the race retries like a result
and never delays one. Lists sort by `(sortAt DESC, id DESC)` over public tournaments only.

## Achievements, XP and trophies

- `AchievementContext.tournaments` carries `TournamentParticipation` rows (from
  `ITournamentHistoryReader.participations`), and `ProgressCalculator` adds `tournamentAwardXp` to
  the total XP.
- After a tournament completes, `IProgressRefresher.refresh(userIds)` recomputes progress so
  tournament achievements unlock without the tournament code knowing account internals. The
  container wraps it: `DeferredProgressRefresher` (after the response) around
  `ProfileCacheProgressRefresher`, which then purges the participants' cached `/u/<username>`
  pages.
- The tournament achievements are `TOURNAMENT_ACHIEVEMENTS` in
  `shared/domain/account/achievements.ts`.
- The trophy cabinet on `/account` is the `trophies` of `GET /api/tournaments/me`
  (`ITournamentHistoryReader.trophies`; `GetTrophyCabinetUseCase` reads the same for any account).
  `/u/<username>` takes its trophies and tier counts from `tournament_awards` in
  `PostgresPublicProfileReader`; `buildPublicProfile()` lists them explicitly and hides the name and
  link of a private tournament.

## Inbox kinds

Registered in `INBOX_KINDS` (`shared/domain/social/inbox.ts`) with validated payloads. Tournament
items have no actor except invites, and their dedupe key comes from the payload
(`<kind>:<tournamentId>`), so `InboxNotifier.deliver` and `withdraw` take the payload.

| Kind | Payload | Actions | Lifetime | Dedupe |
| --- | --- | --- | --- | --- |
| `tournament_table_ready` | `tournamentId`, `name`, `matchId`, `round`, `roundLabel` | `accept` (Join) opens `/tournaments/<id>?join=1` | `MATCH_HARD_TIMEOUT_MS` | one per tournament; the next round replaces it |
| `tournament_finished` | `tournamentId`, `name`, `rank`, `entrants`, `awards` | none | none | one per tournament |
| `tournament_invite` | `tournamentId`, `name`, `inviteCode` | `accept` (Register, with the code), `decline` | `INVITE_TTL_MS` | one per tournament |

`tournamentInboxHandlers` (`tournament-inbox-handlers.ts`) answers the actions; the social
composition root merges it with the friends handlers.

## Configuration

Env vars, secrets and their defaults for tournaments (`TOURNAMENT_SECRET`, `TOURNAMENT_RESULT_URL`)
are in [../operations/configuration.md](../operations/configuration.md).

The `tournaments` capability (`DeploymentCapabilities` in
`src/infrastructure/auth/auth-capabilities.ts`) is true only when the secret and the database are
configured (`isTournamentsAvailable()`), and `GET /api/account/capabilities` reports it; the UI shows
an unavailable state otherwise. The app and the worker must hold the same secret: the app issues no
tickets and the worker refuses tickets without it, and both trim surrounding whitespace. Rotating
the secret invalidates outstanding tickets (players fetch new ones), and the worker keeps
undelivered results in its outbox, retrying with backoff (the app answers `401`), until both sides
match again. A preview app needs its own worker environment
with `TOURNAMENT_RESULT_URL` pointing at the preview's `/api/tournaments/match-results`; otherwise
results go to another deployment and are refused there.

## Privacy

Stored per entrant: the username snapshot (as written and lowercase), level at registration,
results (scores, bids) and awards. Public tournament pages show names, standings and awards of
entrants; private ones only to holders of the code. Match-room game state never carries account
ids; the tournament views and the ticket, whose roster the worker binds seats and results by, carry
the opaque ids. Seat lists of past matches keep the opaque id of a deleted account, with no name
stored beside it. Deletion and export are described under Application layer.

## Adding things

- **Format.** Implement `ITournamentFormat` in `shared/domain/tournament/formats/`, add its id to
  `TOURNAMENT_FORMAT_IDS` (`tournament.types.ts`) and an entry to `TOURNAMENT_FORMATS`
  (`formats/index.ts`); the `format` check constraint in SQL needs a migration; the create form
  needs a label and `ROUNDS_VIEWS` a rounds view.
- **Award.** Append to `TOURNAMENT_AWARDS` (a pure `recipients(outcome)`) and map its icon in
  `TournamentTrophyIcon.tsx`. Extend the `award_id` and `tier` checks only for a new tier.
- **Tournament notification.** Add the payload and an `INBOX_KINDS` entry, a renderer, a handler in
  `tournamentInboxHandlers` if it has actions, and deliver it from `TournamentEffects`.
- **Error code.** Add it to `TOURNAMENT_ERROR_CODES` and a status to `TOURNAMENT_ERROR_STATUS`;
  `tournament-http.test.ts` fails until its status list has the code. Add the row to the table
  above.
- **Wire field.** Change the parser in `shared/tournament/`, then follow the rollout order above:
  the app must accept the old shape before the worker sends the new one.

## Tests

| Contract | Suite |
| --- | --- |
| State machine, formats, seating, awards, standings, ids, validation | `shared/domain/tournament/*.test.ts` and `formats/formats.test.ts` |
| Use cases with in-memory fakes | `shared/application/use-cases/tournament/tournament-use-cases.test.ts` |
| Ticket, result and progress codecs | `shared/tournament/tournament-wire.test.ts` |
| Repository, rows, throttle, signer, refreshers | `src/infrastructure/tournament/*.test.ts` |
| Route wrappers, error statuses, results handler | `src/app/api/tournaments/*.test.ts`, `match-results/match-result-handler.test.ts` |
| Worker match mode: lock, seats, start, outbox, room view | `party/tournament/*.test.ts` |
| Ticket storage and error copy | `src/lib/tournament/*.test.ts` |
| Server and worker together: ticket, play, report | `test/integration/tournament.integration.test.ts` |

Test boundaries and what each level costs are in [../testing/testing.md](../testing/testing.md).
