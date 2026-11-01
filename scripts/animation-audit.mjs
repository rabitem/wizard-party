#!/usr/bin/env node
/**
 * Animation audit runner.
 *
 * Drives the dev-only animation sandbox (/sandbox/animations) in headless Chromium/Edge and
 * runs scenario x theme x collection-mode x viewport combinations on the sandbox's virtual
 * clock. Every run writes a JSON report (and a screenshot when it finds something), and the
 * runner aggregates them into summary.json / summary.md.
 *
 *   node scripts/animation-audit.mjs --axes scenario,collectionAnimation --workers 4
 *   node scripts/animation-audit.mjs --axes scenario,cardTheme,tableTheme,theme,collectionAnimation --shard 2/8 --resume
 *   node scripts/animation-audit.mjs --only scenario=baseline-trick,viewport=phone-portrait --workers 1
 *
 * Options
 *   --url <base>        App origin (default http://localhost:3000)
 *   --out <dir>         Output directory (default .animation-audit/latest)
 *   --axes <list>       Axes to take the full cartesian product of. Axes: scenario, cardTheme,
 *                       tableTheme, theme, collectionAnimation, cardNumberSize, viewport, playerCount
 *   --only <k=v,...>    Restrict axes to values (v may be a|b|c); also fixes axes outside --axes
 *   --skip <k=v,...>    Drop values from axes (v may be a|b|c)
 *   --shard <i/n>       Run only shard i of n (1-based), split round-robin
 *   --workers <n>       Parallel pages (default 3)
 *   --resume            Skip runs whose report already exists in --out
 *   --limit <n>         Stop after n runs (smoke testing)
 *   --seed <n>          Table seed (default 7)
 *   --screenshots <m>   failures (default) | all | none
 *   --browser <path>    Chromium-based browser executable (auto-detects Edge/Chrome)
 *   --engine <name>     chromium | firefox | webkit (Playwright builds) | edge (default: system Edge/Chrome)
 *   --clock <mode>      fast (default, deterministic) | real (wall-clock frame timing)
 *   --perf              Perf profile: the probe samples every Nth frame, its cost reported apart
 *   --preset <name>     Run a named group from PRESETS (or 'all'), each into <out>/<preset>
 *   --headed            Show the browser
 *   --list              Print the run list and exit
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { contextOptionsFor, launchBrowser, openSandbox, readDimensions } from './lib/audit-browser.mjs';
import { AXES, summarize, summaryMarkdown } from './lib/audit-summary.mjs';

const DEFAULTS = {
  cardTheme: 'fantasy',
  tableTheme: 'default',
  theme: 'dark',
  collectionAnimation: 'random',
  cardNumberSize: 'medium',
  viewport: 'laptop',
  playerCount: 4,
};
const RUN_TIMEOUT_MS = 600_000;
/** A theme sweep regenerates every card texture for each of the hundreds of theme combinations. */
const THEME_SWEEP_TIMEOUT_MS = 3_600_000;

const LONG_SCENARIOS = ['theme-sweep', 'perf-round', 'render-budget', 'idle-table-10s', 'room-tour'];
/** Need a driver (Playwright) to be meaningful; batch runs skip them. */
const DRIVER_SCENARIOS = ['real-touch-play'];
const FAULT_SCENARIOS = ['superseded-close', 'offline-online', 'state-burst', 'storage-throws', 'context-loss', 'background-tab', 'social-burst-during-trick', 'reconnect-mid-trick', 'reconnect-missed-trick-complete', 'stall-burst', 'high-latency'];
const INPUT_SCENARIOS = ['baseline-trick', 'lead-drag-throw', 'slow-drop', 'flick-play', 'double-tap-play', 'drag-cancel', 'shuffle-during-flight', 'round-transition', 'game-end'];

/**
 * The audit plan. Every axis that changes motion or timing (collection mode, seat geometry,
 * input/viewport geometry) is crossed with every scenario; the 180 theme combinations are
 * crossed with live animation through the theme-sweep scenario, per collection mode and on
 * a phone and a laptop. `--preset all` runs every group into its own subdirectory.
 */
const PRESETS = {
  collection: { axes: ['scenario', 'collectionAnimation'], skip: { scenario: [...LONG_SCENARIOS, ...DRIVER_SCENARIOS] } },
  players: { axes: ['scenario', 'playerCount'], skip: { scenario: [...LONG_SCENARIOS, ...DRIVER_SCENARIOS], playerCount: ['4'] } },
  // The layout worst case on every viewport and table size: tap targets, legibility, HUD overlap, occlusion.
  playability: { axes: ['viewport', 'playerCount'], only: { scenario: ['max-hand'] } },
  // Network, device and social faults per table size.
  faults: { axes: ['scenario', 'playerCount'], only: { scenario: FAULT_SCENARIOS }, skip: { playerCount: ['4', '5'] } },
  // Deterministic render and React budgets per table theme (count metrics, see e2e/render-budget.spec.ts).
  'render-budget': { axes: ['tableTheme', 'playerCount'], only: { scenario: ['render-budget'] }, runTimeoutMs: 900_000 },
  viewports: { axes: ['scenario', 'viewport'], only: { scenario: INPUT_SCENARIOS }, skip: { viewport: ['laptop'] } },
  'viewport-players': { axes: ['viewport', 'playerCount'], only: { scenario: ['round-transition'] } },
  // Themes change rendering, not layout: every collection mode on a laptop, plus the mixed mode on a phone.
  themes: { axes: ['collectionAnimation'], only: { scenario: ['theme-sweep'] }, runTimeoutMs: THEME_SWEEP_TIMEOUT_MS },
  // Real-time frame budgets: a full round per viewport and player count (run once per --engine).
  perf: { axes: ['viewport', 'playerCount'], only: { scenario: ['perf-round'] }, clock: 'real', perf: true, runTimeoutMs: 900_000 },
  'themes-phone': { axes: ['scenario'], only: { scenario: ['theme-sweep'], viewport: ['phone-portrait'] }, runTimeoutMs: THEME_SWEEP_TIMEOUT_MS },
};
const RUNS_PER_PAGE = 30;

function parseArgs(argv) {
  const options = { url: 'http://localhost:3000', out: '.animation-audit/latest', axes: ['scenario'], only: {}, skip: {}, workers: 3, screenshots: 'failures', seed: 7 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => argv[++index];
    switch (arg) {
      case '--url': options.url = next(); break;
      case '--out': options.out = next(); break;
      case '--axes': options.axes = next().split(',').map((axis) => axis.trim()).filter(Boolean); break;
      case '--only':
        for (const pair of next().split(',')) {
          const [key, value] = pair.split('=');
          options.only[key] = value.split('|');
        }
        break;
      case '--skip':
        for (const pair of next().split(',')) {
          const [key, value] = pair.split('=');
          options.skip[key] = value.split('|');
        }
        break;
      case '--shard': {
        const [shard, total] = next().split('/').map(Number);
        options.shard = { index: shard, total };
        break;
      }
      case '--workers': options.workers = Number(next()); break;
      case '--resume': options.resume = true; break;
      case '--limit': options.limit = Number(next()); break;
      case '--seed': options.seed = Number(next()); break;
      case '--screenshots': options.screenshots = next(); break;
      case '--browser': options.browser = next(); break;
      case '--preset': options.preset = next(); break;
      case '--engine': options.engine = next(); break;
      case '--clock': options.clock = next(); break;
      case '--perf': options.perf = true; break;
      case '--headed': options.headed = true; break;
      case '--list': options.list = true; break;
      default: throw new Error(`Unknown option ${arg}`);
    }
  }
  for (const axis of [...options.axes, ...Object.keys(options.only)]) {
    if (!AXES.includes(axis)) throw new Error(`Unknown axis "${axis}". Axes: ${AXES.join(', ')}`);
  }
  return options;
}

function axisValues(dimensions, axis) {
  if (axis === 'scenario') return dimensions.scenario.map((scenario) => scenario.id);
  if (axis === 'viewport') return dimensions.viewport.map((viewport) => viewport.id);
  return dimensions[axis].map(String);
}

function buildRuns(dimensions, options) {
  let combos = [{}];
  for (const axis of AXES) {
    const allowed = options.only[axis];
    const values = options.axes.includes(axis)
      ? axisValues(dimensions, axis).filter((value) => (!allowed || allowed.includes(value)) && !options.skip[axis]?.includes(value))
      : [allowed?.[0] ?? String(DEFAULTS[axis] ?? axisValues(dimensions, axis)[0])];
    combos = combos.flatMap((combo) => values.map((value) => ({ ...combo, [axis]: value })));
  }

  const runs = combos.map((combo) => ({
    ...combo,
    playerCount: Number(combo.playerCount),
    key: AXES.map((axis) => combo[axis]).join('__'),
  }));
  // Group by viewport so workers rarely need a new browser context.
  runs.sort((a, b) => a.viewport.localeCompare(b.viewport) || a.key.localeCompare(b.key));

  const sharded = options.shard ? runs.filter((_, index) => index % options.shard.total === options.shard.index - 1) : runs;
  return options.limit ? sharded.slice(0, options.limit) : sharded;
}

async function runWorker(workerId, browser, queue, dimensions, options, results) {
  let current = null;

  const release = async () => {
    if (current) await current.context.close().catch(() => undefined);
    current = null;
  };

  while (queue.length > 0) {
    const run = queue.shift();
    const viewport = dimensions.viewport.find((entry) => entry.id === run.viewport);
    try {
      if (!current || current.viewportId !== run.viewport || current.session.runs >= RUNS_PER_PAGE) {
        await release();
        const context = await browser.newContext(contextOptionsFor(viewport, options.engine));
        current = { context, viewportId: run.viewport, session: await openSandbox(context, options.url, { clock: options.clock, perf: options.perf }) };
      }

      const { page, pageErrors } = current.session;
      pageErrors.length = 0;
      const config = {
        id: run.key,
        scenario: run.scenario,
        playerCount: run.playerCount,
        seed: options.seed,
        settings: {
          cardTheme: run.cardTheme,
          tableTheme: run.tableTheme,
          theme: run.theme,
          collectionAnimation: run.collectionAnimation,
          cardNumberSize: run.cardNumberSize,
        },
      };
      const report = await Promise.race([
        page.evaluate((runConfig) => window.__wizardSandbox.run(runConfig), config),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('run timed out')), options.runTimeoutMs ?? RUN_TIMEOUT_MS);
        }),
      ]);
      current.session.runs++;

      for (const message of pageErrors) {
        report.anomalies.push({ code: 'page-error', severity: 'error', t: 0, frame: 0, message, count: 1 });
        report.passed = false;
      }
      report.dimensions = { ...run };

      const hasFindings = report.anomalies.some((anomaly) => anomaly.severity !== 'info');
      if (options.screenshots === 'all' || (options.screenshots === 'failures' && hasFindings)) {
        await page.screenshot({ path: path.join(options.out, 'screenshots', `${run.key}.png`) }).catch(() => undefined);
      }
      await writeFile(path.join(options.out, 'runs', `${run.key}.json`), JSON.stringify(report, null, 2));
      results.push(report);
      const codes = [...new Set(report.anomalies.filter((anomaly) => anomaly.severity !== 'info').map((anomaly) => anomaly.code))];
      console.log(`[w${workerId}] ${report.passed ? 'PASS' : 'FAIL'} ${run.key} ${report.metrics.frames}f ${report.metrics.wallDurationMs}ms ${codes.join(' ')}`);
    } catch (error) {
      console.log(`[w${workerId}] ERROR ${run.key}: ${error.message}`);
      const report = { runId: run.key, scenario: run.scenario, passed: false, dimensions: { ...run }, anomalies: [{ code: 'runner-error', severity: 'error', t: 0, frame: 0, message: String(error.message), count: 1 }], metrics: {} };
      await writeFile(path.join(options.out, 'runs', `${run.key}.json`), JSON.stringify(report, null, 2));
      results.push(report);
      await release();
    }
  }
  await release();
}

async function loadAllReports(out) {
  const directory = path.join(out, 'runs');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const browser = await launchBrowser(options);

  try {
    const dimensions = await readDimensions(browser, options.url);
    const presetNames = options.preset === 'all' ? Object.keys(PRESETS) : options.preset ? [options.preset] : [null];
    for (const presetName of presetNames) {
      if (presetName && !PRESETS[presetName]) throw new Error(`Unknown preset "${presetName}". Presets: ${Object.keys(PRESETS).join(', ')}, all`);
      const preset = presetName ? PRESETS[presetName] : {};
      await runPlan(browser, dimensions, {
        ...options,
        axes: preset.axes ?? options.axes,
        only: { ...preset.only, ...options.only },
        skip: { ...preset.skip, ...options.skip },
        out: presetName ? path.join(options.out, presetName) : options.out,
        runTimeoutMs: preset.runTimeoutMs ?? options.runTimeoutMs,
        clock: preset.clock ?? options.clock,
        perf: preset.perf ?? options.perf,
      });
    }
  } finally {
    await browser.close();
  }
}

async function runPlan(browser, dimensions, options) {
  await mkdir(path.join(options.out, 'runs'), { recursive: true });
  await mkdir(path.join(options.out, 'screenshots'), { recursive: true });
  {
    let runs = buildRuns(dimensions, options);
    if (options.list) {
      for (const run of runs) console.log(run.key);
      console.log(`${runs.length} run(s)`);
      return;
    }
    if (options.resume) runs = runs.filter((run) => !existsSync(path.join(options.out, 'runs', `${run.key}.json`)));
    console.log(`Running ${runs.length} run(s) with ${options.workers} worker(s) -> ${options.out}`);

    const queue = [...runs];
    const results = [];
    const startedAt = Date.now();
    await Promise.all(Array.from({ length: Math.max(1, options.workers) }, (_, index) =>
      runWorker(index + 1, browser, queue, dimensions, options, results)
    ));

    const summary = summarize(await loadAllReports(options.out));
    await writeFile(path.join(options.out, 'summary.json'), JSON.stringify(summary, null, 2));
    await writeFile(path.join(options.out, 'summary.md'), summaryMarkdown(summary));
    console.log(`\nDone in ${Math.round((Date.now() - startedAt) / 1000)}s: ${summary.passed}/${summary.total} passed (all reports in ${options.out}).`);
    for (const code of summary.codes) console.log(`  ${code.code.padEnd(30)} ${code.runs} occurrence(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
