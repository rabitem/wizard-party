'use client';

import { createContext, useContext } from 'react';
import type { HudRegion } from '@/presentation/types/hud-layout.types';

/** DOM nodes of the mounted HUD regions; slots portal into them. */
export type HudRegionNodes = Partial<Record<HudRegion, HTMLElement>>;

export const HudRegionsContext = createContext<HudRegionNodes | null>(null);

/** The DOM node of a region, or null outside a HudLayout / before it mounted. */
export function useHudRegionNode(region: HudRegion): HTMLElement | null {
  const nodes = useContext(HudRegionsContext);
  return nodes?.[region] ?? null;
}
