import { COLLECTION_ANIMATION_MODE_IDS } from '../../config/collection-animation.config';
import { SANDBOX_PLAYER_COUNTS, SANDBOX_VIEWPORTS, type SandboxViewport } from '../../config/sandbox.config';
import { CARD_NUMBER_SIZE_PRESETS, CARD_THEMES, TABLE_THEMES, THEME_PRESETS } from '../settings';
import { ALL_SCENARIOS } from './sandbox-scenario-registry';
import type { SandboxSettings } from './sandbox.types';

/** Every value of every axis the audit matrix can vary, read from the real presets. */
export interface SandboxDimensions {
  cardTheme: string[];
  tableTheme: string[];
  theme: string[];
  collectionAnimation: string[];
  cardNumberSize: string[];
  scenario: Array<{ id: string; title: string; covers: string[] }>;
  viewport: SandboxViewport[];
  playerCount: number[];
}

export function getSandboxDimensions(): SandboxDimensions {
  return {
    cardTheme: CARD_THEMES.map((theme) => theme.id),
    tableTheme: TABLE_THEMES.map((theme) => theme.id),
    theme: THEME_PRESETS.map((theme) => theme.id),
    collectionAnimation: [...COLLECTION_ANIMATION_MODE_IDS],
    cardNumberSize: CARD_NUMBER_SIZE_PRESETS.map((preset) => preset.id),
    // Long scenarios (theme sweep, measured rounds, the visual tour) are listed last; they usually run on their own.
    scenario: ALL_SCENARIOS.map(({ id, title, covers }) => ({ id, title, covers })),
    viewport: [...SANDBOX_VIEWPORTS],
    playerCount: [...SANDBOX_PLAYER_COUNTS],
  };
}

/** Resolves 'next' to the option after the current one, so scenarios can switch without naming ids. */
export function resolveSettingsPatch(
  current: SandboxSettings,
  patch: Partial<Record<keyof SandboxSettings, string>>
): Partial<SandboxSettings> {
  const dimensions = getSandboxDimensions();
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(patch) as Array<[keyof SandboxSettings, string]>) {
    if (value !== 'next') {
      resolved[key] = value;
      continue;
    }
    const options = dimensions[key];
    const index = options.indexOf(current[key]);
    resolved[key] = options[(index + 1) % options.length];
  }
  return resolved as Partial<SandboxSettings>;
}
