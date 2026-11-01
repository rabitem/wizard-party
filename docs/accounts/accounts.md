# Accounts and progress

Optional player accounts: sign-in, one name per account, game results, XP, levels and rewards,
achievements, game history with pinned games, synced settings and custom sounds, public profiles
at `/u/<username>`, and the public leaderboard. Playing as a guest needs no account; a guest's
stats stay in the browser. Read this before you touch `src/infrastructure/auth/`, the account
routes, the progress calculation or the account tables. Friends, presence, invites and the inbox
are in [social.md](social.md); tournaments, which feed XP, achievements and trophies, are in
[tournaments.md](tournaments.md).

## How it works

```
shared/domain/account/             pure rules, unit tested: GameResult validation, stats aggregation,
                                   XP and levels, level rewards, achievements, usernames, profile
                                   validation, buildPublicProfile, leaderboard, community stats
shared/application/ports/account/  segregated ports: results, progress, profiles, documents, custom
                                   sounds and audio blobs in index.ts; public profile, leaderboard,
                                   community stats and tournament participations, one file each
shared/application/use-cases/account/
                                   one file per feature: game results and guest import, history and
                                   pins, profile, public profile, documents, custom sounds, export and
                                   purge, leaderboard, community stats, ProgressCalculator
src/infrastructure/account/        Postgres and Vercel Blob adapters, account-container.ts (the
                                   composition root), public-profile-cache.ts
src/infrastructure/auth/           Better Auth options, plugins, hooks, sign-in guards, provider
                                   registry, capabilities, rate-limit storage
src/infrastructure/email/          IEmailSender adapters and templates
src/infrastructure/stats/          global totals: completed-game reader, Redis store
src/app/api/account/**             route handlers, each one line over a use case via accountRoute()
src/app/api/auth/[...all]/         Better Auth handler
src/lib/account/                   browser services: account-api.ts (typed client), auth-client.ts,
                                   game-result-sink.ts, game-result-outbox.ts, guest-progress.ts,
                                   settings-sync-engine.ts, custom-sound-sync.ts
src/presentation/                  providers/AccountProvider.tsx, hooks/account/useAccountSync.ts,
                                   components/account/
src/app/                           pages: sign-in, account, u/[username]
```

Dependencies point inward. Use cases see only ports, so a new adapter is one class plus a line in
`account-container.ts`.

| Concern | Choice | Where |
| --- | --- | --- |
| Auth | Better Auth, mounted at `/api/auth/*` | `src/infrastructure/auth/auth-options.ts` |
| Database | Postgres. Repositories use Neon's HTTP driver, Better Auth a pooled `pg` connection | `src/infrastructure/db/neon.ts`, `pg-pool.ts` |
| Audio files | Vercel Blob | `src/infrastructure/account/vercel-blob-audio-storage.ts` |
| Rate limits, presence, global totals | Upstash Redis | `src/lib/redis.ts`, `src/infrastructure/rate-limit/` |
| Email | Resend over HTTPS; a logging sender when no key is set | `src/infrastructure/email/email-sender.ts` |

Without `DATABASE_URL`, every `accountRoute()` answers `503 unavailable`. Without Redis or a mail
key the dependent feature is skipped or reduced; `.env.example` says which.

## Contracts

### Sign-in and email

- **Methods.** Email or username with a password, Google, Discord and GitHub, TOTP two-factor with
  backup codes, passkeys, and a breached-password check. The plugin list is in `auth-options.ts`;
  `nextCookies()` stays last and `signInGuards()` stays before `twoFactor()`.
- **Providers by configuration.** A provider is offered when both of its env vars exist
  (`PROVIDERS` in `social-providers.ts`). `GET /api/account/capabilities` reports the offered
  providers, whether mail can be delivered and `passkeys`, plus `tournaments` (see
  [tournaments.md](tournaments.md#configuration)). The type is `DeploymentCapabilities`
  (`auth-capabilities.ts`).
- **Email codes.** The `emailOTP` plugin replaces verification links with 6-digit codes and drives
  forgot-password. Length, lifetime and attempts are in `EMAIL_CODE` (`identity-plugins.ts`);
  codes are stored hashed. Passwordless `/sign-in/email-otp` and the email-change endpoints are
  disabled (`DISABLED_AUTH_PATHS` in `sign-in-guards.ts`), so a code can neither skip two-factor
  nor create an account without a username. After a code verifies an email, the client signs in
  again with the password.
- **Verification is per account.** Better Auth's global `requireEmailVerification` stays off. An
  account created while mail can be delivered gets `auth_users."emailVerificationRequired"` = true
  (create hook in `auth-options.ts`). After a correct password, `signInGuards()` revokes the
  session of such an account while its email is unconfirmed and answers `EMAIL_NOT_VERIFIED` with
  the email, for username sign-in too. Accounts without the flag sign in as before. Without a mail
  key nobody is asked to verify and the code flows are hidden.
- **Sign-up reveals nothing.** With mail, sign-up does not sign in (`autoSignIn: false`) and
  answers alike for a new and a taken email; the owner of a taken email gets a notice without a
  code (`onExistingUserSignUp`). `/email-otp/verify-email` accepts a caller only with a session of
  that account or, for an account with a password, that password (`signInGuards()`), so a squatter
  who registered someone else's address first cannot get it confirmed. The real owner resets the
  password by code instead.
- **Rate limits.** Per-IP budgets for the endpoints that send mail or check secrets are
  `AUTH_RATE_LIMIT_RULES` in `auth-options.ts`. They apply in production builds; storage is Redis
  when configured (`upstash-rate-limit-storage.ts`).
- **Deletion.** `user.deleteUser` is enabled, with a confirmation mail when mail can be delivered.
  Before the row goes, `purgeExternalData` (`auth.ts`) cancels the tournaments the account hosts
  and deletes its custom sound blobs; every other table cascades from `auth_users`.

### One name per account

- The username is the only name: sign-in, table name, friends, search and `/u/<username>`. Better
  Auth's `username` plugin stores it in `auth_users."username"` (unique, lowercase; rules in
  `USERNAME_RULES`, `shared/domain/account/username.ts`) and the typed casing in
  `"displayUsername"`. Both are `NOT NULL`.
- `username-hooks.ts` keeps the invariant. Provider sign-ups get a name derived from the provider
  name, never from the email, with a random numeric suffix when it is taken. Better Auth's
  required `name` always mirrors the username. A rename is allowed once per
  `CHANGE_COOLDOWN_MS` and the first rename is free; casing edits are free. The casing must spell
  the stored name.
- **Avatar.** Choosing one comes with an account: only the Profile tab sets the `avatar` field of
  the synced `game-settings` document. A guest gets one picked from the browser's player id
  (`guestAvatarId`, read through `useAvatarId`) and a guest badge on their own lobby seat. Other
  seats never show the badge: a seat without account data may also be a blocked or hidden account.
- A signed-in player always sits under their username (`usePlayerName`).
  `GET /api/username/check` also refuses a registered account's name to guests.

### Results, progress and stats

- **Results are client reported.** A finished game is a `GameResult` (`game-result.ts`) with a
  client generated `clientGameId`. `validateGameResult` checks shape and plausibility (limits in
  `ACCOUNT_LIMITS`), not honesty. Recording is idempotent per `clientGameId`.
- **One sink for the game code.** `useGameEffects` calls `recordFinishedGame()`
  (`src/lib/account/game-result-sink.ts`), which forwards to the active `GameResultSink`. Guests
  write local stats. While signed in, `useAccountSync` installs a `GameResultOutbox`: a per-user
  localStorage queue that delivers in batches with retries and drops a batch the server answers
  with `422`. Signing out restores the guest sink.
- **Progress is derived.** `ProgressCalculator.compute` aggregates the guest baseline and every
  stored result into stats, adds the XP stored with each result and the tournament award XP, and
  evaluates achievements over `AchievementContext` (`stats`, `results`, `tournaments`). Concurrent
  writers converge because each run recomputes from scratch. `player_progress.summary` and
  `total_xp` are a cache for leaderboards and profile chips. XP is fixed per game when the result
  is inserted (`xpForGame`), so a change to `XP_RULES` affects later games only; the level curve is
  applied on every read (`getProgression`), so it is never changed lightly. An unlocked achievement
  stays unlocked when its rule changes.
- **Guest import** (`POST /api/account/import`) happens once per account: `setBaselineOnce` refuses
  a second import with `already_imported` (`409`). The browser sends its aggregate stats and the
  last 50 games it kept; `deriveBaseline` turns the difference into a baseline so nothing counts
  twice.
- **Levels and rewards.** Level comes from `player_progress.total_xp` through `getProgression()`.
  `LEVEL_TITLES` (`progression.ts`), `AVATAR_FRAMES` and `PROFILE_BANNERS` (`level-rewards.ts`)
  declare what each level unlocks; cosmetics are derived from the level, never stored. Level-up
  toasts come from `summarizeLevelUps(levelsGained(prevXp, nextXp))` in `AccountProvider`.
- **Tournaments feed progress.** `ProgressCalculator` reads completed tournaments through
  `ITournamentParticipationReader` (served by `PostgresTournamentHistoryReader`). When a tournament
  completes, `PlayerProgressRefresher` (`progressRefresher` in the account container) recomputes
  everyone involved.
- **History and pins.** `GET /api/account/games?cursor=&limit=` is keyset-paginated on
  `(played_at, client_game_id)` with an opaque cursor (`encodeHistoryCursor`); the first page also
  returns the pinned games. Pins are idempotent and capped by `MAX_PINNED_GAMES`; the check is soft,
  so two concurrent pins can pass it.
- **Global totals are not account stats.** The public totals behind `GET /api/stats` are recorded
  only from the game worker: `POST /api/telemetry/ingest` verifies the batch signature
  (`TELEMETRY_INGEST_SECRET`), stores the events, and `RecordCompletedGamesUseCase` adds each
  completed game once, keyed by game id, to the Redis totals
  (`src/infrastructure/stats/redis-global-stats-store.ts`). Browsers cannot write them. The worker
  side of the batches is `party/telemetry/`. `GET /api/community-stats` (the home page pulse) and
  `GET /api/leaderboard` (the Hall of Champions) read Postgres and are cached for a short time by
  Next's data cache.

### Characters

- A character is one part per slot (`CHARACTER_SLOTS`: head, outfit, headwear, cape, main hand,
  off hand, palette, familiar), stored as `CharacterAppearance` JSON in
  `player_profiles.appearance`. The catalog, unlock rules and validation are pure domain code in
  `shared/domain/character/`; rendering keys off part ids, so ids never change once shipped.
- **Unlocks are derived**, like level rewards: a part is `starter`, needs a `level`, or needs an
  `achievement` (one that is unlocked or complete). Nothing about unlocks is stored. The server
  checks every save (`validateAppearance`): unknown parts, parts in the wrong slot, locked parts,
  a two-handed prop with something in the off hand, and headwear on a hood are refused with
  `422` and the reason as the message.
- **No backfill.** While `appearance` is NULL, `GetCharacterUseCase` derives a look from the
  avatar in the synced `game-settings` document (`appearanceForLegacyAvatar`, starter parts
  only). A stored look whose parts are no longer allowed is repaired slot by slot on read
  (`repairAppearance`).
- **What others see** is `displayedAppearance(stored, avatar)`: the saved look while every part is
  still valid, else the derived one; unlocks are not checked again. Social players (the
  `social_players` view, migration `0111`), inbox actors, sent invites, public profiles and
  leaderboard entries carry it as `appearance` next to the old `avatar`, which emails still draw.
  Saving a look purges the player's public profile and the leaderboards. The UI still draws
  avatars until the presentation switches over.

### Public profiles

- `/u/<username>` exists while `player_profiles.is_public` is true (the default, see
  `DEFAULT_PROFILE_VISIBILITY`). `buildPublicProfile()` is the whitelist of what leaves the server:
  name, tagline, avatar, character look, level, headline stats, achievements, pinned games, the
  trophy cabinet and, only with `show_history`, recent games. Never the email, user id or game ids.
  The avatar is the `avatar` field of the synced `game-settings` document; the look is
  `displayedAppearance` (see Characters).
- The page is ISR (`revalidate = 60`) and served only at the lowercase handle; other spellings
  redirect permanently. Its data carries the cache tag `public-profile:<handle>`.
  `revalidatePublicProfiles()` (`public-profile-cache.ts`) expires that tag and the path at once
  and purges the leaderboards. Profile, visibility and pin routes call it; renames, name and avatar
  edits and deletion go through Better Auth and call it from the user hooks
  (`public-profile-hooks.ts`).
- The Hall of Champions lists only players with a public profile: the reader filters on
  `is_public` (`postgres-leaderboard-reader.ts`), and `LEADERBOARD_RULES` sets board size and
  eligibility.

### Settings and sound sync

- localStorage stays the runtime source of truth. While signed in, `useAccountSync` attaches
  `SettingsSyncEngine` and `CustomSoundSync` next to the outbox and detaches them on sign-out.
- **Settings.** Each synced document is one `SyncSlice` (`settings-sync-slices.ts`): read, apply,
  subscribe. Documents are versioned; `PUT /api/account/documents/[key]` answers `409` with the
  current document on a version mismatch, and the engine retries once on top of it. On sign-in,
  edits made offline are pushed, otherwise the account copy wins. The server stores each document
  as opaque JSON (size limit `MAX_DOCUMENT_BYTES`).
- **Custom sounds.** Audio goes to Blob, metadata to `account_custom_sounds`; the upload sniffs the
  format from magic bytes and enforces the limits in `custom-sounds.use-cases.ts`. Ids remembered
  from the last sync tell a deletion from an addition.

## HTTP API

Every route below `/api/account`, `/api/social` and `/api/inbox` that needs a session goes through
`accountRoute()` (`src/app/api/account/account-route.ts`): database check, CSRF origin check,
session, error mapping. Tournament routes wrap it in `tournamentRoute()`
([tournaments.md](tournaments.md#http-api)).

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET`, `PATCH /api/account` | session | overview (profile, stats, progression, achievements, recent games); change tagline and visibility |
| `GET`, `POST /api/account/games` | session | history page; record results `{ results }` |
| `PUT`, `DELETE /api/account/games/[id]/pin` | session | pin or unpin a game |
| `POST /api/account/import` | session | one-time guest import `{ stats, history }` |
| `GET /api/account/documents`, `PUT /api/account/documents/[key]` | session | synced settings documents |
| `GET`, `POST /api/account/sounds`, `PATCH`, `DELETE /api/account/sounds/[id]` | session | custom sounds; upload is multipart (`file`, `metadata`) |
| `GET`, `PUT /api/account/character` | session | the character look, whether it was saved, and the unlocked part ids; save `{ appearance }` |
| `GET /api/account/export` | session | JSON download of everything stored, including the social and tournament parts |
| `GET /api/account/capabilities` | public | `DeploymentCapabilities`, cached for five minutes |
| `/api/auth/*` | Better Auth | sign-in, sign-up, codes, two-factor, passkeys, sessions, deletion |
| `GET /api/username/check` | public | guest name availability, per-IP budget |
| `GET /api/leaderboard`, `GET /api/community-stats`, `GET /api/stats` | public | Hall of Champions, home page pulse, global totals |
| `POST /api/telemetry/ingest` | worker HMAC | signed event batches from the game worker |

Errors are `{ error: { code, message } }` with `Cache-Control: no-store`, except a document version
conflict, which answers `{ error: { code: 'conflict' }, current }`. Successful session responses
are `private, no-store`. The same table serves the social routes; tournament routes add
`TournamentError` codes ([tournaments.md](tournaments.md#http-api)).

| Status | Code | Raised when |
| --- | --- | --- |
| `401` | `unauthenticated` | no session |
| `403` | `forbidden` | a mutating request whose `Origin` is not the app's, or `SocialError` `forbidden` |
| `404` | `not_found` | `AccountError` or `SocialError` `not_found` |
| `409` | `conflict`, `already_imported`, `limit_reached` | version mismatch, repeated import, a hard cap |
| `413` | `quota_exceeded` | a per-account quota (pins, custom sounds) |
| `422` | `invalid_input` | malformed input, including a body over the route's `readJson` limit |
| `429` | `rate_limited` | a social throttle |
| `500` | `internal` | anything unexpected, logged as `account_route_failed` |
| `503` | `unavailable` | no `DATABASE_URL` |

Clients branch on a few of these, and `account-route.test.ts` pins each one:

- `422` drops a result batch in `game-result-outbox.ts` (any other failure is retried).
- `429` shows "Slow down a little" in `RelationshipButton.tsx`.
- `401` stops the heartbeat in `useSocialPulse.ts`.
- `503` reads as "feature switched off" in `src/lib/tournament/tournament-errors.ts`.
- `409` on a document gives the settings engine the current version to retry on.

Any other status is a client error that the browser shows or ignores, so the exact `4xx` of a new
error code is a server convention. `AccountErrorCode` and `SocialErrorCode` are typed
`Record`s in `account-route.ts` and in the test, so a new code cannot ship without a row.

## Configuration

Env vars, secrets and their defaults for accounts are in
[../operations/configuration.md](../operations/configuration.md).

## Adding things

- **Achievement.** Append to `GAME_ACHIEVEMENTS` or `TOURNAMENT_ACHIEVEMENTS` in
  `shared/domain/account/achievements.ts`, then map its icon in `AchievementIcon.tsx`
  (`AchievementIcon.test.ts` fails for an unmapped icon). Ids are stored in `player_achievements`,
  so never rename one. Helpers that read a game, a day or a tournament (runs, running scores, UTC
  days) and the `ACHIEVEMENT_RULES` thresholds live in `achievement-facts.ts`. A new fact about a
  player belongs in `AchievementContext`, fed by a port, not read inside the rule.
- **Level reward.** Append to `LEVEL_TITLES` (`progression.ts`), `AVATAR_FRAMES` or
  `PROFILE_BANNERS` (`level-rewards.ts`), and add the CSS of a frame or banner to
  `src/presentation/components/account/cosmetic-styles.ts`, which is typed by cosmetic id.
- **Character part.** Append to `CHARACTER_PARTS` (`shared/domain/character/character-catalog.ts`)
  with its slot and unlock. An achievement unlock must name an existing achievement id
  (`character.test.ts` checks it). Never rename or remove a shipped id: stored looks reference it,
  and `repairAppearance` would quietly reset that slot.
- **Public profile field.** Add it to `PublicProfileSource` (reader SQL in
  `postgres-public-profile-reader.ts`) and expose it explicitly in `buildPublicProfile()`; anything
  not listed stays private. Update the public profile section of the privacy policy
  (`src/app/privacy/privacy-sections.tsx`).
- **Synced setting.** Add the key to `ACCOUNT_DOCUMENT_KEYS` (`account-documents.ts`) and a slice to
  `SETTINGS_SYNC_SLICES`.
- **Sign-in provider.** Add an entry to `PROVIDERS` in `social-providers.ts`, the id to
  `AuthProviderId` (`auth-capabilities.ts`) and an icon to `PROVIDER_META` in
  `ProviderButtons.tsx`, which is typed by provider id.
- **Account use case.** Port in `shared/application/ports/account/`, use case in
  `shared/application/use-cases/account/`, adapter in `src/infrastructure/account/`, a line in
  `account-container.ts`, then a route handler that is one line over `accountRoute()`.
- **Schema change.** Add `db/migrations/NNNN_name.sql`, numbered after the last file in that
  directory. Production builds apply it (`vercel-build` runs `scripts/db-migrate.mjs
  --if-production`); other databases need `npm run db:migrate`. The runner applies files in lexical
  order, one transaction each, and records them in `schema_migrations`. After Better Auth plugin
  changes, regenerate the auth SQL with `getMigrations()` from `auth-options.ts` (the header of
  `0100_auth.sql` says how it was produced). Deploy code and migration together: Better Auth
  selects the username columns on every user read. See
  [../operations/database.md](../operations/database.md).

| Migration | Adds |
| --- | --- |
| `0100_auth.sql` | Better Auth tables: users, sessions, linked accounts, verifications, two-factor, passkeys |
| `0101_accounts.sql` | profiles, game results, progress, achievements, synced documents, custom sounds |
| `0102_auth_username.sql` | username columns and unique index, `emailVerificationRequired` |
| `0103_game_pins.sql` | `pinned_at`, pinned and keyset history indexes |
| `0104_public_profiles.sql` | `is_public`, `show_history` |
| `0105_social.sql`, `0106_friend_request_emails.sql` | friends, requests, blocks, inbox, social settings on `player_profiles`, the `social_players` view (see [social.md](social.md)) |
| `0107_one_player_name.sql` | usernames for accounts without one, `usernameChangedAt`, `NOT NULL` names |
| `0108_tournaments.sql`, `0109_tournament_match_activity.sql` | tournaments and live match state (see [tournaments.md](tournaments.md)) |
| `0110_character_appearance.sql` | `player_profiles.appearance` (nullable, no backfill) |
| `0111_social_players_appearance.sql` | `appearance` appended to the `social_players` view |

## Tests

| Contract | Suite |
| --- | --- |
| Stats, XP, levels, rewards, achievements, usernames, public profile, leaderboard | `shared/domain/account/*.test.ts` |
| Character catalog, unlocks, validation, repair, legacy avatars | `shared/domain/character/character.test.ts` |
| Recording, import, history, profile, export, public profile, character use cases | `shared/application/use-cases/account/*.test.ts` |
| Global totals | `shared/domain/stats/global-stats.test.ts`, `shared/application/use-cases/stats/global-stats.use-cases.test.ts`, `src/infrastructure/stats/redis-global-stats-store.test.ts` |
| Auth configuration, sign-in guards, username hooks | `src/infrastructure/auth/auth-options.integration.test.ts`, `username-hooks.test.ts` |
| Route wrapper: statuses, origin check, bounded bodies | `src/app/api/account/account-route.test.ts`, `account-route.read-json.test.ts` |
| Profile cache purge | `src/infrastructure/account/public-profile-cache.test.ts` |
| Outbox and settings sync | `src/lib/account/game-result-outbox.test.ts`, `account-sync.test.ts` |
| Every achievement has an icon | `src/presentation/components/account/AchievementIcon.test.ts` |

Test boundaries and what each level costs are in [../testing/testing.md](../testing/testing.md).
