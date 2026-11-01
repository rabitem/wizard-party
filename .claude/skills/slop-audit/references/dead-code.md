# Dead files, exports, assets and dependencies

Use with the [verification checklist](../SKILL.md#verification-checklist-no-local-compiler).
All commands run from the repository root in a POSIX shell (Git Bash on Windows).

## Prove a file is dead

Record for each candidate:

1. No importer: `git grep -nE "/<Basename>['\"]"` (module specifiers in every form) and
   `git grep -n "<Basename>\.<ext>"` (docs, configs, `package.json`). A basename shared with other
   files (`types.ts`, `utils.ts`) needs the directory too: `"room-browser/utils['\"]"`.
2. Not an entry point (next section).
3. Its importers are live. If the only importer is itself a candidate, prove that one first.
4. A barrel line is not a use: check the re-exported symbols instead
   ([exports](#prove-an-export-is-dead)).
5. Only tests import it: production has no caller. Delete it with its tests, through the
   test-audit gate.
6. `git log --format='%h %ad %s' --date=short -- <file> | head`. A file added in the last few
   commits may be the first half of a feature: ask before deleting it.

## Entry points with no importers

Next.js (`src/app`):

- Convention files: `page.tsx`, `layout.tsx`, `route.ts`/`route.tsx`, `error.tsx`,
  `global-error.tsx`, `not-found.tsx`, and the metadata files `icon.tsx`, `apple-icon.tsx`,
  `opengraph-image.tsx`, `twitter-image.tsx`, `robots.ts`, `sitemap.ts`. The same holds for any
  other Next.js file convention added later.
- Their convention exports: the default export, `GET`, `POST`, `PUT`, `PATCH`, `DELETE`,
  `dynamic`, `runtime`, `revalidate`, `maxDuration`, `metadata`, `generateMetadata`,
  `generateStaticParams`, `viewport`, and `alt`, `size`, `contentType` in image files. Next.js
  reads them; grep never finds a caller.
- Other files inside `src/app` (`src/app/game/[id]/useGameClientState.ts`,
  `src/app/privacy/privacy-tables.ts`) are ordinary modules: prove them like any other.
- A route with no caller in the repo is still public: old clients, sent emails, crawlers and the
  worker call it. Grep its URL (`git grep -n "/api/telemetry/ingest"`) in `fetch` sites,
  `CONSTANTS.API` in `src/presentation/config/constants.ts`, `src/infrastructure/email`,
  `wrangler.jsonc` vars and `vercel.json` crons. Removing a route is a behaviour change: report it.

Worker (`party/`):

- `party/worker.ts` is `main` in `wrangler.jsonc`. `tsconfig.json` excludes it and
  `tsconfig.worker.json` includes it.
- `party/room/` is also driven by the in-browser sandbox loopback
  (`src/infrastructure/sandbox/loopback-game-server.ts`) and the test harness
  (`party/test-support/room-harness.ts`). Grep those before
  calling a server path unused.

Scripts and suites:

- `package.json` scripts, `.github/workflows/*.yml`, `.github/scripts/`, `scripts/lib/`.
- `e2e/*.spec.ts` import configs straight from `src/presentation/config` (`../src/...`) and call
  browser globals named `window.__wizard*`.

## Prove an export is dead

Count the files that mention each export of a file, outside the file itself:

```bash
f=src/presentation/config/physics-utils.ts
for s in $(grep -oE "^export (declare )?(async )?(function|const|let|class|interface|type|enum) [A-Za-z0-9_]+" "$f" | awk '{print $NF}'); do
  echo "$(git grep -lw "$s" -- . ":!$f" | wc -l) $s"
done | sort -n
```

Read the hits behind every low count, then:

- 0 files and used inside the file: drop the `export` keyword, keep the code.
- 0 files and unused inside: delete it.
- Only a barrel: delete the barrel line, then count again. Exclude barrels with `':!*index.ts'`.
- Only tests: a test-only export. Move the test to the real entry point (test-audit).
- Only docs: fix the docs, then decide.

Limits of the recipe:

- It misses `export { a, b }` lists, `export default` and re-exports: grep those by hand.
- Short or common names (`id`, `size`, `Card`) hit everywhere: read the hits, don't count them.
- Enum members, event and command types, and union members can arrive over the wire or from
  storage. The other side builds them: a member with no reference in one side is not dead.
- Keys read dynamically (`SOUND_CONFIGS[id]`, `CONFIG[key]`, preset tables) have no static
  reference. Grep the id strings, and where the ids are persisted treat them as contracts.

## Barrels

- Every feature directory keeps its `index.ts` (AGENTS.md, "Files, size and where things
  go"). Don't delete a barrel to cut indirection; delete the lines nobody consumes.
- Deleting a file means deleting its barrel line. An `export *` from a missing module fails the
  typecheck, and nothing will tell you locally.
- `export *` barrels (`shared/domain/index.ts`, `src/lib/index.ts`, `party/utils/index.ts`
  and others: `git grep -lE "^export \* from"`) forward everything, so grep for the symbol name,
  never for the barrel path.

## Assets in `public/`

Assets are referenced by strings. Grep the file name (`git grep -n "bass-drop.mp3"`) and the
directory prefix (`/sounds/`, `/textures/`, `/fonts/`) in case a path is assembled. The places
that reference assets:

- `src/lib/sound-configs.ts`, `src/presentation/config/assets.config.ts`;
- CSS `url()`: `src/styles/rpg-awesome.css`;
- `src/app/layout.tsx` metadata, `public/manifest.json`, `next.config.ts` headers and
  `outputFileTracingIncludes`;
- server-side reads: `src/infrastructure/email/player-pair-card.tsx` loads the icon font from disk;
- email HTML: `src/infrastructure/email/email-layout.ts` links `/favicon.png` by absolute URL.
  Emails already sent keep pointing at it.

A font format that no `@font-face` lists is a candidate; a format that one lists is not.

Scaffolding: create-next-app ships `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` and
`window.svg` in `public/`. If one comes back (a template copy, a merge), confirm it is unused with
`git grep -nE "(file|globe|next|vercel|window)\.svg"` and delete it.

## Unused dependencies

Count the files that import each package:

```bash
node -e "const p=require('./package.json');console.log(Object.keys({...p.dependencies,...p.devDependencies}).join('\n'))" |
while read d; do
  echo "$(git grep -lE "['\"]$d(/[^'\"]*)?['\"]" -- . ':!package.json' ':!package-lock.json' | wc -l) $d"
done | sort -n
```

Zero hits does not mean unused:

- `@types/*` are loaded by the compiler without an import.
- Binaries run by `package.json` scripts and workflows: `next`, `wrangler`, `vitest`, `eslint`,
  `@playwright/test`, `concurrently`, `typescript` (`tsc`).
- Config-only consumers: `@cloudflare/workers-types` (`tsconfig.worker.json` `types`),
  `@tailwindcss/postcss` (`postcss.config.mjs`), `eslint-config-next` (`eslint.config.mjs`).
- Top-level pins of transitive packages. `npm ls <pkg>` shows who else depends on it, and
  `git log -S'"<pkg>"' --oneline -- package.json` shows the commit that added it. `esbuild` and
  `baseline-browser-mapping` are both used by other packages.
- Entries under `overrides` in `package.json`.

Package names are also ordinary words (`pg`, `uuid`, `motion`): a plain-word grep hits SQL and
prose. Use the quoted-specifier recipe above.

Removing a dependency changes `package-lock.json` too, and `npm ci` fails when the two disagree.
If you may not run `npm uninstall`, report the candidate with its evidence and leave
`package.json` alone.
