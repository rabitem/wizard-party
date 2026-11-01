/**
 * Table lighting. Light budget (three.js forward rendering loops over every punctual light in
 * every lit fragment and keys shader programs on light counts):
 * - always: ambient + hemisphere (cheap, no per-light loop), the key directional (the only
 *   shadow caster), the overhead table spot (no shadow) and the trump indicator point light;
 * - high/ultra tiers only (STRUCTURAL_QUALITY.fillLights): the cool fill and warm rim directionals.
 *   Lower tiers fold them into the hemisphere light (fillFallbackHemisphereBoost).
 * The set is fixed for the lifetime of a canvas, so no light mounts or unmounts during play.
 */
interface ShadowedDirectionalLightConfig {
  position: [number, number, number];
  intensity: number;
  color: string;
  shadowCameraSize: number;
  shadowCameraFar: number;
  shadowBias: number;
  shadowNormalBias: number;
  shadowRadius: number;
}

interface FillLightConfig {
  position: [number, number, number];
  intensity: number;
  color: string;
  distance?: number;
  decay?: number;
}

export const SCENE_LIGHTING = {
  ambient: {
    intensity: 0.16,
    color: '#d6d1c4',
  },
  hemisphere: {
    skyColor: '#d8d2c5',
    groundColor: '#14100c',
    /** Includes the former faint edge fills (three 0.1-intensity point lights) */
    intensity: 0.25,
    /** Added on tiers without the fill and rim directionals */
    fillFallbackHemisphereBoost: 0.12,
  },
  key: {
    position: [5, 14, 5],
    intensity: 1.45,
    color: '#fff1df',
    /** Half extent of the orthographic shadow camera: table rim (SURFACE_LAYOUT.RIM_OUTER) plus
     *  margin, so the per-tier shadow map (RUNTIME_QUALITY.shadowMapSize) spends its texels on
     *  the table only */
    shadowCameraSize: 4.6,
    shadowCameraFar: 28,
    shadowBias: -0.00022,
    shadowNormalBias: 0.028,
    shadowRadius: 4,
  } satisfies ShadowedDirectionalLightConfig,
  fill: {
    position: [-6, 9, -5],
    intensity: 0.22,
    color: '#c4d0d6',
  } satisfies FillLightConfig,
  rim: {
    position: [0, 7, -10],
    intensity: 0.18,
    color: '#d0ad88',
  } satisfies FillLightConfig,
  tableSpot: {
    position: [0, 11, 0],
    angle: 0.48,
    penumbra: 0.82,
    intensity: 1.28,
    color: '#fff8ef',
    distance: 18,
    decay: 2,
  },
  /**
   * Suit-coloured glow above the trump indicator. It stays mounted in every phase and only
   * dims to 0 while the indicator is hidden: three.js compiles shaders per point-light count,
   * so adding or removing it would relink every lit material at round end.
   */
  trumpIndicator: {
    position: [0, 0.33, 0],
    intensity: 0.5,
    color: '#8855ff',
    distance: 2,
    decay: 2,
  } satisfies FillLightConfig,
  background: '#070604',
} as const;
