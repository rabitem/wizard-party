'use client';

import { useActiveTheme } from '@/presentation/components/seasonal/useActiveTheme';
import { getLobbySkin } from './lobby-skin-registry';
import type { LobbySkin } from './lobby-skin.types';

/** The lobby skin of the active UI theme (EMPTY_LOBBY_SKIN for themes without one). */
export function useLobbySkin(): LobbySkin {
  return getLobbySkin(useActiveTheme());
}
