# Wizard Party

An online multiplayer version of the Wizard card game, played at a 3D table in the browser.
Three to six players bid on how many tricks they will win each round and score by hitting the bid
exactly. Bots fill empty seats.

## What it does

- **The game.** The classic 60-card deck (four suits of 1-13, four Wizards, four Jesters), trump
  selection, and the forbidden last bid. The rules are configurable per room: bidding, scoring,
  round structure and turn timers (`IRulesetConfig` in
  `shared/domain/value-objects/ruleset-config.ts`).
- **Anniversary editions.** Hosts can add special cards, from the presets in
  `shared/domain/expansions/expansion-sets.ts` or card by card.
- **Rooms.** Public and private rooms with shareable join links and up to six seats.
- **Bots.** Five difficulty levels, from Novice to Expert
  (`shared/domain/value-objects/bot-difficulty.ts`).
- **Table talk.** Emotes and chat.
- **Looks.** A realm switcher on the home screen changes the UI, table and card theme.
- **Optional accounts.** Progress and achievements, friends and an inbox, and hosted tournaments
  with results attested by the game server. Guests can play without an account. These features
  need a database; the game itself runs without one.

## Run it locally

```bash
git clone https://github.com/rabitem/wizard-party.git
cd wizard-party
npm install
npm run dev:all
```

Open <http://localhost:3000>. `npm run dev:all` starts the Next.js app on port 3000 and the game
worker (`wrangler dev`) on port 1999. You need Node.js 22.13 or newer on the 22 line, or 24 or 26
(`engines` in `package.json`). No environment variables are required. See
[docs/getting-started.md](docs/getting-started.md) for prerequisites, optional services, the
animation sandbox and the other scripts.

## How it is built

- **Frontend:** Next.js 16 (App Router), React 19, React Three Fiber, Tailwind CSS.
- **Realtime server:** a Cloudflare Worker with SQLite-backed Durable Objects, one room per
  Durable Object (`party/`).
- **Game logic:** framework-free domain and application code in `shared/`, imported by the browser
  and the worker alike.

[docs/architecture.md](docs/architecture.md) explains the layers and the dependency rule.

## Documentation

[docs/README.md](docs/README.md) indexes every page. A few starting points:

| To | Read |
| --- | --- |
| Set up and play | [docs/getting-started.md](docs/getting-started.md) |
| Understand the layers | [docs/architecture.md](docs/architecture.md) |
| Change a rule or a bot | [docs/game-rules/engine.md](docs/game-rules/engine.md) |
| Change the server or the wire protocol | [docs/server/room.md](docs/server/room.md), [docs/server/protocol.md](docs/server/protocol.md) |
| Write or run tests | [docs/testing/testing.md](docs/testing/testing.md) |
| Deploy your own copy | [docs/operations/deployment.md](docs/operations/deployment.md) |
| Keep dependencies current | [docs/operations/dependency-updates.md](docs/operations/dependency-updates.md) |

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and follow the
[code of conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md).

## Licence

The source code is free software under the GNU Affero General Public License, version 3 or later
(AGPL-3.0-or-later); see [LICENSE](LICENSE). Assets that keep their own licences are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Wizard Party is an unofficial fan project and is not affiliated with or endorsed by AMIGO Spiel +
Freizeit GmbH or U.S. Games Systems, Inc. "Wizard" is a trademark of those companies. The
disclaimer in the app is `LEGAL_COPY.TRADEMARK_DISCLAIMER` in
`src/presentation/config/legal.config.ts`.
