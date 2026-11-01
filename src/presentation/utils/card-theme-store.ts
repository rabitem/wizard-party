import {
  loadGameSettings,
  CARD_NUMBER_SIZE_PRESETS,
  CARD_THEMES,
  type CardNumberSize,
  type CardNumberSizePreset,
  type CardTheme,
} from '@/presentation/components/settings';

/**
 * Single source of truth for the active card theme and number size.
 *
 * Card textures, the HUD suit helpers and the React subscription (useCardThemeVersion) all read
 * this snapshot, so the version a component memoises on always matches what the textures draw.
 * The snapshot is re-read from the saved settings on 'settings-changed' (same tab) and 'storage'
 * (another tab saved), and listeners are notified only when the card theme or number size changed.
 */
export interface CardThemeSnapshot {
  readonly themeId: string;
  readonly numberSize: CardNumberSize;
}

export const SERVER_CARD_THEME_SNAPSHOT: CardThemeSnapshot = Object.freeze({
  themeId: CARD_THEMES[0].id,
  numberSize: 'medium',
});

let snapshot: CardThemeSnapshot | null = null;
let listeners: Array<() => void> = [];

function readSnapshotFromSettings(): CardThemeSnapshot {
  const { cardTheme, cardNumberSize } = loadGameSettings();
  return { themeId: cardTheme, numberSize: cardNumberSize };
}

/** Current snapshot; read lazily so the first access sees the settings saved before this module loaded. */
export function getCardThemeSnapshot(): CardThemeSnapshot {
  snapshot ??= readSnapshotFromSettings();
  return snapshot;
}

export function subscribeCardTheme(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Re-read the saved settings and notify subscribers if the card theme or number size changed.
 * Unrelated settings (sound, table theme, ...) are ignored. A snapshot nobody has read yet counts
 * as changed.
 */
function syncCardThemeFromSettings(): void {
  const previous = snapshot;
  const next = readSnapshotFromSettings();
  if (previous && next.themeId === previous.themeId && next.numberSize === previous.numberSize) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

/** Stable string key of a snapshot, used as a memo dependency for theme-dependent resources. */
export function cardThemeVersionOf(s: CardThemeSnapshot): string {
  return `${s.themeId}-${s.numberSize}`;
}

export function findCardTheme(themeId: string): CardTheme {
  return CARD_THEMES.find((t) => t.id === themeId) ?? CARD_THEMES[0]; // Default to fantasy
}

/** The active card theme */
export function getActiveCardTheme(): CardTheme {
  return findCardTheme(getCardThemeSnapshot().themeId);
}

/** Font sizes for card numbers of the active number size preset */
export function getActiveCardNumberFontSizes(): CardNumberSizePreset['fontSizes'] {
  const { numberSize } = getCardThemeSnapshot();
  const preset = CARD_NUMBER_SIZE_PRESETS.find((p) => p.id === numberSize);
  return preset?.fontSizes ?? CARD_NUMBER_SIZE_PRESETS[1].fontSizes; // Default to medium
}

if (typeof window !== 'undefined') {
  window.addEventListener('settings-changed', syncCardThemeFromSettings);
  window.addEventListener('storage', syncCardThemeFromSettings);
}
