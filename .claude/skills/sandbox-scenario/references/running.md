# Running a scenario and reading its report

## In a browser

`npm run dev` and open `http://localhost:3000/sandbox/animations`. Production builds serve the
route only when built with `npm run e2e:build` (`NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX=1`, see
`src/app/sandbox/animations/page.tsx`); Vercel preview deployments serve it too.

| Query | Effect |
| --- | --- |
| `clock=play` (default) | Virtual clock at real pace, to watch a run |
| `clock=fast` / `paused` | Virtual clock fast-forward (what the suites use) / stepped by hand |
| `clock=real` | Wall-clock frames, not deterministic: frame timing only |
| `perf=1`, `probe=N` | Perf profile (`sandbox-profile.ts`) |
| `ui=0` | No control panel |

The control panel runs any registered scenario with a player count and seed, lists anomalies and
copies the report JSON. From the console (`WizardSandboxApi` in `sandbox-agent-api.ts`):

```js
const report = await __wizardSandbox.run({ scenario: 'baseline-trick', playerCount: 4 });
report.anomalies.filter((anomaly) => anomaly.severity !== 'info');

// Draft a scenario without editing files:
await __wizardSandbox.run({ playerCount: 3, scenario: {
  id: 'draft', title: 'draft', covers: [], table: { leadSeat: 0 },
  steps: [{ op: 'wait-for', until: 'local-turn' }, { op: 'play', via: 'flick' },
          { op: 'wait-for', until: 'trick-collected' }, { op: 'wait-for', until: 'idle' }],
} });
```

While a run is going: `status()` (step, held), `game()` (phase, hand, playable ids, animation
flags), `clock.mode('paused')` and `await clock.step(n)`, `drawBreakdown()`, `canvasSnapshot()`.
One run at a time per page; a second `run()` rejects. DOM commit counts are `null` in a page you
opened yourself: only the Playwright fixture installs the React hook before React loads.

Batch runs across axes use a running app (`--url`, default `http://localhost:3000`):

```bash
npm run audit:animations -- --only scenario=<id> --workers 1
npm run audit:animations -- --axes scenario,playerCount --only scenario=<id>
```

Reports and `summary.md` land in `.animation-audit/latest/` (git-ignored).

## Playwright on your machine

```bash
npm run e2e:build
npx playwright test e2e/scenarios.spec.ts --project=chromium -g "<id> with 4 players plays cleanly"
```

The config starts `next start` on port 3210 (`E2E_PORT`) or uses `E2E_BASE_URL`. Each run
attaches `<runId>.json` (and `<runId>.png` when it fails) to the test, and a `webgl` annotation
names the renderer. HTML report in `e2e-report/`, traces in `e2e-results/`. Playwright's WebKit on
Windows is a smoke run only.

## On CI

`.github/workflows/e2e.yml` ("Browser suites"). Runner minutes are the budget: a software-WebGL
run takes minutes, and every job installs a browser and builds the app before it filters.

- Do not label the pull request `e2e` to prove one scenario. The label runs every suite on
  `chromium` and `android-phone`, again on every push while it is on.
- Dispatch with a grep that only the intended test titles contain:

  ```bash
  gh workflow run e2e.yml --ref <branch> -f grep="<id> with 4 players plays cleanly"
  gh run list --workflow e2e.yml --limit 1
  gh run watch <run-id>
  ```

  Ids overlap (`drag-throw` is inside `lead-drag-throw` and `touch-drag-throw`), so include the
  title's verb or player count.
- A dispatch starts two shard jobs per project (every project in `playwright.config.ts`: desktop
  engines, devices, the matrices, the golden path). A shard without a matching test passes
  (`--pass-with-no-tests`). Read only the jobs you meant.
- Frame-time tests (titles with "sustains") never run on CI (`--grep-invert "sustains"`).
- Failed or cancelled jobs upload `e2e-<project>-<shard>` (`e2e-report/`, `e2e-results/`, 7 days):
  `gh run download <run-id> -n e2e-chromium-1`. Passing jobs upload nothing.
- `update_snapshots: true` regenerates visual baselines (only `e2e/visual.spec.ts`) as
  `visual-baselines-<project>` artifacts; copy them into `e2e/visual.spec.ts-snapshots/`.

## Reading the report

`AuditReport` is in `sandbox-report.types.ts`. `passed` means no `warn` or `error` anomaly;
`expectCleanRun` prints each finding as `severity code @t ms: message`. Severities are in
`ANOMALY_SEVERITY` (`audit-log.ts`).

- `anomalies[]`: `code`, `severity`, `t` (virtual ms since run start), `frame`, `subject` (card,
  object or label), `count` (deduplicated by code and subject), `data`.
- `timeline[]`: `run`, `step`, `server`, `client`, `mount`, `unmount` and `state` entries with
  `t` and `frame`, capped at 1500. Steps carry their `describeStep` label; `console.warn` lands
  here as `client` entries. Read it around an anomaly's `t`.
- `metrics`: frames, virtual and wall duration, server messages, played and collected cards,
  `render`, `react`, and `windows`.
- `snapshots[]`: label, whether it was held, the settings, scene facts.
- `environment`: user agent, `devicePixelRatio`, `touch`, `formFactor`, profile, and `webgl`
  (renderer, `software`).
- `config`: the run config with the settings actually applied and the viewport.

Triage by code:

| Code | Read it as |
| --- | --- |
| `wait-timeout` | The script waited for something that never came. `data` is the run state (phase, turn, playable count, trick flags, queued cards, hand animation, pending deliveries, bot scheduled). Subject `ready`: the client never connected and rendered |
| `step-failed` | A step threw; the message names it (card not played, hand card never interactive, no open measurement window) |
| `webgl-unavailable` | The renderer never started; environment, not game |
| `console-error`, `page-error` | `data.phase` says when (teardown of the previous mount, load, scenario, settle); `data.stack` where |
| `teleport`, `path-kink`, `rotation-pop`, `handoff-*`, `double-render`, `remount-flicker` | Motion bugs on the track named by `subject` |
| `premature-*`, `collect-before-landed`, `skipped-*`, `trick-overlap` | Trick lifecycle order |
| `not-settled`, `*-stuck`, `hand-count-mismatch` | End state after settling |
| `hud-offscreen`, `page-overflow` | Page layout, checked at the end of every run and at checkpoints |
| `hud-overlap`, `hud-occludes-scene`, `tap-target-small`, `scene-text-unreadable`, `scene-occluded`, `hand-translucent` | Playability at a checkpoint or snapshot |
| `context-not-restored`, `hold-timeout` | Fault recovery, driver never released |
