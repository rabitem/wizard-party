# Friends, presence, invites and inbox

Signed-in players can add friends, see who is online and what they are doing, invite players to
their table, join a friend's lobby, search public profiles and receive every notification in one
generic inbox. Invites and friend requests that arrive while a player is offline can also go out
by email. Guests are unaffected. Read this before you touch `shared/domain/social/`, the social
routes, presence or the inbox. Accounts, usernames and the shared route wrapper are in
[accounts.md](accounts.md); tournament inbox items are in [tournaments.md](tournaments.md).

## How it works

```
shared/domain/social/              pure rules, unit tested: presence and modes, relationships and the
                                   friend request policy, privacy settings, inbox kinds, game invite
                                   states, email categories, limits and throttle budgets
shared/application/ports/social/   ISocialGraphRepository, IPlayerDirectory, IInboxRepository,
                                   IPresenceStore, IRoomRosterStore, IRoomMembershipVerifier,
                                   ISocialThrottle, ISocialMailer (index.ts)
shared/application/use-cases/friends/
                                   friend requests, friends and blocks, game invites, presence
                                   (SocialPulseUseCase, GetRoomAccountsUseCase), search and settings,
                                   email notifications, the export
shared/application/use-cases/inbox/
                                   InboxNotifier, list, read and dismiss, PerformInboxActionUseCase,
                                   PruneSocialDataUseCase
src/infrastructure/social/         Postgres graph, directory and inbox; Redis presence, seat roster
                                   and throttle; the room membership verifier; the mailer;
                                   social-container.ts (the composition root)
src/app/api/social/**, src/app/api/inbox/**
                                   route handlers via accountRoute()
src/app/api/email/unsubscribe/     one-click unsubscribe
src/lib/social/social-api.ts       typed browser client
src/presentation/providers/SocialProvider.tsx
                                   heartbeat, friends, inbox feed, toasts, panel state
src/presentation/hooks/social/     useSocialPulse, useInboxFeed, useCurrentActivity, useRoomAccounts,
                                   useRoomOccupancy, useSentInvites, useJoinRoom
src/presentation/components/friends/
                                   panel, rows, inbox, search, avatars, settings
```

Limits and per-user budgets are `SOCIAL_LIMITS` and `SOCIAL_RATE_LIMITS`; heartbeat timing is
`PRESENCE_TIMING` (all in `shared/domain/social/social.constants.ts`).

## Contracts

### Presence

- **A heartbeat, not a table.** `POST /api/social/pulse` (`SocialPulseUseCase`) publishes the
  player's presence and answers with every friend's presence, the inbox summary, the accepted room
  and the next beat. Visible tabs beat at `VISIBLE_HEARTBEAT_MS`; hidden tabs report `idle` at
  `HIDDEN_HEARTBEAT_MS`; failures back off exponentially (`useSocialPulse.ts`). A heartbeat is one
  Redis key per player with a TTL (`presence:v1:<userId>`), so offline means "no key". A pulse reads
  settings, friend ids and the inbox summary from Postgres and writes nothing there.
  `RedisPresenceStore` fails soft: without Redis everyone looks offline.
- **Modes.** `PRESENCE_MODES` are online, away, busy (no toasts, the inbox still fills) and
  invisible (looks offline, plays normally and is kept off the seat roster). A friend sees a room
  code only while that friend waits in a lobby (`joinableRoomCode`). A tournament table counts as
  "in a game" and is never joinable (`useCurrentActivity.ts`).
- **Rooms are attested by the game worker.** The client reports its activity and the seat proof it
  holds for that room (the seat's session token, or the legacy persistent id; see
  [../server/protocol.md](../server/protocol.md)). The server never trusts the room:
  `PartyRoomMembershipVerifier` sends the proof in the `x-seat-proof` header (`SEAT_PROOF_HEADER`)
  to the room's Durable Object (`GET /parties/main/<room>`, server to server) and accepts the room
  only for the seat the worker names. The answer is cached for `SEAT_ATTESTATION_TTL_SECONDS`
  (`seat-attested:v1:<room>:<user>`); attestations are throttled (`seat_attestation`) and fail
  closed, so an unattested player counts as being in the menus. The worker host is
  `serverRealtimeHost()` (`REALTIME_HOST`, else the build's realtime host).
- **Everything that trusts "the viewer is in room X" rests on that.** Invites
  (`requireViewerInRoom`), the seat roster (`room-roster:v2:<room>`: seat to account, each seat
  with its own expiry, first claim wins, one Lua script) and
  `GET /api/social/rooms/[roomCode]/accounts` answer only for an attested seat, so rosters cannot
  be scraped and seats cannot be squatted. In-game "add friend" names the account it targets.

### Friends and blocks

- **Directed edges.** A friendship is two rows of `friendships(user_id, friend_id)`, so per-viewer
  state such as pins needs no extra table and "my friends" is a primary-key range scan. Accepting a
  request is one statement that consumes the request and inserts both edges; blocking is one
  transaction.
- **Request policy.** `decideFriendRequest` (`relationship.ts`) is the whole rule: self, blocks,
  friend caps, pending cap, a decline cooldown and the target's policy. A block by the target and a
  disabled request policy answer alike (`unavailable`), so the sender cannot tell which applies.
  A request to someone who already asked the sender accepts theirs.
- **Declines are silent.** The sender keeps seeing "Requested" and can renew only after
  `DECLINED_REQUEST_COOLDOWN_MS`; renewing reuses its slot.
- **Blocks** delete the friendship and the blocker's own request, and turn the blocked player's
  pending request into a silent decline. Open friend requests and game invites from the blocked
  player leave the blocker's inbox. A blocked player cannot find the blocker in search or by
  handle (`findManyForViewer`).
- **Search** returns an exact handle even for a private profile (so friends can add each other by
  name), and prefix and substring matches for public profiles only. Every search long enough to run
  (`SEARCH_MIN_LENGTH`) and every friend request attempt, failed lookups included, counts against
  the `search` and `friend_request` budgets, so neither endpoint can probe handles.
- **Public profile search** (`GET /api/profiles/search`, the start page's player lookup) needs no
  account. It returns public profiles only, with no exact-handle exception, as `PublicPlayerCard`
  (handle, display name, avatar, level: no ids, relationships or presence). It is rate-limited per
  client address (`public_profile_search`; the throttle stores only a keyed hash of the address)
  and answers an empty list when accounts are not configured.
- **Privacy settings** live on `player_profiles` (`invite_policy`, `friend_request_policy`,
  `presence_mode`, `email_game_invites`, `email_friend_requests`) and default through the
  `social_players` view for profiles that were never created. That view is also the whitelist of
  what any social read exposes: never the email or anything private.

### Invites

- **One live invite per sender and recipient.** A new room replaces the old invite
  (`dedupeKey`); re-inviting the same player is throttled per pair. The recipient's `invite_policy`
  decides who may invite; a block answers like `nobody`. A sender can list and revoke open invites
  (`GET /api/social/invites?room=`, `DELETE /api/social/invites/[id]`); an answered or expired one
  answers `409`.
- **Live seat count.** An actionable invite shows the room's `players/max` and whether it is full
  or in game. `useRoomOccupancy` polls the worker's public room info (`GET /parties/main/<room>`)
  every `POLL_MS` while the invite is shown and the tab is visible.

### Inbox

- **One generic table.** `inbox_items` stores `kind`, a JSON `payload`, `dedupe_key` (a repeat
  replaces the older item), `expires_at`, `read_at` and `resolved_at` with `resolution`. The
  registry `INBOX_KINDS` (`shared/domain/social/inbox.ts`) holds each kind's payload parser, actions,
  lifetime and dedupe rule. An unknown or invalid stored payload is skipped, so a rollback never
  breaks the inbox.
- **Kinds.** `friend_request`, `friend_accepted`, `game_invite`, and the tournament kinds
  `tournament_table_ready`, `tournament_finished` and `tournament_invite`
  ([tournaments.md](tournaments.md#inbox-kinds)).
- **Delivery and actions.** Features deliver through `InboxNotifier.deliver`, which applies the
  dedupe key and expiry, and close items with `withdraw`. `PerformInboxActionUseCase` checks state
  and expiry, runs the kind's handler (`friendsInboxHandlers`, `tournamentInboxHandlers`, merged in
  `social-container.ts`) and resolves the item; a handler that finds its target gone closes the
  item as `cancelled`.
- **Retention.** The daily cron `GET /api/cron/telemetry-retention` (`vercel.json`; authorised by
  `CRON_SECRET`) runs `PruneSocialDataUseCase` as its `social` step: inbox items older than
  `INBOX_RETENTION_DAYS` and declined requests past their cooldown. The cron's steps run
  independently, so one failing step does not skip the others.

### Email

- **A second channel for selected kinds.** `EMAIL_CATEGORIES` are `game_invites` and
  `friend_requests`. `EmailNotificationGate` applies the shared rules in
  `EMAIL_CATEGORY_DEFINITIONS`: the recipient's opt-out setting, the recipient is offline, the
  address is usable, then the category's budgets in order, short-circuited so a refused narrow
  budget spends no wider one.
- **Unverified addresses.** Many accounts have an address that was never checked, and it may
  belong to someone else. Each category either skips such an address or mails it within an extra
  tight per-recipient budget (`invite_email_unverified`, `friend_request_email_unverified`) with a
  "did not sign up? ignore this" note.
- **Invite mails go only for friends' invites.** A stranger's invite stays in the inbox
  (`NotifyGameInviteByEmailUseCase`). Friend request mails go to offline players within per-sender
  and per-recipient budgets.
- **Never in the request path.** Both mails are sent after the response (`inBackground` in
  `social-container.ts`, over `after()`); outcomes and failures are logged, never thrown.
- **Rendering.** `EmailSocialMailer` builds the mail from `social-email-templates.ts` in
  `src/infrastructure/email/`. The two players' characters (their portrait sprites, see
  [../client/characters.md](../client/characters.md#portrait-sprites)) in their level frames are
  rendered server side with `next/og` (`player-pair-card.tsx`) into one PNG attached inline
  (`cid:`), because Gmail strips `data:` URIs. A friend request mail links to
  `/?social=inbox`, which opens the panel's inbox (`useSocialDeepLink`).
- **Unsubscribe.** Every social mail has `List-Unsubscribe` and the one-click `List-Unsubscribe-Post`
  header (RFC 8058) with a stateless HMAC token
  (`src/infrastructure/email/email-unsubscribe.ts`; the key is `EMAIL_UNSUBSCRIBE_SECRET`, else
  derived from `BETTER_AUTH_SECRET`). `GET /api/email/unsubscribe` only redirects to a confirmation
  page; the change is the `POST`.

## HTTP API

Handlers go through `accountRoute()`; statuses and the error body are in
[accounts.md](accounts.md#http-api). `SocialError` codes map to `422 invalid_input`,
`404 not_found`, `403 forbidden`, `409 conflict` and `limit_reached`, and `429 rate_limited`
(`SOCIAL_STATUS` in `account-route.ts`).

| Route | Purpose |
| --- | --- |
| `POST /api/social/pulse` | heartbeat: `{ activity, idle, seatProof }` |
| `GET`, `POST /api/social/friends` | friends with presence and requests; send a request by `username` or `userId` |
| `DELETE /api/social/friends/[userId]`, `PUT`, `DELETE /api/social/friends/[userId]/pin` | remove a friend; pin or unpin |
| `PUT`, `DELETE /api/social/requests/[userId]` | answer a request `{ accept }`; withdraw an own request |
| `GET /api/social/blocks`, `PUT`, `DELETE /api/social/blocks/[userId]` | block list; block or unblock |
| `GET`, `POST /api/social/invites`, `DELETE /api/social/invites/[id]` | sent invites of a room; invite `{ userId, roomCode }`; revoke |
| `GET /api/social/search?q=`, `GET /api/social/players/[username]` | search; one player with the viewer's relationship |
| `GET /api/profiles/search?q=` | public profiles by name, no account needed (start page) |
| `GET /api/social/rooms/[roomCode]/accounts` | accounts at the viewer's attested table |
| `GET`, `PATCH /api/social/settings` | invite and request policies, presence mode, email opt-outs |
| `GET /api/inbox`, `POST /api/inbox/read`, `POST /api/inbox/[id]/actions`, `DELETE /api/inbox/[id]` | page, mark read, `{ action: 'accept' \| 'decline' }`, dismiss |
| `GET`, `POST /api/email/unsubscribe` | confirmation redirect; token-authorised opt-out (no session) |

## Configuration

Env vars, secrets and their defaults for social features are in
[../operations/configuration.md](../operations/configuration.md).

## Adding things

- **Inbox kind.** Add the payload to `InboxPayloads` and a definition to `INBOX_KINDS`
  (`shared/domain/social/inbox.ts`); both are typed, so the compiler lists what is missing. Add a
  renderer to `INBOX_RENDERERS` (`src/presentation/components/friends/inbox-renderers.tsx`) and, if
  the kind has actions, a handler passed to `PerformInboxActionUseCase` in `social-container.ts`.
  Deliver it with `InboxNotifier.deliver`.
- **Emailed kind.** Add a category to `EMAIL_CATEGORIES` and `EMAIL_CATEGORY_DEFINITIONS`, a
  setting column and `SocialSettings` field, budgets in `SOCIAL_RATE_LIMITS`, a template in
  `social-email-templates.ts`, a method on `ISocialMailer` and a notify use case.
- **Social setting.** A column on `player_profiles` and in the `social_players` view (a new
  migration that recreates the view with the column appended), then `SocialSettings`,
  `DEFAULT_SOCIAL_SETTINGS`, `parseSocialSettingsChanges` and the settings panel.
- **"Add friend" entry point.** Render `<SeatFriendAction gamePlayerId={...} />` for a seat at the
  current table or `<RelationshipButton player={...} relationship={...} />` anywhere else.
- **Budget or limit.** Add the key to `SOCIAL_RATE_LIMITS` (the throttle action type follows) and
  call `ISocialThrottle.allow` from the use case.

## Tests

| Contract | Suite |
| --- | --- |
| Presence, relationships, inbox kinds, privacy, email categories | `shared/domain/social/social-domain.test.ts` |
| Friend, block, invite, pulse and search use cases against in-memory ports | `shared/application/use-cases/friends/*.test.ts` |
| Inbox delivery and dedupe | `shared/application/use-cases/inbox/inbox-notifier.test.ts` |
| Mail templates, sender, pair card | `src/infrastructure/email/*.test.ts` |
| Unsubscribe route | `src/app/api/email/unsubscribe/route.test.ts` |
| Inbox renderers cover every kind | `src/presentation/components/friends/inbox-renderers.test.ts` |
| Live seat count parsing | `src/presentation/hooks/social/useRoomOccupancy.test.ts` |
| Route wrapper statuses | `src/app/api/account/account-route.test.ts` |

Test boundaries and what each level costs are in [../testing/testing.md](../testing/testing.md).
