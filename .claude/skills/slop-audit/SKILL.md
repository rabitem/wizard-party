---
name: slop-audit
description: "Use when cleaning up Wizard Party code without changing behaviour: dead files, unused exports, unused dependencies, debug console.log, commented-out code, narrating comments, needless wrappers, duplicated helpers or types, over-defensive checks, magic numbers, create-next-app leftovers. Triggers: slop, dead code, unused, cleanup, tidy up, prune, deduplicate, leftover, scaffolding, pre-release or open-source cleanup."
---

# Slop audit

Slop is code that costs reading time and protects nothing. This skill finds it and deletes it
without changing what a player, an operator or another module can observe. Every deletion is
proven by `git grep` before the cut and checked by `git grep` after it, because the compiler may
not be available: CI is the compiler.

- Deleting files, exports, assets or dependencies: read [dead-code.md](references/dead-code.md).
- Logging, comments, wrappers, duplicates, defensive code, magic numbers, scaffolding: read
  [patterns.md](references/patterns.md).
- Deleting or rewriting tests: follow the test-audit skill (`.claude/skills/test-audit`).

## Behaviour-preserving means

These stay exactly as they were:

- game rules, bot decisions, timers, animations, sounds and layout;
- wire messages and close codes (`shared/domain/events`, `party/protocol`), Durable Object
  storage, `db/migrations`;
- telemetry facts and structured log lines (operators query the `msg` names);
- storage keys (`CONSTANTS.STORAGE_KEYS`) and ids that browsers and account documents already
  hold: sound, theme, card back and preset ids;
- URLs, public asset paths, page metadata and HTTP responses.

If a cleanup needs one of these to change, it is not slop. Leave it and put it in the report.

## Workflow

1. One area per pass (`party/handlers`, `src/presentation/components/hud`, ...). Other agents may
   edit the same worktree: `git status --short -- <area>` first, and touch only your files.
2. Find candidates with the recipes in the references. Discovery is read-only.
3. Prove each candidate. Missing evidence means no deletion. A few certain cuts beat many guesses.
4. Cut. Delete rather than move, move rather than wrap. Delete leaves first, then re-check their
   importers: dead chains die together.
5. Run the verification checklist.
6. Report.

## Never delete

- Next.js file conventions under `src/app` and their convention exports (list in
  [dead-code.md](references/dead-code.md#entry-points-with-no-importers)).
- `party/worker.ts`: `main` in `wrangler.jsonc`; `Main` is named by `durable_objects`
  `class_name`; the default export is the fetch handler.
- Files reached by a string: `public/` assets, CSS `url()` and `@import`, `next.config.ts`
  (`outputFileTracingIncludes`, `headers`), `vercel.json` crons, `public/manifest.json`.
- Scripts run outside `package.json`: `scripts/realtime-smoke.mjs` (`.github/workflows/ci.yml`),
  `.github/scripts/`, `scripts/lib/` (used by `scripts/animation-audit.mjs`).
- Gated dev routes: `/sandbox/animations`, which the browser suites drive
  (`e2e/support/sandbox.ts`, `scripts/lib/audit-browser.mjs`), and `/dev/theme-gallery`, the
  theme screenshot page. Also the browser globals `window.__wizard*` that `e2e/` calls.
- Side-effect imports (`import 'server-only'`, CSS imports) and ambient declarations
  (`src/presentation/types/troika-three-text.d.ts`).
- Validation of untrusted input and storage access (see
  [patterns.md](references/patterns.md#over-defensive-code)).
- `db/migrations/*`: applied history.
- Ports and their second implementers (`shared/application/ports`, `party/room/ports.ts`): the
  sandbox loopback and the test harness implement them too.
- Tests on the test-audit retention bar.

## Verification checklist (no local compiler)

When you cannot run `tsc`, `eslint`, `vitest`, `next build` or `wrangler`, do all of this:

1. Every removed file: `git grep -nE "/<Basename>['\"]"` and `git grep -n "<Basename>\.<ext>"`
   return nothing. That covers `@/` and `@shared/` aliases, relative paths (`party/` imports
   `shared/` as `../../shared/...`), `import()`, `lazy()`, `next/dynamic`, `vi.mock()`, `e2e/`,
   scripts and docs. For an `index.ts`, grep the directory path instead.
2. Every removed or renamed symbol: `git grep -nw "<Symbol>"` returns only the hits you intended.
   Barrels (`index.ts`, `export *` included), `import type`, tests and docs count.
3. Every file you edited: no import left unused (`@typescript-eslint/no-unused-vars` is an error
   in `eslint.config.mjs`), no duplicate import, and within the line limit (300; 400 where
   `eslint.config.mjs` relaxes it).
4. Path lists in config: `package.json` scripts (`test:physics` names test files by path),
   `.github/workflows/*.yml`, `tsconfig.json`, `tsconfig.worker.json`, `vitest.config.ts`,
   `eslint.config.mjs` file globs, `next.config.ts`, `wrangler.jsonc`, `vercel.json`,
   `.github/CODEOWNERS`.
5. Prose: `README.md`, `CONTRIBUTING.md`, `docs/` and `AGENTS.md` name paths and
   symbols. Update or drop those lines.
6. Read the types you relied on. When inlining a wrapper, the callee's signature must fit every
   call site: optional parameters, overloads, return type, `this`.
7. Read your whole diff: `git diff -- <your paths>`. Every hunk is a deletion, a move or an
   inlining with identical semantics, and its reason is obvious from the hunk.
8. Hand off what CI must prove: `npm run typecheck` (two projects: `party/worker.ts` is checked
   only by `tsconfig.worker.json`), `npm run lint`, `npm test`, `npm run build`,
   `npm run check:worker` and the multiplayer smoke test in `ci.yml`. Run the browser suites only
   when rendering, input or layout code changed, via `workflow_dispatch` on `e2e.yml` with a
   narrow `grep`.

## Report

- Files deleted and lines removed, per category.
- Each cut with its evidence: the zero-hit greps, or the canonical code it now uses.
- Candidates left in place and why: needs a behaviour change, owner unclear, needs a lockfile
  change.
- What was not run locally and must be proven on CI.
