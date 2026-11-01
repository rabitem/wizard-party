'use client';

import { useActiveTheme } from '@/presentation/components/seasonal/useActiveTheme';
import { getHudSkin } from './hud-skin-registry';
import type { HudClassSlot, HudSkin } from './hud-skin.types';

/** The HUD skin of the active UI theme (EMPTY_HUD_SKIN for themes without one). */
export function useHudSkin(): HudSkin {
  return getHudSkin(useActiveTheme());
}

/** Extra classes the active skin appends to a host slot ('' when none). */
export function useHudClassName(slot: HudClassSlot): string {
  return useHudSkin().classNames?.[slot] ?? '';
}
