/**
 * Land effects for the trend packs: manga, neon, pixel, celestial and
 * solarpunk.
 */

import * as THREE from 'three';
import { LAND_FX_CAPS as CAPS, LAND_FX_COLORS, LAND_FX_DURATION, LAND_FX_LAYOUT } from '../land-fx.constants';
import { rangeInt } from '../land-fx-selection';
import { ConstellationLayer, SpeedLinesLayer } from '../layers/line-layers';
import { emitRadial, PointBurstLayer, toColors } from '../layers/point-burst-layer';
import { RingLayer } from '../layers/ring-layer';
import { BillboardLayer, DecalLayer } from '../layers/sprite-layer';
import type { LandFxRecipe } from '../layers/types';

const FLOOR = LAND_FX_LAYOUT.FLOOR_Y;
const BILLBOARD_Y = LAND_FX_LAYOUT.BILLBOARD_Y;
const NEON = LAND_FX_COLORS.neon;

const NEON_SPARKS = toColors([NEON.cyan, NEON.magenta, NEON.cyan, NEON.white]);
const PIXEL_SQUARES = toColors(LAND_FX_COLORS.pixel.squares);
const STARDUST = toColors(LAND_FX_COLORS.celestial.stardust);
const SOLAR = {
  pollen: toColors(LAND_FX_COLORS.solarpunk.pollen),
  flecks: toColors(LAND_FX_COLORS.solarpunk.flecks),
  leaves: toColors(LAND_FX_COLORS.solarpunk.leaves),
};

/** Comic BAM!/POW! burst, ink splatter decals and radial speed lines. */
export const mangaRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.manga,
  createLayers: () => [
    new SpeedLinesLayer({
      count: CAPS.SPEED_LINES,
      color: LAND_FX_COLORS.manga.speedLines,
      width: 0.022,
      inner: [[0, 0.32], [0.45, 0.62]],
      outer: [[0, 0.5], [0.2, 1.0], [0.45, 1.15]],
      opacity: [[0, 0], [0.03, 0.85], [0.22, 0.7], [0.45, 0]],
    }),
    new DecalLayer({
      count: CAPS.INK_DECALS,
      texture: 'ink',
      color: LAND_FX_COLORS.manga.ink,
      size: [0.18, 0.32],
      radius: [0.38, 0.6],
      stagger: 0.04,
      scale: [[0, 0.4], [0.08, 1.05], [0.14, 1]],
      opacity: [[0, 0], [0.04, 0.9], [0.45, 0.85], [0.95, 0]],
    }),
    new BillboardLayer([
      {
        textures: ['bam', 'pow'],
        offset: [0, BILLBOARD_Y, 0],
        jitter: 0.08,
        tilt: 0.3,
        scale: [[0, 0.1], [0.08, 0.72], [0.14, 0.58], [0.6, 0.62], [0.8, 0.7]],
        opacity: [[0, 0], [0.04, 1], [0.6, 1], [0.8, 0]],
        rise: [[0, 0], [0.8, 0.08]],
      },
    ]),
  ],
};

/** Glitching ripple ring, cyan/magenta sparks and a split chromatic flash. */
export const neonRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.neon,
  createLayers: () => [
    new RingLayer({
      glitch: true,
      blending: 'additive',
      rings: [
        { delay: 0, duration: 0.55, maxRadius: 0.8, width: 0.05, color: NEON.cyan, color2: NEON.magenta, opacity: 1 },
      ],
    }),
    new PointBurstLayer({
      capacity: CAPS.SPARKS,
      texture: 'spark',
      blending: 'additive',
      step: { gravity: -1.6, drag: 0.9, fadePow: 1.1, alphaSteps: 6 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 22,
          colors: NEON_SPARKS,
          speed: [0.6, 1.4],
          up: [0.2, 0.75],
          life: [0.35, 0.7],
          size: [0.03, 0.05],
        }),
    }),
    new BillboardLayer(
      [-1, 1].map((side) => ({
        textures: ['soft'] as const,
        color: side < 0 ? NEON.cyan : NEON.magenta,
        blending: 'additive' as const,
        offset: [side * 0.05, 0.06, 0] as const,
        scale: [[0, 0.35], [0.18, 0.95]] as const,
        opacity: [[0, 0.85], [0.06, 0.6], [0.2, 0]] as const,
        renderOrder: 4,
      })),
    ),
  ],
};

/** The landing shakes loose a few square pixels; a "+1" floats up. */
export const pixelRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.pixel,
  createLayers: () => [
    new PointBurstLayer({
      capacity: CAPS.PIXELS,
      texture: 'square',
      step: { gravity: -3.2, drag: 0.97, floorY: FLOOR, growth: 0.55, fadeIn: 0, fadePow: 3, alphaSteps: 4 },
      emit: (pool, rand) => {
        emitRadial(pool, rand, {
          count: rangeInt(rand, 8, CAPS.PIXELS),
          colors: PIXEL_SQUARES,
          speed: [0.3, 0.75],
          up: [0.8, 1.4],
          life: [0.65, 0.9],
          size: [0.055, 0.075],
          radius: [0.05, 0.25],
        });
        // Pixels stay axis-aligned: undo the random roll from the emitter
        pool.rotation.fill(0);
      },
    }),
    new BillboardLayer([
      {
        textures: ['plusOne'],
        offset: [0, 0.14, 0],
        scale: [[0, 0.05], [0.06, 0.26], [0.1, 0.22]],
        opacity: [[0, 1], [0.6, 1], [0.7, 0.66], [0.8, 0.33], [0.9, 0]],
        rise: [[0, 0], [0.9, 0.42]],
      },
    ]),
  ],
};

/** Stardust shimmer and a constellation that draws itself, flashes and fades. */
export const celestialRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.celestial,
  createLayers: () => [
    new PointBurstLayer({
      capacity: CAPS.STARS,
      texture: 'spark',
      blending: 'additive',
      step: { gravity: -0.2, drag: 0.92, twinkle: 20, fadePow: 1.4 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 18,
          colors: STARDUST,
          speed: [0.15, 0.5],
          up: [0.15, 0.5],
          life: [0.6, 1.05],
          size: [0.025, 0.045],
          radius: [0, 0.15],
          delay: [0, 0.15],
        }),
    }),
    new ConstellationLayer({
      points: CAPS.CONSTELLATION_POINTS,
      color: new THREE.Color(LAND_FX_COLORS.celestial.constellation),
      radius: [0.28, 0.6],
      height: [0.08, 0.32],
      starSize: 0.075,
      drawIn: [0.1, 0.45],
      lineOpacity: [[0, 0], [0.1, 0.4], [0.45, 0.95], [0.55, 0.7], [0.9, 0]],
    }),
  ],
};

/** Drifting pollen, flecks of sunlight and a couple of sprouting leaves. */
export const solarpunkRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.solarpunk,
  createLayers: () => [
    new PointBurstLayer({
      capacity: 14,
      texture: 'soft',
      blending: 'additive',
      step: { gravity: 0.12, drag: 0.94, flutterFreq: 4, twinkle: 10, fadeIn: 0.2 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 14,
          colors: SOLAR.pollen,
          speed: [0.1, 0.32],
          up: [0.12, 0.38],
          life: [0.8, 1.05],
          size: [0.025, 0.042],
          radius: [0.05, 0.3],
          opacity: [0.6, 0.95],
          flutter: [0.1, 0.25],
        }),
    }),
    new PointBurstLayer({
      capacity: 8,
      texture: 'spark',
      blending: 'additive',
      step: { gravity: -0.5, drag: 0.93, fadePow: 1.2 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 8,
          colors: SOLAR.flecks,
          speed: [0.3, 0.6],
          up: [0.3, 0.6],
          life: [0.35, 0.6],
          size: [0.035, 0.05],
        }),
    }),
    new PointBurstLayer({
      capacity: 3,
      texture: 'leaf',
      step: { gravity: -1.9, drag: 0.93, floorY: FLOOR, flutterFreq: 5, fadeIn: 0.06, fadePow: 4 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: rangeInt(rand, 2, 3),
          colors: SOLAR.leaves,
          speed: [0.1, 0.28],
          up: [0.6, 0.9],
          life: [0.95, 1.05],
          size: [0.075, 0.095],
          radius: [0.05, 0.18],
          spin: [1.5, 4],
          flutter: [0.2, 0.4],
        }),
    }),
  ],
};
