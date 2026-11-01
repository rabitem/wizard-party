import { RENDER_BUDGET_SCENARIO } from '../../config/sandbox-budgets.config';
import { TABLE_THEMES, THEME_PRESETS } from '../settings';
import { finishTrick, playOnTurn } from './sandbox-scenarios';
import type { SandboxScenario, SandboxStep } from './sandbox.types';

/** Settles a theme switch (textures, environment) before a snapshot freezes the frame. */
const THEME_DWELL_MS = 400;
/** Rounds at server pace; generous because a round's length grows with the hand. */
const ROUND_TIMEOUT_MS = 240000;

/**
 * Layout worst case and input realism: the largest hand the table size deals (60 / players
 * cards), audited while bidding, on the player's turn and with a full trick on the table; touch
 * drags, a second finger landing mid-drag, and real device touch input from the driver.
 */
export const PLAYABILITY_SCENARIOS: readonly SandboxScenario[] = [
  {
    id: 'max-hand',
    title: 'The largest hand of the table size: bidding, your turn and a full trick, audited for playability',
    covers: ['max-hand', 'layout', 'tap-targets', 'legibility', 'hud-overlap', 'bidding', 'collection'],
    table: { round: 'max', leadSeat: 1, startPhase: 'BIDDING' },
    steps: [
      { op: 'wait-for', until: 'bidding' },
      { op: 'wait-for', until: 'hand-idle' },
      { op: 'checkpoint', label: 'bidding-max-hand' },
      { op: 'bid' },
      { op: 'wait-for', until: 'local-turn' },
      { op: 'wait-for', until: 'hand-idle' },
      { op: 'checkpoint', label: 'turn-max-hand' },
      { op: 'play' },
      { op: 'wait-for', until: 'all-landed' },
      { op: 'checkpoint', label: 'trick-on-table' },
      ...finishTrick,
    ],
  },
  {
    id: 'touch-drag-throw',
    title: 'You lead with a fast drag throw by finger',
    covers: ['touch', 'drag', 'local-throw', 'collection'],
    table: { leadSeat: 0 },
    steps: [...playOnTurn({ op: 'play', via: 'drag-throw', pointer: 'touch' }), ...finishTrick],
  },
  {
    id: 'second-finger-drag',
    title: 'A second finger lands, moves and lifts mid-drag; the first finger puts the card back, then you play by tap',
    covers: ['touch', 'multi-touch', 'drag', 'hand-return', 'double-tap'],
    table: { leadSeat: 0 },
    steps: [
      { op: 'wait-for', until: 'local-turn' },
      { op: 'play', card: 'first', via: 'drag-second-finger', pointer: 'touch' },
      { op: 'wait', ms: 600 },
      { op: 'play', card: 'last', via: 'double-tap', pointer: 'touch' },
      ...finishTrick,
    ],
  },
  {
    id: 'real-touch-play',
    title: 'The driver plays a card with real device touch input (CDP touch events or the touchscreen)',
    covers: ['touch', 'real-input', 'drag', 'double-tap', 'collection'],
    table: { leadSeat: 0 },
    steps: [
      { op: 'wait-for', until: 'local-turn' },
      { op: 'wait-for', until: 'hand-idle' },
      // The driver plays here; without one the autoplayer does, so batch runs still complete.
      { op: 'external', label: 'touch-play' },
      { op: 'autoplay', enabled: true },
      ...finishTrick,
      { op: 'autoplay', enabled: false },
    ],
  },
];

/** One frozen frame per table theme, then per UI theme, on a quiet table waiting for your lead. */
function themeTour(count: number, setting: 'tableTheme' | 'theme', label: string): SandboxStep {
  return {
    op: 'repeat',
    times: count,
    steps: [
      { op: 'wait', ms: THEME_DWELL_MS },
      { op: 'snapshot', label, hold: true },
      { op: 'settings', patch: setting === 'tableTheme' ? { tableTheme: 'next' } : { theme: 'next' } },
    ],
  };
}

/**
 * Reference frames for visual regression: every table theme (environment, lighting, effects)
 * and every UI theme over the same quiet table. Each snapshot freezes the clock, audits the
 * layout and, with a driver attached, holds so it can compare the frame against its baseline.
 */
export const ROOM_TOUR_SCENARIO: SandboxScenario = {
  id: 'room-tour',
  title: 'Every table theme and UI theme over a quiet table, snapshotted for visual baselines',
  covers: ['visual', 'table-theme', 'ui-theme', 'environment', 'occlusion', 'legibility'],
  table: { round: 3, leadSeat: 0 },
  steps: [
    { op: 'wait-for', until: 'local-turn' },
    { op: 'wait-for', until: 'idle' },
    themeTour(TABLE_THEMES.length, 'tableTheme', 'room-{tableTheme}'),
    themeTour(THEME_PRESETS.length, 'theme', 'ui-{theme}'),
  ],
};

/**
 * Deterministic render and React budgets (run on the fast clock): a warm-up round compiles
 * shaders and uploads textures; then a settled table is measured idle, and a whole warm round
 * is measured at server pace (see RENDER_BUDGETS and REACT_BUDGETS).
 */
export const RENDER_BUDGET_SCENARIO_DEFINITION: SandboxScenario = {
  id: RENDER_BUDGET_SCENARIO.ID,
  title: 'Warm-up round, an idle table, then a measured warm round, for render and React budgets',
  covers: ['performance', 'render-budget', 'react-commits', 'texture-uploads', 'shader-links'],
  table: { round: RENDER_BUDGET_SCENARIO.WARMUP_ROUND, leadSeat: 1 },
  steps: [
    { op: 'autoplay', enabled: true },
    { op: 'wait-for', until: 'round-end', timeoutMs: ROUND_TIMEOUT_MS },
    { op: 'autoplay', enabled: false },
    { op: 'wait-for', until: 'idle' },
    { op: 'measure-start', label: RENDER_BUDGET_SCENARIO.IDLE_WINDOW },
    { op: 'wait', ms: RENDER_BUDGET_SCENARIO.IDLE_MS },
    { op: 'measure-end', label: RENDER_BUDGET_SCENARIO.IDLE_WINDOW },
    { op: 'measure-start', label: RENDER_BUDGET_SCENARIO.WARM_ROUND_WINDOW },
    { op: 'autoplay', enabled: true },
    { op: 'wait-for', until: 'playing', timeoutMs: ROUND_TIMEOUT_MS },
    { op: 'wait-for', until: 'round-end', timeoutMs: ROUND_TIMEOUT_MS },
    { op: 'measure-end', label: RENDER_BUDGET_SCENARIO.WARM_ROUND_WINDOW },
    { op: 'autoplay', enabled: false },
    { op: 'wait-for', until: 'idle' },
  ],
};

/** Ten seconds of a table waiting for your lead: nothing should re-render, upload or redraw shadows. */
export const IDLE_TABLE_SCENARIO: SandboxScenario = {
  id: 'idle-table-10s',
  title: 'The table waits 10 s for your lead, measured for idle render and React work',
  covers: ['performance', 'idle', 'react-commits', 'shadow-map'],
  table: { leadSeat: 0 },
  steps: [
    { op: 'wait-for', until: 'local-turn' },
    { op: 'wait-for', until: 'idle' },
    { op: 'measure-start', label: 'idle' },
    { op: 'wait', ms: 10000 },
    { op: 'measure-end', label: 'idle' },
  ],
};
