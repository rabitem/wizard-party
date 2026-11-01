'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { LayeredSurface, useSurfaceAssets } from '../LayeredSurface';
import { createMangaAssets } from './manga-surface.assets';

/** Off-white paper felt with faint screentone and an ensō stroke, ink-black lacquer rim. */
export function MangaSurface({ palette }: { palette: TableThemePalette }) {
  const assets = useSurfaceAssets(createMangaAssets, palette);

  return (
    <LayeredSurface
      layers={{
        base: assets.base,
        edge: assets.edge,
        center: assets.center,
        decal: assets.decal,
        innerRing: assets.innerRing,
        rim: assets.rim,
        lipCap: assets.cap,
        outerCap: assets.cap,
      }}
    />
  );
}
