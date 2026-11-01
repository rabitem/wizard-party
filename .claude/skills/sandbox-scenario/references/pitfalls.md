# Pitfalls

## Virtual clock

The sandbox page replaces `performance.now`, `Date.now`, `setTimeout`, `setInterval` and
`requestAnimationFrame` with `VirtualClock` (`src/infrastructure/sandbox/virtual-clock.ts`, fixed
60 fps frames). Everything a scenario names is virtual time: `wait`, `timeoutMs`,
`restoreAfterMs`, `settleMs`, network latency and bot pacing.

- Virtual time is not wall time. Under software WebGL on CI a 10 s `wait` costs far more than
  10 s. Wait as long as the behaviour needs and no longer; long runs belong in the `long` group,
  and their tests raise `test.setTimeout`.
- `wait-for` gives up after 15 s virtual by default. Rounds and reconnects with backoff need an
  explicit `timeoutMs`.
- `all-landed` and `trick-collected` count events from the moment the step starts. After a
  `wait-for idle` the current trick is already collected, so `trick-collected` waits for the next
  one and times out if nobody plays.
- `idle` needs 30 idle frames in a row; the instant between two bot plays does not count.
- Code you evaluate in the page runs on virtual timers too: on a paused clock a `setTimeout` never
  fires. Wait in the test process (`page.waitForTimeout`, `expect.poll`); inside sandbox code use
  `clock.realDelay` or `waitUntilReal`. Holds release on events, never on timers.
- Loaders take real time. A snapshot waits for them (up to `SNAPSHOT_LOAD_TIMEOUT_REAL_MS`), a
  checkpoint does not: after a theme switch, `wait` before a checkpoint (the capture scenarios
  also dwell 400 ms before each snapshot).
- On `clock=real` nothing is reproducible, `random` card picks change between runs, and snapshots
  are taken in flight and never held.
- Settings persist in the page's storage. A run with `settings` saves them, and a later run in the
  same page without `settings` inherits them (console and batch runner). Playwright tests get a
  fresh context; `report.config.settings` records what applied.

## Device pixel ratio

Device projects and the viewport matrix run at DPR 2 to 3 (`SANDBOX_VIEWPORTS` in
`sandbox.config.ts`, `devices[...]` in `playwright.config.ts`).

- `handCardPoint()` and `tablePoint()` return CSS px client coordinates, which is what
  `page.mouse`, `page.touchscreen` and CDP `Input.dispatchTouchEvent` take. Never multiply by
  `devicePixelRatio` or derive points from `canvas.width` (drawing-buffer pixels).
- For untrusted events Chromium derives `offsetX/offsetY` in device pixels on scaled displays
  (150 % Windows scaling), and R3F hit-tests with offsets. Synthetic pointers go through
  `dispatch` in `synthetic-pointer.ts`, which pins the offsets to the target's box; never build
  `new PointerEvent(...)` in a spec.
- Aim where a card is visible, not at its centre (`hand-hit-test.ts`): with 20 fanned cards at
  three players the centre of a covered card hits its neighbour.
- `canvasSnapshot()` and snapshot `image` PNGs are drawing-buffer sized. Screenshot baselines are
  per project and platform.
- When an anomaly shows up on one project only, compare `environment.devicePixelRatio`,
  `formFactor` and `touch` first.

## Lost WebGL context

- Simulate a GPU loss only with `{ op: 'lose-context', restoreAfterMs }`. It uses
  `WEBGL_lose_context` (a browser without it fails the step), restores after `restoreAfterMs`
  (default `SANDBOX_FAULTS.CONTEXT_RESTORE_AFTER_MS`) and waits up to
  `SANDBOX_AUDIT.CONTEXT_RESTORE_TIMEOUT_MS` for a drawn frame, else `context-not-restored`.
- While the context is lost the game pauses its frame loop (`WebGLContextHandler.tsx`) and the
  run suppresses `render-stall`. Any other way of losing the context (removing the canvas, calling
  the extension from a spec) bypasses both and reports noise.
- A renderer that never started reports `webgl-unavailable` with the GL errors instead of a
  readiness timeout: an environment problem, not a game bug. An unscripted loss mid-run shows in
  the timeline as the game's `[WebGL] Context lost` warning; read anomalies after it with that in
  mind, and rerun on one project before chasing them.

## Game rules the script must respect

- A superseded close (code 4000) never reconnects by itself: follow it with `take-over-seat`
  before `wait-for connected`.
- A `sort` during a shuffle is dropped on purpose: `wait-for hand-idle` between them.
- Faults are reverted before the settle phase, so the report judges a healthy browser; a fault
  that must end mid-scenario still needs its own step (`online`, `storage-fault` `off`,
  `visibility` `visible`).
- The fixture answers every `**/api/**` request with 204. A scenario never reaches real services;
  do not add one that needs them.
