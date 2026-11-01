# Contributing to Wizard Party

Thanks for helping. This page covers how to set up, how a change reaches `main`, what CI checks
and where to find the conventions. Everyone taking part follows the
[code of conduct](CODE_OF_CONDUCT.md). Report security problems privately, as described in
[SECURITY.md](SECURITY.md), never as an issue or a pull request.

## Set up

1. Fork the repository and clone your fork.
2. Use Node.js as `engines` in `package.json` allows (`.nvmrc` names the major version).
3. Run `npm install`, then `npm run dev:all`.

The app is at <http://localhost:3000> and the game worker at port 1999. No environment variables
are required. [docs/getting-started.md](docs/getting-started.md) covers the optional services, the
animation sandbox and every script. [docs/architecture.md](docs/architecture.md) explains where
code belongs.

## Pick something to work on

- Look through the open issues. Issues are filed from the templates in `.github/ISSUE_TEMPLATE/`:
  `bug_report.yml` and `feature_request.yml`. Blank issues are disabled.
- Comment on the issue before you start something large, so the approach is agreed first.
- A fix for an obvious bug or a docs correction needs no prior discussion.

## Branch and pull request flow

1. Branch from an up-to-date `main`: `<type>/<kebab-topic>`, for example `fix/lobby-dead-socket`.
   Types are `feat`, `fix`, `refactor`, `chore`, `ci`, `docs` and `test`. Never push to `main`.
2. Keep one concern per pull request. A mechanical move or rename is its own pull request, apart
   from behaviour changes. Tests and docs ship in the same pull request as the behaviour they cover.
3. Title the pull request `type(scope): what a player or operator gets`, in lower case without a
   full stop, for example `fix(lobby): no name form flash when creating a game while signed in`.
   Pull requests are squash-merged, and the title becomes the commit subject on `main`.
4. Fill in `.github/PULL_REQUEST_TEMPLATE.md`: what changes and why, how you verified it, the
   follow-ups and the checklist. Add `Closes #<issue>` where one applies. A visible UI change needs before and after
   screenshots on a phone and a desktop viewport.
5. State the compatibility of a change to the wire protocol, the database or browser storage. The
   app and the worker deploy separately, so each side must work with the previous release of the
   other. [docs/server/protocol.md](docs/server/protocol.md) and
   [docs/operations/database.md](docs/operations/database.md) say how.
6. Wait for CI. Push fixes to the same branch. A maintainer merges once CI is green and review
   comments are resolved.

The `pull-request` skill (`.claude/skills/pull-request/SKILL.md`) holds the full conventions and
how to read a CI failure; it is written for coding agents and reads well for people too.

## What CI checks

Every pull request to `main`, and every push to it, runs the `Verify application` job in
`.github/workflows/ci.yml`. The steps run in order and stop at the first failure:

| Step | Command |
| --- | --- |
| Install | `npm ci` |
| Types | `npm run typecheck` (the app, then the worker with `tsconfig.worker.json`) |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Build | `npm run build` |
| Worker bundle | `npm run check:worker` (`wrangler deploy --dry-run`) |
| Smoke test and golden path | `npm run dev:party`, then `node scripts/realtime-smoke.mjs` and `npx playwright test --project=golden-path` |

Run the same commands before you push. The browser suites in `.github/workflows/e2e.yml` cost
runner hours, so they run on a pull request only when it carries the `e2e` label, and on a weekly
schedule; ask a maintainer for the label. See [docs/testing/testing.md](docs/testing/testing.md)
before you dispatch them.

Dependabot opens the dependency pull requests (`.github/dependabot.yml`). Minor and patch updates
that touch only `package.json` and `package-lock.json` merge automatically once every required
check has passed; majors need review. See
[docs/operations/dependency-updates.md](docs/operations/dependency-updates.md).

## Tests

Choose the cheapest test that can observe the behaviour: domain rules in `shared/domain/`, the
server in the room harness (`party/test-support/room-harness.ts`), client and server together in
`test/integration/`, and the browser only for pixels and input. Tests live next to the code they
cover, as `*.test.ts`.

- [docs/testing/testing.md](docs/testing/testing.md) explains the levels, the sandbox and the
  browser suites.
- The `test-audit` skill (`.claude/skills/test-audit/SKILL.md`) is the gate for a new test. Its
  `references/boundaries.md` lists the boundaries and what each one sees. Every test must protect
  something a player, an operator or another module can observe.

## Conventions

[AGENTS.md](AGENTS.md) is the source for code conventions: the layers and the dependency rule,
file naming, where constants and types live and the size limits. The ones a review catches most:

- Dependencies point inward: presentation, then application, then domain. No business logic in
  components.
- `max-lines` is an error at 300 code lines. `eslint.config.mjs` relaxes it to a warning at 400 in
  `shared/`, `party/` and a few UI areas, and turns it off in tests. Split a file before the limit;
  do not raise it.
- Constants live in config files (`src/presentation/config/`, `party/config/`,
  `shared/domain/constants/`), not in components.
- A type has one definition, in the layer that owns it.
- A change that makes a doc wrong updates that doc in the same pull request. The `writing-docs`
  skill (`.claude/skills/writing-docs/SKILL.md`) says where docs live and how they are written.
- No secrets, personal data or local paths in the diff.

## Licence of contributions

Wizard Party is licensed under AGPL-3.0-or-later (see [LICENSE](LICENSE)). By opening a pull
request you agree that your contribution is licensed under the same terms, and that you have the
right to submit it. There is no contributor licence agreement.

Do not add third-party assets (fonts, images, sounds, textures) without a licence that allows
redistribution under these terms, and list them in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Sound effects are generated by `scripts/generate-sounds.mjs`, not recorded or taken from other
projects. The Wizard card game's artwork and printed text are not part of the project (see the
trademark note in [README.md](README.md#licence)).
