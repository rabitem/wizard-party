/**
 * Land effects for the seasonal packs: Halloween, autumn, winter, spring and
 * summer.
 */

import { LAND_FX_CAPS as CAPS, LAND_FX_COLORS, LAND_FX_DURATION, LAND_FX_LAYOUT } from '../land-fx.constants';
import { rangeInt } from '../land-fx-selection';
import { BatLayer } from '../layers/bat-layer';
import { emitRadial, PointBurstLayer, toColors } from '../layers/point-burst-layer';
import { RingLayer } from '../layers/ring-layer';
import type { LandFxRecipe } from '../layers/types';

const FLOOR = LAND_FX_LAYOUT.FLOOR_Y;

const HALLOWEEN = {
  fog: toColors(LAND_FX_COLORS.halloween.fog),
  embers: toColors(LAND_FX_COLORS.halloween.embers),
};
const AUTUMN = {
  dust: toColors(LAND_FX_COLORS.autumn.dust),
  leaves: toColors(LAND_FX_COLORS.autumn.leaves),
};
const WINTER = {
  powder: toColors(LAND_FX_COLORS.winter.powder),
  crystals: toColors(LAND_FX_COLORS.winter.crystals),
};
const SPRING = {
  petals: toColors(LAND_FX_COLORS.spring.petals),
  pollen: toColors(LAND_FX_COLORS.spring.pollen),
};
const SUMMER = { droplets: toColors(LAND_FX_COLORS.summer.droplets) };

/** Low green-purple fog, rising embers and the occasional bat. */
export const halloweenRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.halloween,
  createLayers: () => [
    new PointBurstLayer({
      capacity: CAPS.FOG,
      texture: 'soft',
      step: { drag: 0.95, growth: 2.2, fadeIn: 0.2, fadePow: 1.3 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: CAPS.FOG,
          colors: HALLOWEEN.fog,
          speed: [0.15, 0.4],
          up: [0.01, 0.06],
          life: [0.85, 1.1],
          size: [0.28, 0.42],
          radius: [0.05, 0.2],
          y: 0.01,
          opacity: [0.35, 0.5],
        }),
    }),
    new PointBurstLayer({
      capacity: 16,
      texture: 'spark',
      blending: 'additive',
      step: { gravity: -0.9, drag: 0.96, fadePow: 1.2, twinkle: 22 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 16,
          colors: HALLOWEEN.embers,
          speed: [0.15, 0.55],
          up: [0.45, 1.05],
          life: [0.5, 0.95],
          size: [0.03, 0.055],
          delay: [0, 0.1],
          flutter: [0.1, 0.3],
        }),
    }),
    new BatLayer(),
  ],
};

/** Felt dust plus a handful of leaves that kick up, tumble and settle. */
export const autumnRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.autumn,
  createLayers: () => [
    new PointBurstLayer({
      capacity: 16,
      texture: 'soft',
      step: { gravity: -0.8, drag: 0.92, floorY: 0, growth: 1.4 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 16,
          colors: AUTUMN.dust,
          speed: [0.3, 0.9],
          up: [0.2, 0.6],
          life: [0.6, 0.9],
          size: [0.05, 0.08],
          opacity: [0.5, 0.7],
        }),
    }),
    new PointBurstLayer({
      capacity: CAPS.LEAVES,
      texture: 'leaf',
      step: { gravity: -2.4, drag: 0.93, floorY: FLOOR, flutterFreq: 6, fadeIn: 0.05, fadePow: 4 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: rangeInt(rand, 4, CAPS.LEAVES),
          colors: AUTUMN.leaves,
          speed: [0.25, 0.55],
          up: [0.95, 1.35],
          life: [1.05, 1.15],
          size: [0.1, 0.13],
          radius: [0.1, 0.3],
          spin: [2.5, 6],
          flutter: [0.35, 0.6],
        }),
    }),
  ],
};

/** Snow-powder puff and glittering ice crystals. */
export const winterRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.winter,
  createLayers: () => [
    new PointBurstLayer({
      capacity: CAPS.DUST,
      texture: 'soft',
      step: { gravity: -0.5, drag: 0.9, floorY: 0, growth: 1.8, fadePow: 1.3 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: CAPS.DUST,
          colors: WINTER.powder,
          speed: [0.3, 0.95],
          up: [0.15, 0.5],
          life: [0.6, 0.95],
          size: [0.06, 0.1],
          opacity: [0.5, 0.75],
        }),
    }),
    new PointBurstLayer({
      capacity: CAPS.CRYSTALS,
      texture: 'crystal',
      blending: 'additive',
      step: { gravity: -0.9, drag: 0.94, twinkle: 26, fadePow: 1.6 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: CAPS.CRYSTALS,
          colors: WINTER.crystals,
          speed: [0.2, 0.55],
          up: [0.45, 0.9],
          life: [0.6, 0.95],
          size: [0.05, 0.085],
          spin: [1, 3],
          delay: [0, 0.08],
        }),
    }),
  ],
};

/** A burst of petals that floats back down, with a breath of pollen. */
export const springRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.spring,
  createLayers: () => [
    new PointBurstLayer({
      capacity: CAPS.PETALS,
      texture: 'petal',
      step: { gravity: -1.5, drag: 0.92, floorY: FLOOR, flutterFreq: 7, fadeIn: 0.05, fadePow: 3.5 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: CAPS.PETALS,
          colors: SPRING.petals,
          speed: [0.25, 0.65],
          up: [0.75, 1.25],
          life: [1.0, 1.15],
          size: [0.06, 0.085],
          radius: [0.05, 0.2],
          spin: [2, 5],
          flutter: [0.25, 0.5],
        }),
    }),
    new PointBurstLayer({
      capacity: 6,
      texture: 'soft',
      blending: 'additive',
      step: { gravity: 0.1, drag: 0.94, twinkle: 12 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: 6,
          colors: SPRING.pollen,
          speed: [0.1, 0.3],
          up: [0.1, 0.3],
          life: [0.8, 1.1],
          size: [0.03, 0.045],
          opacity: [0.6, 0.9],
        }),
    }),
  ],
};

/** Splash droplets plus two ripple rings spreading over the felt. */
export const summerRecipe: LandFxRecipe = {
  duration: LAND_FX_DURATION.summer,
  createLayers: () => [
    new RingLayer({
      rings: [
        { delay: 0, duration: 0.75, maxRadius: 0.6, width: 0.07, color: LAND_FX_COLORS.summer.ripple, opacity: 0.75 },
        { delay: 0.16, duration: 0.8, maxRadius: 0.85, width: 0.05, color: LAND_FX_COLORS.summer.ripple, opacity: 0.55 },
      ],
    }),
    new PointBurstLayer({
      capacity: CAPS.DROPLETS,
      texture: 'soft',
      step: { gravity: -3.6, drag: 0.99, floorY: FLOOR, fadeIn: 0.02, fadePow: 2.2 },
      emit: (pool, rand) =>
        emitRadial(pool, rand, {
          count: CAPS.DROPLETS,
          colors: SUMMER.droplets,
          speed: [0.3, 0.85],
          up: [0.7, 1.35],
          life: [0.5, 0.8],
          size: [0.03, 0.05],
          radius: [0.02, 0.12],
          opacity: [0.75, 0.95],
        }),
    }),
  ],
};
