import type { ThemedFxId } from '@/presentation/config/theme-fx.config';
import type { LandFxRecipe } from '../layers/types';
import { autumnRecipe, halloweenRecipe, springRecipe, summerRecipe, winterRecipe } from './seasonal-recipes';
import { celestialRecipe, mangaRecipe, neonRecipe, pixelRecipe, solarpunkRecipe } from './trend-recipes';

/** Every themed land effect; 'dust' is handled by the original CardLandDust. */
export const LAND_FX_RECIPES: Readonly<Record<ThemedFxId, LandFxRecipe>> = {
  halloween: halloweenRecipe,
  autumn: autumnRecipe,
  winter: winterRecipe,
  spring: springRecipe,
  summer: summerRecipe,
  manga: mangaRecipe,
  neon: neonRecipe,
  pixel: pixelRecipe,
  celestial: celestialRecipe,
  solarpunk: solarpunkRecipe,
};
