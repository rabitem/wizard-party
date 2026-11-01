import type { RenderQualityTier } from './render-quality.config';

type Place = 1 | 2 | 3;

/**
 * The 1-2-3 podium of the winners' characters (components/podium), at game end and after a
 * tournament. Lengths are in model units: a character is about 2.7 tall.
 */
export const PODIUM = {
  /** Tied players beyond this many on one step are counted ("+2 more"), not drawn. */
  MAX_PER_STEP: 3,
  /**
   * The stage is always three steps wide, so a step and the names under it share one third of
   * the width, also when fewer steps are taken.
   */
  STEP_WIDTH: 2.4,
  /** Share of STEP_WIDTH a step block fills; the rest is the gap between steps. */
  STEP_FILL: 0.94,
  STEP_DEPTH: 1.6,
  STEP_ROUGHNESS: 0.55,
  STEP_METALNESS: 0.25,
  STEP_HEIGHT: { 1: 0.8, 2: 0.52, 3: 0.3 } satisfies Record<Place, number>,
  /** Gold, silver, bronze: the 3D step colours and the 2D step and place-label colours. */
  STEP_COLOR: { 1: '#d4a843', 2: '#b8bcc4', 3: '#c98a4b' } satisfies Record<Place, string>,
  /** Width : height of the stage (the canvas, or the 2D portraits). */
  STAGE_ASPECT: 1.75,
  /** Figure scale by how many players share the step (index 0: alone). */
  FIGURE_SCALE: [0.9, 0.66, 0.5] as const,
  /** Portrait edge in CSS px by how many players share the step; the champion's step adds PORTRAIT_FIRST_BONUS_PX. */
  PORTRAIT_PX: [52, 40, 30] as const,
  PORTRAIT_FIRST_BONUS_PX: 8,
  /** Render tiers that get the 3D scene; the low tier, and devices without WebGL, get portraits. */
  FIGURE_TIERS: ['medium', 'high', 'ultra'] as readonly RenderQualityTier[],
  /** Orthographic camera above the front of the podium, looking slightly down. */
  CAMERA_POSITION: [0, 5.5, 10] as const,
  CAMERA_TARGET: [0, 1.8, 0] as const,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 40,
  MAX_DPR: 2,
  AMBIENT_INTENSITY: 0.9,
  KEY_LIGHT_POSITION: [2.5, 5, 4] as const,
  KEY_LIGHT_INTENSITY: 1.7,
  /** Players without a known look stand as a dark figure of the default look. */
  SILHOUETTE_COLOR: '#26222e',
  /** The champion cheers this long, rests (idle) for CHEER_REST_MS, then cheers again. */
  CHEER_MS: 3200,
  CHEER_REST_MS: 6000,
} as const;
