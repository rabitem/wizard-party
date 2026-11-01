'use client';

import { useEffect, useMemo } from 'react';
import { createEnhancedWoodTexture, createWoodNormalMap } from './woodTextures';
import { createLeatherTexture, createLeatherNormalMap } from './leatherTextures';
import { useSelectedTableTheme } from './table-theme';
import {
  createLeatherMaterialProps,
  createWoodMaterialProps,
  type TableTextures,
} from './table-visual-materials';

const WOOD_TEXTURE_SIZE = 512;

/**
 * Custom hook for managing table textures.
 * All maps are procedural canvas textures: nothing is fetched, so the table never suspends on them.
 * Only called inside the client-only R3F Canvas, so `document` exists.
 */
export function useTableTextures(): TableTextures {
  const tableTheme = useSelectedTableTheme();

  const woodTexture = useMemo(() => createEnhancedWoodTexture(WOOD_TEXTURE_SIZE), []);

  // Create procedural maps only on client side
  const woodNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createWoodNormalMap(256);
  }, []);

  const leatherTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createLeatherTexture(256);
  }, []);

  const leatherNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createLeatherNormalMap(256);
  }, []);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      woodNormalMap?.dispose();
      woodTexture.dispose();
      leatherTexture?.dispose();
      leatherNormalMap?.dispose();
    };
  }, [woodNormalMap, woodTexture, leatherTexture, leatherNormalMap]);

  const woodMaterialProps = createWoodMaterialProps(tableTheme, {
    woodTexture,
    woodNormalMap,
  });

  const leatherMaterialProps = createLeatherMaterialProps(tableTheme, {
    leatherTexture,
    leatherNormalMap,
  });

  return {
    woodMaterialProps,
    leatherMaterialProps,
  };
}
