# Testing

How the game is tested, how to run each level, what CI runs and where a test goes. Read it
before you add a test or touch a workflow. The animation sandbox that levels 5 and 6 drive is
described in [sandbox-framework.md](sandbox-framework.md); the in-process client-and-server suites
in [test/integration/README.md](../../test/integration/README.md). The room under test is
described in [../server/room.md](../server/room.md).

## Boundaries

A contract is tested at the cheapest boundary that can observe it. The levels (domain, use case,
room harness, full stack in process, sandbox in a browser, Playwright, realtime smoke), what each
one sees and what it costs are in
[boundaries.md](../../.claude/skills/test-audit/references/boundaries.md). That page is the only
copy of the table.

Every new or changed test passes the authoring gate in the
[test-audit skill](../../.claude/skills/test-audit/SKILL.md): which contract it protects, which
regression turns it red, why existing proof misses it, and whether it needs a production seam.
Pruning an area follows [audit.md](../../.claude/skills/test-audit/references/audit.md).

Vitest runs in the `node` environment (`vitest.config.ts`); the repo has no DOM test library.
Contracts that live in the browser are proven by the sandbox and Playwright, not by jsdom.

## Running each level

| Level | Command | Needs |
| --- | --- | --- |
| 1 Domain, 2 Use case | `npm test` | Nothing |
| 3 Room harness | `npm test -- party/room` | Nothing: in-memory storage, fake timers |
| 4 Full stack in process | `npm test -- test/integration` | Nothing: fake timers, loopback sockets |
| 5 Sandbox in a browser | `npm run dev`, then open `/sandbox/animations` | A browser with WebGL |
| 6 Playwright | `npm run e2e:build`, then `npm run e2e -- --project=chromium <spec>` | A production build with the sandbox route |
| Realtime smoke | `npm run dev:party`, then `node scripts/realtime-smoke.mjs` | The worker on port 1999 |

`npm test` is `vitest run`. It collects the files Vitest's default include matches (`*.test.ts`,
`*.test.tsx`) except `e2e/`, `.claude/worktrees/` and `.animation-audit/` (`vitest.config.ts`), so
levels 1 to 4 run together. Arguments after `--` go to Vitest: a path narrows the files,
`-t "<name>"` narrows by test name.

```bash
npm test
npm test -- party/room/reconnect.test.ts
npm run test:physics
```

`npm run test:physics` runs the card-animation, drag and physics-boundary unit tests only. The
files are listed in the script in `package.json`.

The CI `verify` job also runs these:

```bash
npm run typecheck
npm run lint
npm run build
npm run check:worker
```

`typecheck` runs `tsc` twice, once for the app and once with `tsconfig.worker.json` for
`party/worker.ts` and what it imports. `check:worker` is `wrangler deploy --dry-run`.

### Browser suites (levels 5 and 6)

`npm run e2e:build` runs `scripts/e2e-build.mjs`, which is `next build` with
`NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX=1`; that keeps the sandbox route in a production build.
`npm run e2e` is `playwright test`. Playwright starts `next start` on port 3210 from that build and
reuses a server that is already there, so stop a server left over from a plain `npm run build`
(the fixture names this fix when the route answers 404).

```bash
npm run e2e:build
npm run e2e -- --project=webkit e2e/reconnect.spec.ts
npm run e2e -- --grep "baseline-trick"
```

Projects are set in `playwright.config.ts`:

| Project | Runs | Notes |
| --- | --- | --- |
| `chromium`, `firefox`, `webkit`, `edge` | Every sandbox spec except the matrix and the golden path | `edge` uses the installed Microsoft Edge (`channel: 'msedge'`); no workflow runs it |
| `android-phone`, `iphone`, `iphone-landscape`, `ipad` | The sandbox specs except `performance`, `render-budget`, the matrix and the golden path | Device emulation |
| `viewport-matrix` | `e2e/playability-matrix.spec.ts` | Chromium; key viewports, or all with `E2E_FULL_MATRIX=1` |
| `golden-path` | `e2e/golden-path.spec.ts` | The real app, no sandbox; see below |

The specs and the contract each owns:

| Spec | Owns |
| --- | --- |
| `scenarios.spec.ts` | Throws, landing, collection styles, shuffle and sort, special cards, game end |
| `viewports.spec.ts` | Layout and playability per device project and table size |
| `playability-matrix.spec.ts` | The largest hand on the viewport matrix (`SANDBOX_VIEWPORTS`, `src/presentation/config/sandbox.config.ts`) |
| `reconnect.spec.ts` | Drops, stalls and slow links mid-trick and across a trick completion |
| `faults.spec.ts` | Superseded connection, offline, state storms, throwing storage, lost WebGL context, hidden tab, social floods |
| `input.spec.ts` | Synthetic touch, and a card played with real device touch |
| `render-budget.spec.ts` | Render and React count budgets, per table size and per table theme |
| `performance.spec.ts` | Frame-time budgets on the real clock (titles contain `sustains`) |
| `visual.spec.ts` | Reference frames per table theme and UI theme |
| `golden-path.spec.ts` | A guest plays a one-round game in the real app, reloads into the same seat and reaches the results |

The golden path needs a production build and a worker on `localhost:1999`. A page served from
`localhost` plays against that worker (`LOCAL_REALTIME_HOST`) unless the build names a realtime host
with `NEXT_PUBLIC_REALTIME_HOST` (`getDefaultHost` in
`src/presentation/components/room-browser/utils.ts`).

```bash
npm run build
npm run dev:party
npm run e2e -- --project=golden-path
```

Playwright reads these environment variables:

| Name | Where | Default | Purpose |
| --- | --- | --- | --- |
| `E2E_BASE_URL` | `playwright.config.ts` | Unset: Playwright starts `next start` | Point the suites at a server that is already running |
| `E2E_PORT` | `playwright.config.ts` | `3210` | Port of the server Playwright starts |
| `E2E_WORKERS` | `playwright.config.ts` | `2` | Parallel workers; a sandbox run drives a whole game client, so keep it low |
| `E2E_FULL_MATRIX` | `e2e/playability-matrix.spec.ts` | Unset | `1` runs every viewport at every table size; unset runs the key viewports at the smallest and largest table |
| `PERF_TARGET_FPS` | `e2e/performance.spec.ts` | `FRAME_BUDGETS.DEFAULT_TARGET_FPS` | Frame rate the p95 frame time must sustain |
| `CI` | `playwright.config.ts` | Unset | Set: one retry, `test.only` is an error, the line reporter |

Reports go to `e2e-report/` (HTML) and `e2e-results/` (traces, screenshots of failures). Both are
git-ignored.

`npm run audit:animations` (`scripts/animation-audit.mjs`) runs the sandbox scenarios across axes
(scenario, themes, viewport, player count) in a local browser against a running app at
`--url` (default `http://localhost:3000`). It writes `summary.json` and `summary.md` to
`.animation-audit/latest`. Presets are named in the script (`--preset playability`, `faults`,
`render-budget`, `perf` and others).

## CI

GitHub Actions is the source of truth for the checks. Two workflows run tests.

| Workflow | Runs on | What it runs |
| --- | --- | --- |
| `.github/workflows/ci.yml`, job `verify` | Pull requests to `main`, pushes to `main`, manual dispatch | `npm ci`, `typecheck`, `lint`, `npm test`, `build`, `check:worker`, then the realtime smoke and the golden path |
| `.github/workflows/e2e.yml`, "Browser suites" | Pull requests labelled `e2e`, a weekly schedule, manual dispatch | `npx playwright test --project=<project> --grep-invert "sustains"`, one job per project |

### The verify job

After the build the job installs Chromium, starts `npm run dev:party` in the background, waits for
`http://localhost:1999/health`, then runs two checks against that one worker:

1. `node scripts/realtime-smoke.mjs` opens raw WebSockets. It checks `/health`, CORS preflight,
   the HTTP availability route, three clients joining one room, adding and removing a bot, a
   retry-safe `START_GAME`, hidden hands of other seats, reconnect by persistent id, the room
   status, the tournament room gate and protocol-2 seat tokens. It checks the worker's shape on a
   dealt round; bidding, card play and scoring belong to levels 3 and 4 and the golden path.
2. `npx playwright test --project=golden-path` plays the build the job made, in Chromium.

If either fails the job prints the worker log. A failed or cancelled job uploads the `golden-path`
artifact (`e2e-report/`, `e2e-results/`).

### Browser suites

- **Pull request.** The `e2e` label runs the `chromium` and `android-phone` projects on every push
  to the PR.
- **Weekly run.** Sunday 03:00 UTC, every project except `edge` (`chromium`, `firefox`, `webkit`,
  the four device projects and `viewport-matrix`), with `E2E_FULL_MATRIX=1` for the viewport
  matrix.
- **Manual dispatch.** The same projects, the viewport matrix on its key viewports. The inputs are
  `grep` (Playwright `--grep`) and `update_snapshots` (see [Visual baselines](#visual-baselines)).

Each project is a job with its own browser install and `npm run e2e:build`. A failed or cancelled
job uploads `e2e-<project>`; see `.claude/skills/pull-request/references/ci.md` for downloading it.

### Runner minutes are limited

Hosted runners have no GPU, so WebGL renders in software. One sandbox run takes minutes there, and
a full matrix costs many runner hours. So:

- Dispatch `e2e.yml` with a narrow `grep` for the tests you changed:
  `gh workflow run e2e.yml --ref <branch> -f grep="<part of a test title>"`.
- Use the `e2e` label only for a change to rendering, input or layout.
- Run what you can locally: levels 1 to 4 need no browser.
- Frame-time budgets never run on CI: `--grep-invert "sustains"`.

Count-based checks hold in software WebGL exactly as on a GPU: animation invariants, layout,
render and React budgets, faults and visual baselines. Frame-time budgets do not. Each report
records the renderer in `environment.webgl`, and a software renderer is flagged as an `info`
anomaly.

## Budgets

The render, React, frame-time, playability and visual budgets are in
`src/presentation/config/sandbox-budgets.config.ts`. The file is constants and pure functions
without imports, so the Playwright suites import it directly. The assertions are in
`e2e/support/budgets.ts`. The motion and layout thresholds of the audit itself are `SANDBOX_AUDIT`
in `src/presentation/config/sandbox.config.ts`.

| Constant | Judges | Checked in |
| --- | --- | --- |
| `RENDER_BUDGETS` | Draw calls, shadow draws, triangles, programs, shader links after warm-up, texture uploads and growth, lights | `e2e/render-budget.spec.ts` on the virtual clock, every table size and every table theme |
| `REACT_BUDGETS` | R3F commits while idle, components per R3F commit, DOM commits per idle second | `e2e/render-budget.spec.ts` |
| `FRAME_BUDGETS` | p95 frame time at the target fps, main-thread work per frame, probe cost | `e2e/performance.spec.ts`, real clock, perf mode, real hardware |
| `PLAYABILITY_BUDGETS`, `OCCLUSION_PROBE`, `HUD_REGIONS` | Tap targets, legibility, HUD overlap, blocked sight lines | The playability audit of the `checkpoint` and `snapshot` steps |
| `VISUAL_BUDGETS` | Pixel diff ratio, pixel threshold, masked regions | `e2e/visual.spec.ts` |

Budgets that gate CI are counts, so a regression names what grew. Run the frame-time budgets on
real hardware:

```bash
npm run e2e:build
npm run e2e:perf
PERF_TARGET_FPS=120 npm run e2e:perf
```

`e2e:perf` runs `e2e/performance.spec.ts` on `chromium`, `firefox`, `webkit` and `edge`. Playwright's
WebKit build on Windows has no Web Audio and often no GPU WebGL: treat it as a smoke run there.

## Visual baselines

`e2e/visual.spec.ts` plays the `room-tour` scenario with a driver attached. Each table theme and
each UI theme freezes the clock on a quiet table and holds, and the spec compares the page with
`toHaveScreenshot` before it releases the hold. Baselines are stored per project and platform in
`e2e/visual.spec.ts-snapshots/` (`snapshotPathTemplate` in `playwright.config.ts`).

Baselines differ between GPUs and font stacks, so they are generated on CI only:

1. Dispatch the "Browser suites" workflow with `update_snapshots` checked. It runs only
   `e2e/visual.spec.ts`, on `chromium`, `firefox`, `webkit` and the four device projects (not
   `viewport-matrix`).
2. Download the `visual-baselines-<project>` artifacts.
3. Copy their contents into `e2e/visual.spec.ts-snapshots/` and commit.

A frame without a baseline is annotated `missing-baseline` and not compared; it does not fail the
test. Mask an animated DOM
region with a `data-visual-mask` attribute; the other masked selectors are
`VISUAL_BUDGETS.MASK_SELECTORS`.

## Adding things

- **A rule, score or bot decision.** A table-driven test next to the source in `shared/domain/**`
  (level 1).
- **A use case.** A test next to it in `shared/application/use-cases/**` with in-memory ports
  (level 2).
- **A server flow, timer, pause or reconnect.** A suite in `party/room/` on
  `party/test-support/room-harness.ts` (level 3). Build tables with
  `party/test-support/table-driver.ts`, never by writing state by hand.
- **A flow where the client's state, retries or screen matter.** A file
  `test/integration/<flow>.integration.test.ts` on `FullStackTable` (level 4). Helpers go in
  `test/integration/support/`.
- **A hook or a pure helper.** A test next to it. Tests live beside their source as `*.test.ts`.
- **An API route.** Call the route handler with a `Request` and in-memory adapters for its ports.
  Never the production database or Upstash.
- **An animation, layout, input or fault contract.** A scenario in
  `src/presentation/components/sandbox/`, then its id in the list of the owning spec in `e2e/`
  (see [sandbox-framework.md](sandbox-framework.md#adding-things) and the
  [sandbox-scenario skill](../../.claude/skills/sandbox-scenario/SKILL.md)).
- **A render or React budget.** The constant in `sandbox-budgets.config.ts` and the assertion in
  `e2e/support/budgets.ts`.
- **A table theme or UI theme.** It joins the `visual` spec through the `room-tour` scenario and,
  for a table theme, `render-budget.spec.ts` through `window.__wizardSandbox.dimensions()`, without
  a spec change. The visual baselines are regenerated on CI.
- **A check of the worker's shape.** A step in `scripts/realtime-smoke.mjs`, only for what raw
  sockets against `wrangler dev` can see.

Tests are deterministic: seeded randomness (`src/infrastructure/sandbox/seeded-random.ts`, the
`IRandom` port in `shared/domain/ports`), fake or virtual clocks and no call to an external
service. Seeds and timestamps are constants in the test.
