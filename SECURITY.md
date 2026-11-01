# Security policy

## Report a vulnerability

Report privately through GitHub's private vulnerability reporting:
<https://github.com/rabitem/wizard-party/security/advisories/new>. Only the maintainers can read
the report. Do not open a public issue, pull request or discussion for a vulnerability, and do not
post details elsewhere before a fix is released.

A useful report has:

- what is affected (the route, message type, page or file) and the commit or deployment you tested;
- the steps to reproduce it, or a proof of concept;
- the impact: what an attacker gains, and what they need first (an account, a seat at a table,
  a room code);
- a suggested fix, if you have one.

Test only against your own local setup (see [docs/getting-started.md](docs/getting-started.md)) or
your own deployment. Do not test against the hosted game with other players' data, do not run
denial-of-service or load tests against it, and stop once you have shown the issue.

## Supported versions

Only the current `main` branch and the deployment built from it receive security fixes. The
repository carries no version tags, and `package.json` is private. If you run your own copy, update
to `main`.

## Scope

In scope:

- the web application and its API routes (`src/app/`, `src/infrastructure/`);
- the game worker and its WebSocket protocol (`party/`, `shared/`);
- the GitHub Actions workflows and scripts in `.github/` and `scripts/`;
- the official deployment built from `main`.

Out of scope:

- vulnerabilities in third-party services and dependencies themselves (Vercel, Cloudflare, Neon,
  Upstash, Resend, Better Auth, npm packages). Report those upstream; tell us if our use of them
  makes the problem worse;
- deployments run by other people, and their configuration;
- volumetric denial of service, spam, and social engineering;
- findings that need a compromised device or browser, or physical access;
- scanner output without a demonstrated impact;
- weak bots, unfair rule variants and other game-balance issues without a security effect.

## What the server trusts

The game server treats every browser as untrusted. The pages
[docs/server/protocol.md](docs/server/protocol.md) and [docs/server/room.md](docs/server/room.md)
are the contract; this section is the summary that a report is judged against.

**Game state.** The worker owns the game; clients send commands, never state.

- Each frame is decoded at the boundary (`parseClientCommand` in
  `party/utils/client-command-parser.ts`, then `decodeClientCommand` in
  `shared/domain/events/command-decoders.ts`). Oversized frames, malformed fields and unknown
  fields are refused or dropped before any handler runs.
- The domain enforces turn order, legal plays, bid limits and the host's powers.
- Commands are rate limited per seat and command class (`party/config/command-rate-limits.config.ts`)
  and applied once per `requestId`.
- Hidden information stays on the server. Every `GAME_STATE` is built for the receiving seat
  (`createPersonalizedState`), and the broadcast channel accepts only events that carry no hand,
  hidden bid or token (`BroadcastEvent`).

**Seat identity.** The public player id is never a credential.

- A protocol-2 client gets an opaque seat id and a random session token when it joins. The token
  is the credential that takes the seat back after a reconnect, and the room stores it server-side.
- A legacy protocol-1 client has no token. For a seat that has never been issued one, the browser's
  persistent id is the credential. A seat that holds a token refuses a persistent id.
- A room has no password. The room code is the way in, and anyone who knows it can join while a
  seat is open. The host's commands (settings, bots, kicks, start) are checked against the host
  seat.
- Social features ask the worker whether a seat belongs to the caller
  (`src/infrastructure/social/party-room-membership-verifier.ts`), using the seat proof header.

**Accounts.** Signed-in identity comes from Better Auth sessions
(`src/infrastructure/auth/`): passwords, passkeys, two-factor codes and social providers, with
per-IP rate limits on the endpoints that send mail or check secrets. The game worker does not
authenticate accounts; a tournament match ticket is the only account claim it accepts.

**Server-to-server calls.** Three secrets authenticate calls between the worker, the app and the
scheduler, and none of them reaches a browser:

| Secret | Protects | Checked in |
| --- | --- | --- |
| `TELEMETRY_INGEST_SECRET` | Signed telemetry batches from the worker. Global stats are recorded only from these batches. | `src/app/api/telemetry/ingest/route.ts` |
| `TOURNAMENT_SECRET` | Match tickets that seat a player in a tournament table, and the signed match results the worker reports back. Results are never reported by browsers. | `src/infrastructure/tournament/`, `src/app/api/tournaments/match-results/` |
| `CRON_SECRET` | The scheduled telemetry retention job. | `src/app/api/cron/telemetry-retention/route.ts` |

Without a secret, the matching feature is unavailable rather than open.

**Browser telemetry.** The client telemetry endpoint (`src/app/api/telemetry/client/`) accepts
schema-validated, size-bounded and rate-limited batches from any browser. The client sends them
only after the player consents. They inform diagnostics; nothing the game or its stats rely on
comes from them.

**Data handling.** What the hosted deployment stores, for how long and on what basis is described
on its privacy page (`src/app/privacy/`). This policy makes no separate claim about data handling.

## Secrets and deployments

The repository holds no secrets. Local values go in `.env.local` and `.dev.vars` (both ignored by
Git, templates in `.env.example` and `.dev.vars.example`); deployed secrets are set with
`wrangler secret put` and in the Vercel project settings. Never point a development machine at a
production database. If you find a credential in the repository or its history, report it as a
vulnerability.
