'use client';

import type { ComponentType } from 'react';
import type { ThemedFxId } from '@/presentation/config/theme-fx.config';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { PoolSurface } from './summer/PoolSurface';
import { AutumnSurface } from './themes/AutumnSurface';
import { CelestialSurface } from './themes/CelestialSurface';
import { HalloweenSurface } from './themes/HalloweenSurface';
import { MangaSurface } from './themes/MangaSurface';
import { NeonSurface } from './themes/NeonSurface';
import { PixelSurface } from './themes/PixelSurface';
import { SolarpunkSurface } from './themes/SolarpunkSurface';
import { SpringSurface } from './themes/SpringSurface';
import { WinterSurface } from './themes/WinterSurface';

export interface ThemedTableSurfaceProps {
  surface: ThemedFxId;
  palette: TableThemePalette;
}

/** Surface renderer per themed table (classic 'felt' stays in FeltSurface). */
const SURFACES: Readonly<Record<ThemedFxId, ComponentType<{ palette: TableThemePalette }>>> = {
  halloween: HalloweenSurface,
  autumn: AutumnSurface,
  winter: WinterSurface,
  spring: SpringSurface,
  summer: PoolSurface,
  manga: MangaSurface,
  neon: NeonSurface,
  pixel: PixelSurface,
  celestial: CelestialSurface,
  solarpunk: SolarpunkSurface,
};

/**
 * Themed play surface + rim restyle. Purely visual: the table collider is
 * untouched, the play disc stays at the felt height and decor sits outside the
 * play radius or as non-colliding overlays. Remounts (and disposes the old
 * theme's procedural textures) when the theme changes.
 */
export function ThemedTableSurface({ surface, palette }: ThemedTableSurfaceProps) {
  const Surface = SURFACES[surface];
  return <Surface key={surface} palette={palette} />;
}
