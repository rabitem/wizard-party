---
name: pull-request
description: "Use when branching, committing, titling, describing, labelling, merging or watching a Wizard Party pull request: branch names, conventional commit titles with a scope, PR size, the What changes / Verification / Follow-ups description, reading CI failures (typecheck, lint, vitest, build, worker dry run, realtime smoke), the costly `e2e` label and the e2e dispatch, visual baselines, Dependabot auto-merge and squash merge."
---

# Pull requests

A pull request lands on `main` as one squashed commit, and `main` ships: Vercel builds the app
from it and the worker is deployed after the merge. Everything below follows from that.

- CI failed, or you need to rerun or debug the browser suites: read [ci.md](references/ci.md).
- The PR adds or changes tests: run the `test-audit` skill's gate first.

## Branch

- `<type>/<kebab-topic>` from an up-to-date `main`, with the same type as the PR title:
  `feat/tournament-mode`, `fix/lobby-dead-socket`, `chore/dependabot-auto-merge`,
  `refactor/<topic>`. One branch per PR. Never push to `main`.

## Title and commits

The PR title becomes the commit subject on `main` (`(#N)` is appended on merge), so the title
carries the convention:

```
type(scope): what a player or operator now gets
```

- Types: `feat`, `fix`, `refactor`, `chore`, `ci`, `docs`, `test`. Dependencies are
  `chore(deps)`, as Dependabot writes them.
- Scope is the feature area, lowercase, matching a folder or a doc where one exists: `lobby`,
  `social`, `tournaments`, `themes`, `accounts`, `connection`, `expansions`, `engine`, `email`,
  `home`. Leave it out only for a change that really spans the app.
- Summary: lower case, no full stop, the observable outcome rather than the code. Join two related
  outcomes with `;`.
  - Good: `fix(lobby): no name form flash when creating a game while signed in`
  - Bad: `fix: update useEffect in LobbyUI`, `Engine audit`, `minor bugfixes`
- Branch commits are squashed away. Keep them readable, but don't spend time polishing them.
- No attribution trailers (`Co-Authored-By`, "Generated with").

## Size

- One concern per PR, small enough to review in one sitting. Mechanical moves and renames go in
  a separate PR from behaviour changes. A refactor that a feature needs lands first, on its own.
  Dependency upgrades are separate too.
- Tests ship in the same PR as the behaviour they protect.
- Fixes you find on the way are follow-ups, not extra commits in this PR.

## Description

```markdown
## What changes
## Verification
## Follow-ups
```

- **What changes**: what a player or operator sees now, and why. Name the owning modules in
  backticks. If the PR has several parts, give each a bullet with a bold lead-in. For a bug,
  write Problem (what was seen, where, on which device), Cause (the mechanism, with real numbers),
  then Fix.
- **Verification**: what ran, where, and the counts. For example: the CI run, `npx vitest run
  <paths>`, the browser and device for a manual check, sandbox scenarios. Use an unchecked box for
  anything skipped and say why. Never claim a run that didn't happen.
- **Follow-ups**: known gaps, work deliberately left out, anything to deploy or watch after the
  merge. Write "None" if there are none.
- A visible UI change needs before and after screenshots on phone and desktop.
- `Closes #N` for the issue it resolves.

## Compatibility (say it in the description)

The app and the worker deploy separately. A migration also runs before the new app code serves.
So every change must work with the previous release on the other side:

- **Wire protocol** (`shared/domain/events/protocol.ts`): old client with new worker, and new
  client with old worker, must both keep working. See `docs/server/protocol.md`. State the
  deploy order, for example "app first, then `npm run deploy:party`".
- **Database** (`db/migrations/`): the production build of `main` applies migrations (the
  `vercel-build` script runs `scripts/db-migrate.mjs --if-production`) while the old code is still
  serving. Keep migrations additive: nullable columns, new tables. Drop old ones in a later PR.
- **Browser storage** (`CONSTANTS.STORAGE_KEYS` in `src/presentation/config/constants.ts`):
  players' browsers already hold these keys, so keep reading the old values.

## Checks

- **CI** (`.github/workflows/ci.yml`, job `Verify application`) runs on every push to the PR.
  A new push cancels the run still in progress. The other checks are GitGuardian and the Vercel
  preview. All of them must be green. A failed run: [ci.md](references/ci.md).
- **Browser suites** (`.github/workflows/e2e.yml`) cost runner hours, because WebGL renders in
  software on hosted runners.
  - The `e2e` label runs the full Chromium and Android phone suites. It runs again on **every
    push** while the label stays on. Use it only for rendering, input or layout changes, and
    remove it once the run is done: `gh pr edit <n> --remove-label e2e`.
  - Otherwise, dispatch only the tests you touched:
    `gh workflow run e2e.yml --ref <branch> -f grep='<title regex>'`.
  - The weekly run (Sunday 03:00 UTC) covers every engine, device and viewport.

## Merge

- Squash merge only. Before you merge, CI, GitGuardian and the Vercel preview are green, no
  review requests changes, and every conversation is resolved. `@rabitem` owns everything
  (`.github/CODEOWNERS`).
- Write the squash body as a short prose summary of what changed and why, wrapped at about 72
  columns. Leave out the checkboxes and headings of the PR description.
  `gh pr merge <n> --squash --subject '<title> (#<n>)' --body '<summary>'`.
- Delete the branch after the merge. If the PR needs a worker deploy, run
  `npm run deploy:party` once the app's production deploy is live.

## Dependabot

- Dependabot checks npm once a week (`.github/dependabot.yml`). All minor and patch updates come
  together in one `minor-and-patch` group PR. Each major update gets its own PR.
- `.github/workflows/dependabot-auto-merge.yml` runs the policy in
  `.github/scripts/dependabot-auto-merge.mjs` from the base commit. It never checks out or runs
  the PR's code. It squash-merges only when all of these hold:
  - the update is semver minor or patch;
  - the PR only modifies `package.json` and `package-lock.json`;
  - the head and base are unchanged since the run started;
  - every check has completed successfully, including `Verify application`,
    `GitGuardian Security Checks` and the `Vercel` status;
  - the PR is mergeable and clean, and no reviewer has requested changes.
  
  It waits up to 15 minutes for this, then gives up and leaves the PR unmerged.
- To stop an auto-merge, request changes on the PR. A major update needs a human: read the
  changelog. For `next`, `react`, `three` or `@react-three/*`, add the `e2e` label once.
- Changing the policy means editing `dependabot-auto-merge.mjs` together with
  `dependabot-auto-merge.test.mjs` next to it. `npm test` runs that test.
