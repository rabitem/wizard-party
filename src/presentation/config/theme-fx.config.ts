/**
 * Per table theme visual effects: which card-land effect plays when a card hits
 * the table and which felt/surface renderer paints the play area.
 *
 * 'dust' / 'felt' are today's shared effect and surface; every seasonal and
 * trend pack gets its own id so its effect/surface can be built independently.
 * Classic (non-seasonal) tables keep 'dust' / 'felt'.
 */

import { DEFAULT_TABLE_THEME_ID } from './table-theme.config';

/** Ids of the seasonal + trend packs that own a dedicated effect and surface. */
export const THEMED_FX_IDS = [
  'halloween',
  'autumn',
  'winter',
  'spring',
  'summer',
  'manga',
  'neon',
  'pixel',
  'celestial',
  'solarpunk',
] as const;

export type ThemedFxId = (typeof THEMED_FX_IDS)[number];

/** Card-land effect: 'dust' is the original CardLandDust puff. */
export type LandEffectId = 'dust' | ThemedFxId;

/** Table play surface: 'felt' is the original FeltSurface. */
export type TableSurfaceId = 'felt' | ThemedFxId;

export interface ThemeFx {
  landEffect: LandEffectId;
  surface: TableSurfaceId;
}

export const DEFAULT_THEME_FX: Readonly<ThemeFx> = { landEffect: 'dust', surface: 'felt' };

const themed = (id: ThemedFxId): Readonly<ThemeFx> => ({ landEffect: id, surface: id });

/** Table theme id (see TABLE_THEME_PALETTES) -> effects. */
export const THEME_FX: Readonly<Record<string, Readonly<ThemeFx>>> = {
  // Classic tables keep the original dust puff and felt
  [DEFAULT_TABLE_THEME_ID]: DEFAULT_THEME_FX,
  forest: DEFAULT_THEME_FX,
  ocean: DEFAULT_THEME_FX,
  fire: DEFAULT_THEME_FX,
  dark: DEFAULT_THEME_FX,
  gold: DEFAULT_THEME_FX,
  // Seasonal packs
  halloween: themed('halloween'),
  autumn: themed('autumn'),
  winter: themed('winter'),
  spring: themed('spring'),
  summer: themed('summer'),
  // Trend packs
  manga: themed('manga'),
  neon: themed('neon'),
  pixel: themed('pixel'),
  celestial: themed('celestial'),
  solarpunk: themed('solarpunk'),
};

/** Effects for a table theme id; unknown or missing ids get the classic dust + felt. */
export function getThemeFx(tableThemeId: string | null | undefined): Readonly<ThemeFx> {
  return THEME_FX[tableThemeId ?? ''] ?? DEFAULT_THEME_FX;
}
