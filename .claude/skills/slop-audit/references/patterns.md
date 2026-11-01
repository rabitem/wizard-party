# Slop patterns beyond dead code

Use with the [verification checklist](../SKILL.md#verification-checklist-no-local-compiler).

## Logging

Server (`party/`): console output is the operator log. `wrangler.jsonc` enables `observability`,
so every line reaches Workers Logs. `eslint.config.mjs` turns `no-console` off for `party/**`, so
lint never flags debug output there: read each call.

- Structured JSON lines (`console.log(JSON.stringify({ level, msg, ... }))`) are intentional:
  `game_command_received` in `party/room/command-pipeline.ts`, `game_event_broadcast` in
  `party/room/room-messaging.ts`, the outboxes (`party/telemetry/durable-object-outbox.ts`,
  `party/tournament/match-result-outbox.ts`; both take an injectable `log`, and
  `match-result-outbox.test.ts` asserts on it) and `party/tournament/tournament-match-controller.ts`.
  Keep them; don't rename a `msg`.
- Plain `[Server] ...` lines in `party/handlers/` and `party/room/room-clockwork.ts` are
  breadcrumbs on the reconnect, grace and timeout paths. Delete one only when a structured line or
  a telemetry fact already records the same event, and name it in the report. Don't reformat them
  in a cleanup pass.
- What happened in a game belongs in telemetry, not in logs: `GameTelemetry.capture()` and
  `record()` (`party/telemetry/telemetry-recorder.ts`), facts under `party/telemetry/`. A log line
  that only repeats a fact is a candidate.

Client and Next.js server (`src/`, `shared/`):

- `no-console` warns on everything but `warn` and `error`. `shared/` has no console calls; keep
  it that way, it runs in the worker and the browser.
- Client diagnostics go through `recordGameTrace` (`src/lib/game-trace.ts`) and
  `src/lib/client-telemetry/` (errors: `error-report.ts`). Expected audio failures use
  `warnAudioOnce` (`src/lib/sound/audio-log.ts`).
- API routes and `src/infrastructure` report failures through `console.error` and
  `console.warn`, mostly as structured JSON (`src/app/api/account/account-route.ts`): keep.
- Slop: `console.log` or `console.debug` anywhere in `src/`, dumps of whole state objects,
  timing prints, `debugger`.

## Comments

Delete:

- Commented-out code. Find it with
  `git grep -nE "^\s*//\s*(const|let|import|export|return|await|if \(|console\.)" -- '*.ts' '*.tsx' '*.mjs'`
  and read every hit: prose that starts with "let" or "if" matches too. Git keeps the history.
- Narration: a comment that restates the next line, changelog voice ("Updated to use X", "New:",
  "Fixed the bug where"), banners around a short file, JSDoc that repeats the signature.
- Comments that describe code that is no longer there. Read the code under each one.

Keep: comments that say why (a browser quirk, a protocol or storage constraint, a race, a link to
`docs/`), JSDoc on ports, public config values and wire types, and `eslint-disable` lines that
give a reason (you cannot check locally whether the rule still fires).

## Wrappers and indirection

Candidates:

- a function or hook whose body is one call with the same arguments;
- a component that only forwards its props;
- a re-export file that is not a feature barrel;
- an option or flag every caller passes with the same value (check every caller with
  `git grep -nw`);
- a class with one method and no state.

Not needless:

- ports and adapters (`shared/application/ports`, `party/room/ports.ts`): the architecture, with
  more than one implementer;
- a wrapper hook that adds `useCallback` or `useMemo`: it keeps identities stable for effects and
  memoized children;
- an `async` wrapper around sync code: removing it changes microtask order and every caller that
  chains `.then`. Leave it unless you have read every caller.

To inline: rewrite each call site to the callee, delete the wrapper, then grep its name.

## Duplicated helpers

Find them by name, then by a distinctive line of the body:

```bash
git grep -nE "^(export )?(const|function) (clamp|lerp|isRecord|asRecord|truncate|sleep|shuffle)\b" -- src shared party ':!*.test.*'
```

- Merge only identical contracts. Same name with different parameters or clamping is two helpers.
- Keep the one copy in the lowest layer every caller may import: `shared/` when `party/` and
  `src/` both need it, `src/lib` or `src/presentation/utils` for client-only code. `shared/` never
  imports from `src/` or `party/`. `party/` imports `shared/` by relative path, not `@shared/`.
- Two private three-line helpers in unrelated features can stay. Deduplicate when the copies
  encode the same rule (a limit, a validation, a format) and would have to change together.

## Duplicated types

- Locations: AGENTS.md, "Files, size and where things go". `RoomSettings` lives only in
  `src/presentation/types/room.types.ts`; confirm there is no second copy:
  `git grep -nE "(interface|type) RoomSettings\b"`.
- Find other names defined twice: `git grep -nE "^(export )?(interface|type) <Name>\b"`. Also
  look for inline object types on either side of the wire that copy a `shared/domain/events` type.
- Replace a copy with an import, or with `Pick`/`Omit` of the canonical type when it is a subset.
  A copy with an extra or optional field is a different type: read both before merging.
- Wire and storage types have one definition, in `shared/`.

## Over-defensive code

Delete checks for states that the types and invariants rule out, on data from inside the
process: `?.` and `??` on non-nullable values, `try`/`catch` around code that cannot throw or that
rethrows unchanged, `typeof x === 'function'` on a typed method, a second validation of data a
use case already validated.

Keep checks on:

- anything from outside the process: WebSocket commands (`party/utils/client-command-parser.ts`),
  HTTP bodies and query strings, `JSON.parse`, Durable Object storage and database rows written
  by older versions, account documents;
- Web Storage, which throws in blocked or private browsers: always through
  `src/lib/storage/safe-storage.ts` (lint enforces it);
- `typeof window` in modules that also run on the server: client components pre-render there;
- the reconnect, pause and timeout paths, where races are real. Find the test or the
  `git log -S` that explains a guard before calling its state impossible;
- `never` defaults in exhaustive switches.

A value that passed through `as`, `!` or `JSON.parse` is only typed, not proven.

## Magic numbers

Move to config: tuning values (timings, sizes, colours, limits, thresholds) and any value used in
more than one file. Put it beside the existing group:

- `src/presentation/config/constants.ts` (`CONSTANTS`) and the feature configs in
  `src/presentation/config/*.config.ts`;
- `src/lib/client-telemetry/client-telemetry.config.ts`;
- worker: `party/config/*.config.ts`;
- domain: `shared/domain/constants/`, `shared/domain/social/social.constants.ts`,
  `shared/domain/tournament/tournament.constants.ts`, `shared/domain/account/account.constants.ts`.

Leave in place: 0, 1, -1, halves, indices, unit conversions (`/ 1000`), a named module constant
used once with a why-comment (`UNSUPPORTED_DATA_CLOSE_CODE` in `party/worker.ts`), and test
literals. Copy the value exactly, `as const` included. Storage keys and persisted ids are
contracts: move them, never rename them.

## Scaffolding

- create-next-app assets: see [dead-code.md](dead-code.md#assets-in-public).
- Template copy in pages, metadata and the README: `git grep -nE "Create Next App|Get started by editing"`.
- Debug pages: dev routes are intentional when gated (`src/app/dev/theme-gallery/page.tsx` and
  `src/app/sandbox/animations/page.tsx` check `NODE_ENV` and `VERCEL_ENV`). An ungated debug page
  is a candidate.
- Fallback or sample data that a route returns when a service is not configured is behaviour, not
  scaffolding: report it, don't delete it.
