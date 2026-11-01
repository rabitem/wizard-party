'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { HudInsets, LayoutPolicy, LayoutProfile } from '@/presentation/types/hud-layout.types';
import { resolveLayoutPolicy } from './layout-policy';
import { viewportStore } from './viewport-store';
import { ZERO_HUD_INSETS, hudInsetsStore } from './hud-insets-store';

/** Raw viewport facts (size, orientation, pointer); correct on the first client render. */
export function useLayoutProfile(): LayoutProfile {
  return useSyncExternalStore(viewportStore.subscribe, viewportStore.getSnapshot, viewportStore.getServerSnapshot);
}

/** The game HUD's responsive policy: the only input for surface and size decisions. */
export function useLayoutPolicy(): LayoutPolicy {
  const profile = useLayoutProfile();
  return useMemo(() => resolveLayoutPolicy(profile), [profile]);
}

const getServerInsets = () => ZERO_HUD_INSETS;

/** Screen insets the HUD currently reserves (published by HudLayout). */
export function useHudInsets(): HudInsets {
  return useSyncExternalStore(hudInsetsStore.subscribe, hudInsetsStore.get, getServerInsets);
}
