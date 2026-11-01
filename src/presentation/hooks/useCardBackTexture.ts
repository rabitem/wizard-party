'use client';

import { useMemo } from 'react';
import type * as THREE from 'three';
import { getCurrentCardBackTexture } from '../utils/card-texture';
import { useCardThemeVersion } from './useCardTheme';

/**
 * Shared card back texture of the selected deck. Re-resolves when the card
 * theme changes (same trigger the card fronts use). The texture is cached and
 * shared: components must not dispose it.
 */
export function useCardBackTexture(): THREE.CanvasTexture | null {
  const themeVersion = useCardThemeVersion();
  return useMemo(
    () => (typeof document === 'undefined' ? null : getCurrentCardBackTexture()),
    [themeVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );
}
