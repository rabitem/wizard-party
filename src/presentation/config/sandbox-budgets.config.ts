/**
 * Budgets the animation sandbox judges a run against: render resources, React work, frame time,
 * playability of the layout and visual-diff tolerance.
 *
 * Render and React budgets are counts (draw calls, uploads, shader links, commits), so they are
 * deterministic on the virtual clock and hold on CI's software renderer as well as on real GPUs.
 * Frame-time budgets only mean something on real hardware (clock=real).
 *
 * Pure constants and functions without imports: the Playwright suites import this file directly.
 */

/** Perf mode (`?perf=1`): measure the game, not the probe. */
export const SANDBOX_PERF_PROFILE = {
  /** URL parameter that switches the sandbox into perf mode. */
  PARAM: 'perf',
  /** URL parameter overriding the probe's sampling stride. */
  STRIDE_PARAM: 'probe',
  /** In perf mode the probe samples card transforms every Nth frame (render counters stay per frame). */
  PROBE_SAMPLE_STRIDE: 10,
  /** Upper bound for an explicit stride, so a typo cannot switch sampling off for minutes. */
  MAX_PROBE_SAMPLE_STRIDE: 120,
} as const;

export const RENDER_BUDGETS = {
  /**
   * Draw calls per frame (all passes: shadow maps, main pass, post-processing): a fixed share for
   * room, table and post-processing plus a share per seat (opponent hand, name plate, chips).
   * 140 + 10 x 6 = 200 at six players, the target of the render-budget architecture.
   */
  DRAW_CALLS_BASE: 140,
  DRAW_CALLS_PER_PLAYER: 10,
  /** A single frame may exceed the mean budget by this factor (a card mounting, a trick landing). */
  DRAW_CALLS_PEAK_FACTOR: 1.5,
  /** Shadow-pass draw calls in one frame while cards move. */
  SHADOW_DRAW_CALLS_MAX: 30,
  /** Shadow-pass draw calls while nothing moves: casters are static, the shadow map need not re-render. */
  IDLE_SHADOW_DRAW_CALLS_MAX: 0,
  /** Mean triangles per frame. The table measured about 43k; this catches an unbatched or unbounded mesh. */
  TRIANGLES_MEAN_MAX: 150_000,
  /** Linked shader programs once the scene is up. */
  PROGRAMS_MAX: 40,
  /** Shader links after warm-up (a round already played): every link is a visible hitch. */
  WARM_PROGRAM_LINKS_MAX: 0,
  /** Texture uploads in a warm round: one face per dealt card plus a few for UI and effects. */
  WARM_TEXTURE_UPLOAD_SLACK: 10,
  /** Texture uploads while the table is idle. */
  IDLE_TEXTURE_UPLOADS_MAX: 0,
  /** GPU textures may grow by at most this much over one played round (leak signal). */
  TEXTURE_GROWTH_PER_ROUND_MAX: 8,
  /** Visible punctual lights (point, spot, directional) in the scene. */
  LIGHTS_MAX: 8,
} as const;

export const REACT_BUDGETS = {
  /** R3F commits while the table is idle: an idle scene has nothing to reconcile. */
  IDLE_R3F_COMMITS_MAX: 0,
  /** Components rendered in one R3F commit; a full-table re-render renders several hundred. */
  R3F_RENDERS_PER_COMMIT_MAX: 400,
  /** DOM commits per second while idle (a ticking timer is fine; a render loop is not). */
  IDLE_DOM_COMMITS_PER_SECOND_MAX: 2,
} as const;

export const FRAME_BUDGETS = {
  /** Frame rate the p95 frame time must sustain unless PERF_TARGET_FPS says otherwise. */
  DEFAULT_TARGET_FPS: 60,
  /** p95 may exceed the ideal frame time by this factor before the budget counts as missed. */
  P95_SLACK: 1.1,
  /** Main-thread work per frame (useFrame + render submission, probe excluded) as a share of the frame budget. */
  CPU_SHARE_OF_FRAME: 0.6,
  /** Mean probe cost per frame in perf mode; above this the probe distorts what it measures. */
  PROBE_MS_MEAN_MAX: 0.5,
} as const;

export interface InputBudget {
  touch: number;
  pointer: number;
}

export interface FormFactorBudget {
  phone: number;
  tablet: number;
  desktop: number;
}

export const PLAYABILITY_BUDGETS = {
  /**
   * Exposed width of each hand card, in CSS px: the widest strip where a tap selects that card,
   * found by hit-testing the scene (other cards of its row and any row in front cover the rest).
   * Touch uses the WCAG 2.5.8 minimum target size; a mouse can hit a narrower strip.
   */
  MIN_HAND_CARD_TAP_PX: { touch: 24, pointer: 12 },
  /** Projected em height of 3D labels (names, bids, owners) in CSS px. */
  MIN_SCENE_TEXT_PX: { phone: 9, tablet: 10, desktop: 11 },
  /** Share of one hand card that may lie outside the viewport. */
  HAND_MAX_HIDDEN_FRACTION: 0.15,
  /** Overlaps smaller than this (CSS px on either axis) are borders touching, not overlap. */
  OVERLAP_TOLERANCE_PX: 2,
  /** A HUD element covering more than this share of a played card or 3D label hides it. */
  SCENE_COVER_MAX_FRACTION: 0.25,
  /** A HUD element covering more than this share of a hand card's tap strip steals its taps. */
  HAND_COVER_MAX_FRACTION: 0.5,
  /** Hand cards must be at least this opaque while the player reads them (bidding, own turn). */
  HAND_MIN_OPACITY_WHILE_READING: 0.85,
} as const;

/**
 * How the playability audit finds HUD panels in the DOM. Elements tagged data-hud-region are
 * authoritative; without any tag it falls back to positioned (fixed/absolute) elements that draw
 * something (an opaque background, a backdrop blur) or hold controls.
 */
export const HUD_REGIONS = {
  ATTRIBUTE: 'data-hud-region',
  /** Panels smaller than this (CSS px on either axis) are badges or icons, not panels. */
  MIN_SIZE_PX: 16,
  /** A background this opaque (alpha) makes a positioned element a visible panel. */
  MIN_BACKGROUND_ALPHA: 0.35,
  /** Layers covering this share of the viewport are overlays (dialogs, round end), meant to cover the scene. */
  OVERLAY_MIN_VIEWPORT_FRACTION: 0.5,
  /** Transient feedback the layout does not reserve room for (toasts, emote bubbles). */
  TRANSIENT_SELECTOR: '[role="status"], [role="alert"], [aria-live]',
} as const;

export const OCCLUSION_PROBE = {
  /** Points on the felt the camera must see: the centre and a ring through the trick area. */
  TABLE_RING_RADIUS: 1.4,
  TABLE_RING_POINTS: 6,
  /** Hits this close to the target are things lying on the table (chips, deck), not occluders. */
  NEAR_TARGET_UNITS: 0.5,
  /** Translucent surfaces below this opacity do not block the view. */
  MIN_OCCLUDER_OPACITY: 0.5,
  /** Share of probe rays that may be blocked before the table counts as hidden. */
  MAX_BLOCKED_FRACTION: 0,
} as const;

export const VISUAL_BUDGETS = {
  /** Share of pixels that may differ from the baseline (particles and ambient motion are not seeded). */
  MAX_DIFF_PIXEL_RATIO: 0.02,
  /** Per-pixel colour distance (0-1, YIQ) below which a pixel counts as unchanged. */
  PIXEL_THRESHOLD: 0.2,
  /** DOM regions masked in screenshots: live timers and transient feedback that are not seeded. */
  MASK_SELECTORS: ['[data-visual-mask]', '[role="timer"]', '[role="status"]', '[aria-live]'],
} as const;

/** The render-budget scenario: a warm-up round, an idle stretch, then a measured warm round. */
export const RENDER_BUDGET_SCENARIO = {
  ID: 'render-budget',
  /** Round played to warm shaders, textures and caches before anything is measured. */
  WARMUP_ROUND: 2,
  /** Virtual time the idle window measures a settled table. */
  IDLE_MS: 3000,
  /** Measurement windows the scenario opens (report.metrics.windows keys). */
  IDLE_WINDOW: 'idle',
  WARM_ROUND_WINDOW: 'warm-round',
} as const;

/** Cards dealt in the measured warm round of the render-budget scenario (every seat's hand). */
export function warmRoundCardsDealt(playerCount: number): number {
  return (RENDER_BUDGET_SCENARIO.WARMUP_ROUND + 1) * playerCount;
}

/** Mean draw-call budget per frame for a table of `playerCount` seats. */
export function drawCallBudget(playerCount: number): number {
  return RENDER_BUDGETS.DRAW_CALLS_BASE + RENDER_BUDGETS.DRAW_CALLS_PER_PLAYER * playerCount;
}

/** Texture uploads allowed in a warm round that deals `cardsDealt` cards. */
export function warmTextureUploadBudget(cardsDealt: number): number {
  return cardsDealt + RENDER_BUDGETS.WARM_TEXTURE_UPLOAD_SLACK;
}
