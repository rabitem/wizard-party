/**
 * Render quality and frame scheduling for the 3D table.
 *
 * Quality tiers (low → ultra) bundle every GPU-cost knob in one place. A profile has two halves:
 * - RUNTIME settings (DPR cap, shadow resolution, composer multisampling, ambient frame rate)
 *   follow the current tier and change live when the adaptive governor steps up or down. None of
 *   them relinks shader programs.
 * - STRUCTURAL settings (native MSAA, shadows on/off, light set, bloom) are fixed when the canvas
 *   is created: MSAA is a WebGL context attribute, and changing shadows, light counts or bloom
 *   recompiles every lit material (a 100+ ms hitch; bloom moves the scene into a render target,
 *   which three.js draws with a different tone-mapping program variant). They follow the tier the
 *   session started with; the governor's settled tier is remembered, so the next visit starts there.
 *
 * Colour pipeline: linear HDR scene → one tone-mapping step (Neutral, with the room's exposure as
 * renderer.toneMappingExposure) → sRGB output. Without the composer the renderer tone-maps (so
 * toneMapped={false} on emissive UI works); with bloom the composer forces NoToneMapping on the
 * renderer and applies the same operator, with the same exposure uniform, as its last effect.
 */
import * as THREE from 'three';

export type RenderQualityTier = 'low' | 'medium' | 'high' | 'ultra';

/** Lowest to highest; the governor steps along this list. */
export const RENDER_QUALITY_TIERS: readonly RenderQualityTier[] = ['low', 'medium', 'high', 'ultra'];

/** Settings the governor may change while the table is running. */
export interface RuntimeQualitySettings {
  /** Upper bound for the canvas pixel ratio (the device ratio is used when lower). */
  dprMax: number;
  /** Key-light shadow map edge length; ignored when the session has no shadows. */
  shadowMapSize: number;
  /** Multisampling of the composer target (only while bloom is on). */
  composerMultisampling: number;
  /** Frame rate while nothing is moving (ambient flourishes only); 0 renders on demand only. */
  ambientFps: number;
}

/** Settings fixed for the lifetime of a WebGL context. */
export interface StructuralQualitySettings {
  /** Native MSAA on the default framebuffer (skipped on screens with DPR ≥ MSAA_MAX_DPR). */
  antialias: boolean;
  shadows: boolean;
  /** Cool fill and warm rim directionals (otherwise folded into the hemisphere light). */
  fillLights: boolean;
  /** Decorative room lights (casino banner glow). */
  roomAccentLights: boolean;
  /** Themed-room bloom (mounts the post-processing composer). */
  bloom: boolean;
}

export type RenderQualityProfile = RuntimeQualitySettings & StructuralQualitySettings;

/**
 * No tier caps the pixel ratio below 1.5: on the common 150 % laptop display a cap of 1 upscales
 * the whole table (card art and indices included) by 1.5x and the cards look blurred. The lower
 * tiers save their GPU time on shadows, lights, MSAA and bloom instead.
 */
export const RUNTIME_QUALITY: Readonly<Record<RenderQualityTier, RuntimeQualitySettings>> = {
  low: { dprMax: 1.5, shadowMapSize: 512, composerMultisampling: 0, ambientFps: 20 },
  medium: { dprMax: 1.5, shadowMapSize: 1024, composerMultisampling: 0, ambientFps: 30 },
  high: { dprMax: 2, shadowMapSize: 1536, composerMultisampling: 2, ambientFps: 30 },
  ultra: { dprMax: 3, shadowMapSize: 2048, composerMultisampling: 4, ambientFps: 60 },
};

export const STRUCTURAL_QUALITY: Readonly<Record<RenderQualityTier, StructuralQualitySettings>> = {
  low: { antialias: false, shadows: false, fillLights: false, roomAccentLights: false, bloom: false },
  medium: { antialias: false, shadows: true, fillLights: false, roomAccentLights: false, bloom: false },
  high: { antialias: true, shadows: true, fillLights: true, roomAccentLights: true, bloom: true },
  ultra: { antialias: true, shadows: true, fillLights: true, roomAccentLights: true, bloom: true },
};

/** At or above this device pixel ratio, native MSAA buys nothing visible. */
export const MSAA_MAX_DPR = 2;

/** Inputs of the initial tier choice (see select-initial-tier.ts). */
export const INITIAL_TIER_DETECTION = {
  /** Renderer strings of software rasterisers: the GPU is not used at all. */
  SOFTWARE_RENDERER_PATTERNS: [/swiftshader/i, /llvmpipe/i, /softpipe/i, /basic render driver/i, /microsoft basic/i, /mesa offscreen/i],
  /** Clearly capable GPUs (desktop discrete, Apple silicon). Checked before the integrated list. */
  DISCRETE_RENDERER_PATTERNS: [/nvidia|geforce|quadro|\brtx\b/i, /radeon.*\b(rx|pro|r9|r7)\b/i, /intel.*\barc\b/i, /apple (m\d|gpu)/i],
  /** Integrated GPUs that struggled in production telemetry (Intel UHD/HD/Iris, AMD APUs). */
  INTEGRATED_RENDERER_PATTERNS: [/intel/i, /radeon.*graphics/i],
  LOW_CORES: 4,
  HIGH_CORES: 8,
  LOW_MEMORY_GB: 4,
  /** Desktop screens above this DPR pay a lot per pixel; start one tier lower. */
  HIGH_DPR: 2,
} as const;

/** Runtime frame-time governor (quality-governor.ts). */
export const QUALITY_GOVERNOR = {
  /** Continuous frames per evaluation window. */
  WINDOW_FRAMES: 90,
  /** Percentile of the window compared with the budgets (robust against single hitches). */
  PERCENTILE: 0.8,
  /** Step down when the percentile frame time exceeds this (≈ 45 fps). */
  DOWN_FRAME_MS: 22,
  /** Consecutive slow windows before stepping down. */
  DOWN_WINDOWS: 2,
  /** Step up when the percentile frame time is within this factor of the display refresh. */
  UP_REFRESH_FACTOR: 1.12,
  /** Consecutive fast windows before stepping up. */
  UP_WINDOWS: 6,
  /** After stepping down from a tier, do not return to it for this long (stops oscillation). */
  UP_COOLDOWN_MS: 60_000,
  /** Frame gaps above this are pauses or one-off hitches (compiles, GC), not sustained cost. */
  MAX_SAMPLE_MS: 250,
  /** Smallest plausible refresh interval (240 Hz) when estimating the display rate. */
  MIN_REFRESH_MS: 1000 / 240,
  /**
   * Frames are not measured for this long after the table mounts or the tier changes: texture
   * uploads, shader warm-up and the canvas resize are one-off costs that a lower tier would not
   * fix, and a step down taken then is remembered for the next visit.
   */
  SETTLE_MS: 4000,
} as const;

/** Per-viewer persistence of the tier (localStorage; per device, never synced). */
export const RENDER_QUALITY_STORAGE_KEYS = {
  /** 'auto' or a tier: a forced tier skips detection and the governor. */
  OVERRIDE: 'wizard-party-render-quality',
  /** Tier the governor last settled on for this device. */
  LEARNED: 'wizard-party-render-quality-learned',
} as const;

/** Activity-aware frame scheduling (frame-scheduling/). */
export const FRAME_SCHEDULING = {
  /** Full frame rate this long after any pointer, touch, wheel or key input. */
  INPUT_ACTIVE_MS: 600,
  /** Full frame rate this long after a game state change (cards dealt, played, collected). */
  STATE_CHANGE_ACTIVE_MS: 1200,
  /** Full frame rate this long after the canvas mounts or resizes (assets resolving, shadow bake). */
  MOUNT_ACTIVE_MS: 2000,
  /**
   * Scene objects moving faster than this (largest change of a world-matrix element per second:
   * units/s for translation, roughly rad/s for rotation) keep the frame rate up. Slower drift,
   * such as idle breathing, renders at the ambient rate.
   */
  MOTION_THRESHOLD_PER_SECOND: 0.1,
  /**
   * Idle frame rate with prefers-reduced-motion. Never 0: frame callbacks that wait for a
   * timestamp before they start moving (delayed reveals, timed fades) only run on rendered frames.
   */
  REDUCED_MOTION_AMBIENT_FPS: 10,
  /** Lowest idle frame rate any tier may ask for (same reason as above). */
  MIN_AMBIENT_FPS: 10,
} as const;

/** Colour pipeline (see the header). */
export const COLOR_PIPELINE = {
  /**
   * Khronos PBR Neutral keeps base colours below ~0.8 unchanged and only rolls off highlights,
   * so rooms tuned against the previous untone-mapped output keep their look while hot spots
   * (winter glare, neon) stop clipping. ACES/AgX would shift every room's palette.
   */
  RENDERER_TONE_MAPPING: THREE.NeutralToneMapping as THREE.ToneMapping,
  /** Same operator for the composer's ToneMappingEffect (a postprocessing ToneMappingMode key). */
  COMPOSER_TONE_MAPPING_MODE: 'NEUTRAL',
} as const;

/**
 * Screen vignette, drawn by CSS over the canvas instead of a post-processing pass. Matches the
 * previous postprocessing Vignette (offset 0.35, darkness 0.5) after sRGB encoding: the stops are
 * percentages of the closest-side ellipse, i.e. UV distance from the centre / 0.5.
 */
export const VIGNETTE_OVERLAY = {
  BACKGROUND:
    'radial-gradient(ellipse closest-side at 50% 50%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.02) 80%, rgba(0,0,0,0.09) 100%, rgba(0,0,0,0.22) 120%, rgba(0,0,0,0.4) 141%)',
} as const;

/**
 * Shadows: one caster (the key light, fitted to the table in scene-lighting.config.ts), rendered
 * only on frames the FrameScheduler marks as active (gl.shadowMap.autoUpdate is off).
 */
export const SHADOW_CONFIG = {
  /** PCF with a small Vogel-disk radius (shadowRadius); PCFSoftShadowMap is deprecated in three r18x. */
  TYPE: THREE.PCFShadowMap as THREE.ShadowMapType,
} as const;

/** Program and texture warm-up (ShaderWarmup.tsx). */
export const SHADER_WARMUP = {
  /** Wait this long after a (re)mount or room change so suspended assets have joined the scene. */
  SETTLE_MS: 250,
} as const;

/** Graphics lifecycle (WebGLContextHandler.tsx / graphics-lifecycle.ts). */
export const GRAPHICS_LIFECYCLE = {
  /** Wait this long for webglcontextrestored before rebuilding the canvas from scratch. */
  RESTORE_TIMEOUT_MS: 4000,
  /** Rebuild back-off: first delay, growth factor and cap. */
  REBUILD_BASE_DELAY_MS: 1500,
  REBUILD_BACKOFF_FACTOR: 2,
  REBUILD_MAX_DELAY_MS: 20_000,
  /** Rebuilds without a successfully rendered frame in between before giving up. */
  MAX_REBUILD_ATTEMPTS: 4,
} as const;
