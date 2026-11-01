import { safeLocalStorage } from '@/lib/storage';
import { resolveLegacySoundboardOptionId, type TimeoutSoundboardOption } from './timeout-soundboard-options';

const STORAGE_KEY = 'wizard-party-timeout-soundboard';
export const TIMEOUT_SOUNDBOARD_CHANGED_EVENT = 'timeout-soundboard-changed';

export interface TimeoutSoundboardPreferences {
  pinnedIds: string[];
  orderedIds: string[];
}

const EMPTY_PREFERENCES: TimeoutSoundboardPreferences = {
  pinnedIds: [],
  orderedIds: [],
};

function uniqueOptionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((item): item is string => typeof item === 'string').map(resolveLegacySoundboardOptionId);
  return Array.from(new Set(ids));
}

export function normalizeTimeoutSoundboardPreferences(value: unknown): TimeoutSoundboardPreferences {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_PREFERENCES };
  const preferences = value as Partial<Record<keyof TimeoutSoundboardPreferences, unknown>>;
  return {
    pinnedIds: uniqueOptionIds(preferences.pinnedIds),
    orderedIds: uniqueOptionIds(preferences.orderedIds),
  };
}

export function loadTimeoutSoundboardPreferences(): TimeoutSoundboardPreferences {
  if (typeof window === 'undefined') return { ...EMPTY_PREFERENCES };
  return normalizeTimeoutSoundboardPreferences(safeLocalStorage.readJson(STORAGE_KEY));
}

export function saveTimeoutSoundboardPreferences(
  preferences: TimeoutSoundboardPreferences
): TimeoutSoundboardPreferences {
  const normalized = normalizeTimeoutSoundboardPreferences(preferences);
  if (typeof window !== 'undefined') {
    safeLocalStorage.writeJson(STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent(TIMEOUT_SOUNDBOARD_CHANGED_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function applyTimeoutSoundboardPreferences(
  options: TimeoutSoundboardOption[],
  preferences: TimeoutSoundboardPreferences
): TimeoutSoundboardOption[] {
  const originalIndex = new Map(options.map((option, index) => [option.id, index]));
  const orderIndex = new Map(preferences.orderedIds.map((id, index) => [id, index]));
  const pinnedIds = new Set(preferences.pinnedIds);

  return [...options].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    const aOrder = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
}

export function togglePinnedSoundboardOption(
  preferences: TimeoutSoundboardPreferences,
  optionId: string
): TimeoutSoundboardPreferences {
  const pinnedIds = new Set(preferences.pinnedIds);
  if (pinnedIds.has(optionId)) pinnedIds.delete(optionId);
  else pinnedIds.add(optionId);
  return { ...preferences, pinnedIds: Array.from(pinnedIds) };
}

export function moveSoundboardOption(
  options: TimeoutSoundboardOption[],
  preferences: TimeoutSoundboardPreferences,
  optionId: string,
  direction: -1 | 1
): TimeoutSoundboardPreferences {
  const orderedIds = applyTimeoutSoundboardPreferences(options, preferences).map((option) => option.id);
  const index = orderedIds.indexOf(optionId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return preferences;

  [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
  return { ...preferences, orderedIds };
}
