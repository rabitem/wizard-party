---
name: writing-docs
description: "Use when writing, updating, moving, reviewing or pruning documentation in Wizard Party: README.md, CONTRIBUTING.md, SECURITY.md, CLAUDE.md, AGENTS.md, docs/**, or the doc comment that points at them. Triggers: write docs, document this, update the README, contributor guide, architecture doc, protocol doc, env vars table, deployment guide, stale docs, docs review, a code change that makes a doc wrong."
---

# Writing docs

A doc is a claim about the code. A wrong doc is worse than none, because readers trust it. This
skill decides where a doc goes, how it reads and how it is proven.

- Placing a new page or moving one: read
  [information-architecture.md](references/information-architecture.md).
- Writing or reviewing prose: read [style.md](references/style.md).

## Who reads what

| File | Reader | Holds | Never holds |
| --- | --- | --- | --- |
| `README.md` | Someone who just found the repo | What the game is, a screenshot, the 3-command local start, licence, links into `docs/` | Deployment runbooks, CI internals, feature contracts |
| `CONTRIBUTING.md` | First-time contributor | Setup, branch and PR flow, what CI checks, where tests go, how to pick an issue | Architecture detail (link it) |
| `SECURITY.md` | Security researcher | How to report privately, supported versions, scope, what the server trusts | Claims about data handling that `src/app/privacy/` contradicts |
| `AGENTS.md`, `CLAUDE.md` | Coding agents | Rules an agent breaks without being told, commands, where things live | Tutorials, history, anything already in `docs/` |
| `docs/**` | Contributors changing an area | How the area works, its contracts, how to extend and test it | Plans, changelogs, task lists |
| Code comment | Next person editing that line | Why, and a pointer to the doc (`see docs/client/hud-layout.md`) | The doc's content repeated |

Plans and checklists belong in issues or the PR, not in the tree. When the work
ships, the outcome goes into the area's doc and the plan is deleted.

## Rules

1. **Every claim is checked against the source before it is written.** Paths, exports, scripts,
   env vars, defaults, limits, ports, protocol fields. Open the file; do not write from memory or
   from another doc. The drift this prevents: a security policy calling room ids UUIDs while
   `generateRoomId` in `src/presentation/components/room-browser/utils.ts` builds six
   characters.
2. **Docs change in the same PR as the code.** A change that renames a path, export, command,
   message type, env var, limit or behaviour named in a doc updates that doc. Find them with
   `git grep -n '<old name>' -- '*.md'` before pushing. A PR that only fixes docs is fine; a PR
   that leaves a doc wrong is not done.
3. **Name the source, don't copy the value.** Defaults and limits live in config files
   (`src/presentation/config/`, `party/config/`, `shared/domain/constants/`). Write
   "budgets are in `party/config/command-rate-limits.config.ts`", not the numbers, unless the
   number is the contract (protocol version, close code, port).
4. **One page per contract.** If two pages explain the same thing, one links to the other. The
   owner is the page for the layer that implements it.
5. **Write the present state.** No "after the overhaul", "no longer", "is gone", "new". History
   is in git.
6. **Public repo.** No secrets, tokens, real email addresses, production database names or
   connection strings, player data or telemetry rows. Deployment steps use placeholders
   (`<your-worker>.workers.dev`); the default host is named by its constant
   (`REALTIME_HOST` in `src/config/deployment.config.ts`).

## AGENTS.md and CLAUDE.md

- One source. `AGENTS.md` holds the content; `CLAUDE.md` imports it with a single `@AGENTS.md`
  line plus anything only Claude Code needs. Two hand-kept copies drift (they once disagreed on
  the backend and the default host).
- Short. Aim for under 150 lines. Keep: layering and the dependency rule, file naming, the
  300-line limit, where constants and types go, commands, the test boundary list, links into
  `docs/`. Cut: SOLID tutorials, generic React advice, example code an engineer already knows,
  debt lists with stale line counts.
- Every rule must be true of the code today. When a rule changes, change the file in that PR.

## Before you finish

- Every path in the diff exists: `git ls-files <path>` or `git grep -l <export>`.
- Every command is a script in `package.json` or a file under `scripts/`, spelled exactly.
- Every env var is read in code. List them with
  `git grep -ohE '\benv\.[A-Z_]{4,}' -- src shared party scripts | sort -u`, plus provider ids in
  `src/infrastructure/auth/social-providers.ts` and `vars` in `wrangler.jsonc`.
- Every relative link and `#anchor` resolves. Code points at headings
  (`docs/accounts/tournaments.md#configuration`); renaming a heading or moving a page means
  `git grep -n '<page>.md'` over the whole repo, code comments and `scripts/` included.
- Say in the PR what you checked against which file, and anything you could not verify.
