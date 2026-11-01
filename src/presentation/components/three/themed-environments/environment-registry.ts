import type { ComponentType } from 'react';
import {
  ENVIRONMENT_ATMOSPHERES,
  type EnvironmentAtmosphere,
} from '@/presentation/config/realism-atmosphere.config';
import type { ThemedFxId } from '@/presentation/config/theme-fx.config';
import { HalloweenEnvironment } from './halloween/HalloweenEnvironment';
import { AutumnEnvironment } from './autumn/AutumnEnvironment';
import { WinterEnvironment } from './WinterEnvironment';
import { SpringEnvironment } from './SpringEnvironment';
import { SummerEnvironment } from './SummerEnvironment';
import { MangaEnvironment } from './manga/MangaEnvironment';
import { NeonEnvironment } from './neon/NeonEnvironment';
import { PixelEnvironment } from './pixel/PixelEnvironment';
import { CelestialEnvironment } from './celestial/CelestialEnvironment';
import { SolarpunkEnvironment } from './solarpunk/SolarpunkEnvironment';

/**
 * Table theme id -> surroundings. Themes not listed here fall back to the
 * casino room (see ThemedEnvironment). Keyed by ThemedFxId so a room cannot be
 * registered without a THEMED_FX_IDS entry (and with it a camera ceiling in
 * themed-environment.config.ts), nor a themed pack left without its room.
 */
export const THEMED_ENVIRONMENTS: Readonly<Record<ThemedFxId, ComponentType>> = {
  halloween: HalloweenEnvironment,
  autumn: AutumnEnvironment,
  winter: WinterEnvironment,
  spring: SpringEnvironment,
  summer: SummerEnvironment,
  manga: MangaEnvironment,
  neon: NeonEnvironment,
  pixel: PixelEnvironment,
  celestial: CelestialEnvironment,
  solarpunk: SolarpunkEnvironment,
};

function hasThemedEnvironment(tableThemeId: string): tableThemeId is ThemedFxId {
  return Object.prototype.hasOwnProperty.call(THEMED_ENVIRONMENTS, tableThemeId);
}

export function getThemedEnvironment(tableThemeId: string): ComponentType | null {
  return hasThemedEnvironment(tableThemeId) ? THEMED_ENVIRONMENTS[tableThemeId] : null;
}

/**
 * Optional atmosphere (exposure, bloom, extra key/fill lights) for a themed
 * room; null for the casino and any theme without its own room, so their
 * look never changes. Tune per room in realism-atmosphere.config.ts.
 */
export function getEnvironmentAtmosphere(tableThemeId: string): EnvironmentAtmosphere | null {
  if (!hasThemedEnvironment(tableThemeId)) return null;
  return ENVIRONMENT_ATMOSPHERES[tableThemeId] ?? null;
}
