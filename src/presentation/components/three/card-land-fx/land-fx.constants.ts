/**
 * Tunables for the themed card-land effects. All positions are local to the
 * landing point, which sits at TABLE_SURFACE.CARD_REST_Y (0.03); the felt is
 * at 0.02, so the local felt plane is ~-0.01.
 */

import { TABLE_SURFACE } from '@/presentation/config/card-physics';
import type { ThemedFxId } from '@/presentation/config/theme-fx.config';

/** Local height of the felt under the landing point. */
const FELT_LOCAL_Y = TABLE_SURFACE.FELT_Y - TABLE_SURFACE.CARD_REST_Y;

export const LAND_FX_LAYOUT = {
  /** Where settled leaves / petals / pixels rest (a hair above the felt). */
  FLOOR_Y: FELT_LOCAL_Y + 0.003,
  /** Flat decals and ripple rings, stacked to avoid z-fighting. */
  DECAL_Y: FELT_LOCAL_Y + 0.002,
  DECAL_Y_STEP: 0.0008,
  /** Height of the comic burst / +1 text above the card. */
  BILLBOARD_Y: 0.28,
} as const;

export const LAND_FX_TIMING = {
  /** Largest frame step fed to the simulation (keeps tab-switch spikes sane). */
  MAX_DT: 1 / 20,
  BAT_CHANCE: 0.25,
} as const;

/** Total runtime per effect, in seconds. */
export const LAND_FX_DURATION: Readonly<Record<ThemedFxId, number>> = {
  halloween: 1.15,
  autumn: 1.2,
  winter: 1.0,
  spring: 1.2,
  summer: 1.0,
  manga: 1.0,
  neon: 0.9,
  pixel: 1.0,
  celestial: 1.1,
  solarpunk: 1.1,
};

/** Hard caps per particle layer so a busy trick never floods the GPU. */
export const LAND_FX_CAPS = {
  FOG: 8,
  SPARKS: 24,
  DUST: 18,
  LEAVES: 6,
  PETALS: 14,
  CRYSTALS: 12,
  DROPLETS: 18,
  PIXELS: 12,
  STARS: 20,
  CONSTELLATION_POINTS: 5,
  SPEED_LINES: 14,
  INK_DECALS: 3,
} as const;

export const LAND_FX_COLORS = {
  halloween: {
    fog: ['#5dff8f', '#9b5cff', '#3fd17a', '#7a3fd1'],
    embers: ['#ff8a2a', '#ffcf5a', '#ff5a1f', '#c77dff'],
    bat: '#1a1024',
    batEye: '#ffb02e',
  },
  autumn: {
    dust: ['#c4a574', '#e8dcc8', '#8b7355'],
    leaves: ['#d9541e', '#e8a33a', '#b5381f', '#c97a2a', '#9c4a1a'],
  },
  winter: {
    powder: ['#ffffff', '#e6f3ff', '#d4e9ff'],
    crystals: ['#cfeaff', '#ffffff', '#9fd8ff'],
  },
  spring: {
    petals: ['#ffc4dd', '#ffd9e8', '#fff0f5', '#f7a8c8'],
    pollen: ['#fff3b0', '#ffe9a8'],
  },
  summer: {
    droplets: ['#bfe9ff', '#7fd0ff', '#ffffff', '#4fb8f0'],
    ripple: '#e2f6ff',
  },
  manga: {
    ink: '#111111',
    speedLines: '#141414',
    burstFill: '#ffd400',
    burstOutline: '#111111',
    burstAccent: '#e5262f',
  },
  neon: {
    cyan: '#22e5ff',
    magenta: '#ff3fd2',
    white: '#f4f0ff',
  },
  pixel: {
    squares: ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0', '#ffffff'],
    text: '#ffd93b',
    textShadow: '#16501f',
  },
  celestial: {
    stardust: ['#fff6d6', '#c9b8ff', '#8fd3ff', '#ffffff'],
    constellation: '#cfe1ff',
  },
  solarpunk: {
    pollen: ['#fff3a0', '#ffe066', '#f6ffb0'],
    flecks: ['#fffbe0', '#fff0b8'],
    leaves: ['#5fbf4a', '#8fd65a', '#3fa34d'],
  },
} as const;
