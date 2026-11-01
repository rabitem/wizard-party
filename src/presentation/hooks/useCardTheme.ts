'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { Suit } from '@shared/domain';
import type { CardTheme, SuitTheme } from '@/presentation/components/settings';
import {
  SERVER_CARD_THEME_SNAPSHOT,
  cardThemeVersionOf,
  findCardTheme,
  getActiveCardTheme,
  getCardThemeSnapshot,
  subscribeCardTheme,
} from '@/presentation/utils/card-theme-store';

function getServerSnapshot() {
  return SERVER_CARD_THEME_SNAPSHOT;
}

function useCardThemeSnapshot() {
  return useSyncExternalStore(subscribeCardTheme, getCardThemeSnapshot, getServerSnapshot);
}

/** Hook to subscribe to card theme/size changes - causes re-render when settings change */
export function useCardThemeVersion(): string {
  return cardThemeVersionOf(useCardThemeSnapshot());
}

/**
 * Hook returning the active card theme; re-renders when it changes (also from another tab).
 * Use it instead of the imperative getSuitTheme below in anything that renders suit colours, symbols
 * or names, so the UI switches together with the card textures.
 */
export function useCurrentCardTheme(): CardTheme {
  const { themeId } = useCardThemeSnapshot();
  return useMemo(() => findCardTheme(themeId), [themeId]);
}

/** Get suit theme for a specific suit based on current card theme */
export function getSuitTheme(suit: Suit): SuitTheme {
  return getActiveCardTheme().suits[suit];
}
