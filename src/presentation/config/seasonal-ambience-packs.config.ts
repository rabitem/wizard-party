import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import type { AmbientLayerConfig, AmbientPack, AmbientWindConfig } from './seasonal-ambience.config';

/** Neutral defaults so each layer only states what makes it distinct. */
const STILL = {
  vx: [0, 0],
  vy: [0, 0],
  sway: [0, 0],
  swayFreq: [0, 0],
  windFactor: 0,
} as const;

const CALM: AmbientWindConfig = { base: 0, gustStrength: 0, gustEvery: [30, 60], gustDuration: [1, 2] };

const SNOW_COLORS = ['#ffffff', '#eef6ff', '#dceeff'] as const;
const LEAF_COLORS = ['#d9752b', '#b8461f', '#e3a33a', '#8f3a18', '#c9862e'] as const;
const PETAL_COLORS = ['#f6b4cf', '#f9cfe0', '#e58bb0', '#fde7ef'] as const;
const SAKURA_COLORS = ['#fbd3e1', '#f5e9ee', '#f3a7c2'] as const;

/* ---------- snow: three parallax depths + out-of-focus foreground flakes ---------- */

const SNOW_FAR: AmbientLayerConfig = {
  behaviour: 'fall', sprite: 'flake', density: 70, maxCount: 150, size: [1.2, 2.4], opacity: [0.4, 0.75],
  vx: [-3, 3], vy: [14, 26], sway: [3, 8], swayFreq: [0.4, 1], windFactor: 0.35, colors: SNOW_COLORS,
  blur: 0, twinkle: 0.3,
};
const SNOW_MID: AmbientLayerConfig = {
  behaviour: 'fall', sprite: 'flake', density: 32, maxCount: 80, size: [2.6, 4.6], opacity: [0.55, 0.9],
  vx: [-4, 4], vy: [30, 50], sway: [6, 14], swayFreq: [0.5, 1.2], windFactor: 0.7, colors: SNOW_COLORS,
  blur: 0.35, twinkle: 0.15,
};
const SNOW_NEAR: AmbientLayerConfig = {
  behaviour: 'fall', sprite: 'flake', density: 9, maxCount: 24, size: [6, 11], opacity: [0.5, 0.82],
  vx: [-6, 6], vy: [58, 92], sway: [10, 24], swayFreq: [0.5, 1.1], windFactor: 1, colors: SNOW_COLORS,
  blur: 0.75,
};
const SNOW_FOREGROUND: AmbientLayerConfig = {
  behaviour: 'fall', sprite: 'bokeh', density: 1.6, maxCount: 5, minCount: 1, size: [26, 52], opacity: [0.1, 0.22],
  vx: [-8, 8], vy: [95, 135], sway: [16, 30], swayFreq: [0.3, 0.7], windFactor: 1.3, colors: SNOW_COLORS,
  blur: 1,
};

/* ---------- leaves & petals ---------- */

const LEAVES_FAR: AmbientLayerConfig = {
  behaviour: 'flutter', sprite: 'leaf', density: 6, maxCount: 14, size: [10, 16], opacity: [0.4, 0.6],
  vx: [-4, 4], vy: [28, 42], sway: [30, 55], swayFreq: [0.9, 1.6], windFactor: 1, colors: LEAF_COLORS,
  spin: [-0.6, 0.6], tumble: [1.5, 3.5], swirl: 30,
};
const LEAVES_NEAR: AmbientLayerConfig = {
  behaviour: 'flutter', sprite: 'leaf', density: 5, maxCount: 12, size: [20, 32], opacity: [0.85, 1],
  vx: [-6, 6], vy: [44, 70], sway: [50, 90], swayFreq: [0.8, 1.4], windFactor: 1.4, colors: LEAF_COLORS,
  spin: [-0.8, 0.8], tumble: [1.2, 3], swirl: 50,
};
const PETALS_FAR: AmbientLayerConfig = {
  behaviour: 'flutter', sprite: 'petal', density: 10, maxCount: 24, size: [5, 8], opacity: [0.35, 0.6],
  vx: [-3, 3], vy: [14, 24], sway: [14, 28], swayFreq: [1, 1.8], windFactor: 1, colors: PETAL_COLORS,
  spin: [-1, 1], tumble: [2, 4], swirl: 45,
};
const PETALS_NEAR: AmbientLayerConfig = {
  behaviour: 'flutter', sprite: 'petal', density: 12, maxCount: 30, size: [9, 15], opacity: [0.7, 0.95],
  vx: [-4, 4], vy: [22, 40], sway: [20, 45], swayFreq: [1, 2], windFactor: 1.25, colors: PETAL_COLORS,
  spin: [-1.2, 1.2], tumble: [2, 4.2], swirl: 75,
};

/* ---------- glows ---------- */

const SUN_MOTES: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'glow', density: 16, maxCount: 36, size: [6, 14], opacity: [0.22, 0.55],
  vx: [-3, 3], vy: [-12, -4], sway: [4, 10], swayFreq: [0.3, 0.8], windFactor: 0.6,
  colors: ['#ffd27a', '#ffb45c', '#fff1b8'], blur: 0.6, twinkle: 0.6, additive: true,
};
const SUN_BOKEH: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'bokeh', density: 2, maxCount: 6, size: [40, 90], opacity: [0.05, 0.12],
  vx: [-2, 2], vy: [-6, -2], sway: [2, 5], swayFreq: [0.15, 0.35], windFactor: 0.3,
  colors: ['#ffcf86', '#ff9e6a'], blur: 1, additive: true,
};
const HEAT_SPECKS: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'glow', density: 24, maxCount: 48, size: [2, 4], opacity: [0.3, 0.7],
  vx: [-2, 2], vy: [-22, -10], sway: [6, 14], swayFreq: [2, 4], windFactor: 0.4,
  colors: ['#fff4cf', '#ffd99a'], blur: 0.3, twinkle: 0.8, additive: true,
};

/* ---------- halloween ---------- */

const FOG_FAR: AmbientLayerConfig = {
  ...STILL, behaviour: 'fog', sprite: 'fog', density: 2, maxCount: 4, size: [420, 700], opacity: [0.05, 0.1],
  vx: [4, 10], swayFreq: [0.08, 0.18], windFactor: 0.2, band: [0.3, 0.7],
  colors: ['rgb(150, 110, 190)', 'rgb(110, 90, 150)'],
};
const FOG_LOW: AmbientLayerConfig = {
  ...STILL, behaviour: 'fog', sprite: 'fog', density: 3, maxCount: 7, minCount: 2, size: [380, 720], opacity: [0.1, 0.2],
  vx: [7, 16], swayFreq: [0.1, 0.25], windFactor: 0.35, band: [0.6, 1.05],
  colors: ['rgb(160, 120, 200)', 'rgb(120, 95, 165)', 'rgb(90, 70, 130)'],
};
const BATS: AmbientLayerConfig = {
  behaviour: 'bat', sprite: 'bat', density: 5, maxCount: 4, minCount: 1, size: [26, 44], opacity: [0.75, 0.95],
  vx: [90, 150], vy: [-8, 8], sway: [8, 20], swayFreq: [9, 13], windFactor: 0.2, band: [0.08, 0.5],
  interval: [5, 14], colors: ['#120a18', '#1c1024'],
};
const EMBERS: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'glow', density: 10, maxCount: 24, size: [3, 6], opacity: [0.4, 0.85],
  vx: [-4, 4], vy: [-30, -14], sway: [6, 14], swayFreq: [1, 2.5], windFactor: 0.8,
  colors: ['#ff9a3c', '#ffb347', '#ff6a1a'], blur: 0.4, twinkle: 0.9, additive: true,
};

/* ---------- trend themes ---------- */

const INK_GLINTS: AmbientLayerConfig = {
  ...STILL, behaviour: 'glint', sprite: 'streak', density: 3, maxCount: 8, size: [80, 220], opacity: [0.08, 0.2],
  vx: [140, 260], band: [0.05, 0.95], interval: [0.6, 1.4], colors: ['#f4f1ea', '#e5262f'], additive: true,
};
const NEON_SPARKS: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'glow', density: 16, maxCount: 36, size: [3, 7], opacity: [0.4, 0.85],
  vx: [-3, 3], vy: [-40, -18], sway: [5, 12], swayFreq: [1, 2], windFactor: 0.3,
  colors: ['#22e5ff', '#ff3fd2', '#9b6bff'], blur: 0.35, twinkle: 0.5, additive: true,
};
const NEON_BOKEH: AmbientLayerConfig = {
  ...SUN_BOKEH, density: 2, size: [30, 70], opacity: [0.05, 0.12], colors: ['#22e5ff', '#ff3fd2'],
};
const NEON_RAIN: AmbientLayerConfig = {
  behaviour: 'rain', sprite: 'streak', density: 22, maxCount: 50, size: [26, 48], opacity: [0.06, 0.16],
  vx: [-6, 6], vy: [700, 950], sway: [0, 0], swayFreq: [0, 0], windFactor: 1,
  colors: ['#9ff3ff', '#ffb3ef'], additive: true,
};
const PIXEL_STARS: AmbientLayerConfig = {
  ...STILL, behaviour: 'twinkle', sprite: 'pixel', density: 40, maxCount: 90, size: [3, 6], opacity: [0.5, 1],
  swayFreq: [1.5, 4], twinkle: 1, band: [0, 1], pixelated: true,
  colors: ['#ffffff', '#ffd93b', '#4ade5a', '#7fe7ff'],
};
const PIXEL_BITS: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'pixel', density: 6, maxCount: 14, size: [3, 6], opacity: [0.3, 0.6],
  vx: [-2, 2], vy: [-14, -6], sway: [0, 0], swayFreq: [0, 0], windFactor: 0, pixelated: true,
  colors: ['#ffd93b', '#4ade5a'],
};
const CELESTIAL_STARS: AmbientLayerConfig = {
  ...STILL, behaviour: 'twinkle', sprite: 'star', density: 50, maxCount: 110, size: [3, 9], opacity: [0.35, 0.95],
  swayFreq: [0.6, 2.2], twinkle: 0.8, band: [0, 0.85], additive: true,
  colors: ['#fff4d6', '#dce6ff', '#ffe2a0'],
};
const SHOOTING_STAR: AmbientLayerConfig = {
  ...STILL, behaviour: 'shooting', sprite: 'streak', density: 1, maxCount: 1, minCount: 1, size: [140, 240], opacity: [0.6, 0.9],
  vx: [700, 1000], vy: [260, 420], band: [0, 0.45], interval: [6, 14], additive: true,
  colors: ['#ffffff', '#ffe9b8'],
};
const POLLEN: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'glow', density: 18, maxCount: 40, size: [3, 6], opacity: [0.35, 0.8],
  vx: [-4, 4], vy: [-6, 4], sway: [6, 14], swayFreq: [0.4, 1.2], windFactor: 0.8,
  colors: ['#f4f7a8', '#d8f08a', '#fff3c0'], blur: 0.4, twinkle: 0.4, additive: true,
};
const SEEDS: AmbientLayerConfig = {
  behaviour: 'drift', sprite: 'seed', density: 3, maxCount: 8, size: [18, 30], opacity: [0.55, 0.85],
  vx: [6, 16], vy: [-6, 2], sway: [6, 12], swayFreq: [0.5, 1], windFactor: 1.4, spin: [-0.4, 0.4],
  colors: ['#f2ecd8', '#e6efd6'],
};

export const AMBIENCE_PACKS: Partial<Record<ThemePreference, AmbientPack>> = {
  frost: {
    layers: [
      { ...SNOW_FAR, density: 14, maxCount: 30, size: [1, 2], opacity: [0.25, 0.5], vy: [8, 16] },
      { ...SNOW_MID, density: 4, maxCount: 10, size: [2, 3.5], opacity: [0.3, 0.55], vy: [16, 26] },
    ],
    wind: { base: 6, gustStrength: 20, gustEvery: [10, 20], gustDuration: [2, 4] },
  },
  halloween: {
    layers: [FOG_FAR, BATS, FOG_LOW, EMBERS],
    wind: { base: 6, gustStrength: 30, gustEvery: [9, 18], gustDuration: [2.5, 4.5] },
  },
  autumn: {
    layers: [LEAVES_FAR, LEAVES_NEAR],
    wind: { base: 14, gustStrength: 90, gustEvery: [7, 15], gustDuration: [2.5, 4.5] },
  },
  winter: {
    layers: [SNOW_FAR, SNOW_MID, SNOW_NEAR, SNOW_FOREGROUND],
    wind: { base: 8, gustStrength: 55, gustEvery: [8, 18], gustDuration: [3, 6] },
  },
  spring: {
    layers: [PETALS_FAR, PETALS_NEAR],
    wind: { base: 10, gustStrength: 55, gustEvery: [8, 16], gustDuration: [3, 5] },
  },
  summer: {
    layers: [SUN_BOKEH, SUN_MOTES, HEAT_SPECKS],
    wind: { base: 3, gustStrength: 12, gustEvery: [10, 20], gustDuration: [3, 6] },
  },
  manga: {
    layers: [INK_GLINTS, { ...PETALS_NEAR, density: 7, maxCount: 18, colors: SAKURA_COLORS }],
    wind: { base: 8, gustStrength: 40, gustEvery: [9, 18], gustDuration: [2.5, 4] },
  },
  neon: {
    layers: [NEON_BOKEH, NEON_RAIN, NEON_SPARKS],
    wind: { base: -40, gustStrength: 60, gustEvery: [8, 16], gustDuration: [2, 4] },
  },
  pixel: { layers: [PIXEL_STARS, PIXEL_BITS], wind: CALM },
  celestial: { layers: [CELESTIAL_STARS, SHOOTING_STAR], wind: CALM },
  solarpunk: {
    layers: [POLLEN, SEEDS],
    wind: { base: 10, gustStrength: 40, gustEvery: [9, 18], gustDuration: [3, 5] },
  },
};
