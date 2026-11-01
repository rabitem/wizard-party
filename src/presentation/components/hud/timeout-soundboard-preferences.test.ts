import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  TIMEOUT_SOUNDBOARD_CHANGED_EVENT,
  applyTimeoutSoundboardPreferences,
  loadTimeoutSoundboardPreferences,
  moveSoundboardOption,
  normalizeTimeoutSoundboardPreferences,
  saveTimeoutSoundboardPreferences,
  togglePinnedSoundboardOption,
} from './timeout-soundboard-preferences';
import type { TimeoutSoundboardOption } from './timeout-soundboard-options';

const options: TimeoutSoundboardOption[] = [
  { id: 'preset:a', label: 'A', group: 'Wizard', soundName: 'wizardAirhorn' },
  { id: 'preset:b', label: 'B', group: 'Jester', soundName: 'jesterBonk' },
  { id: 'custom:player-1:c', label: 'C', group: 'Custom' },
];

describe('timeout soundboard preferences', () => {
  it('normalizes malformed persisted data', () => {
    expect(normalizeTimeoutSoundboardPreferences({
      pinnedIds: ['preset:a', 'preset:a', 42],
      orderedIds: ['preset:b', null, 'preset:b'],
    })).toEqual({
      pinnedIds: ['preset:a'],
      orderedIds: ['preset:b'],
    });
  });

  it('points pins and order at the successors of retired preset sounds', () => {
    expect(normalizeTimeoutSoundboardPreferences({
      pinnedIds: ['preset:jesterWindowsError', 'preset:jesterWindowsXpError', 'custom:player-1:c'],
      orderedIds: ['preset:gameWinFlawless'],
    })).toEqual({
      pinnedIds: ['preset:jesterErrorBeep', 'custom:player-1:c'],
      orderedIds: ['preset:gameWinTriumph'],
    });
  });

  it('pins sounds before unpinned sounds and preserves explicit order', () => {
    const sorted = applyTimeoutSoundboardPreferences(options, {
      pinnedIds: ['custom:player-1:c'],
      orderedIds: ['preset:b', 'custom:player-1:c', 'preset:a'],
    });

    expect(sorted.map((option) => option.id)).toEqual([
      'custom:player-1:c',
      'preset:b',
      'preset:a',
    ]);
  });

  it('toggles pins and moves options in the persisted order', () => {
    const pinned = togglePinnedSoundboardOption({ pinnedIds: [], orderedIds: [] }, 'preset:b');
    const moved = moveSoundboardOption(options, { pinnedIds: [], orderedIds: [] }, 'preset:b', -1);

    expect(pinned.pinnedIds).toEqual(['preset:b']);
    expect(moved.orderedIds.slice(0, 2)).toEqual(['preset:b', 'preset:a']);
  });
});

describe('timeout soundboard preferences storage', () => {
  /** Players' browsers already hold their pins under this key; renaming it would drop them. */
  const STORAGE_KEY = 'wizard-party-timeout-soundboard';
  let store: Map<string, string>;
  let dispatchEvent: Mock<(event: Event) => boolean>;

  beforeEach(() => {
    store = new Map();
    dispatchEvent = vi.fn((event: Event) => {
      void event;
      return true;
    });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    vi.stubGlobal('window', { dispatchEvent });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads pins and order a player saved earlier', () => {
    store.set(STORAGE_KEY, JSON.stringify({ pinnedIds: ['preset:a'], orderedIds: ['preset:b', 'preset:a'] }));

    expect(loadTimeoutSoundboardPreferences()).toEqual({ pinnedIds: ['preset:a'], orderedIds: ['preset:b', 'preset:a'] });
  });

  it('saves normalized preferences under the same key and tells open soundboards', () => {
    const saved = saveTimeoutSoundboardPreferences({ pinnedIds: ['preset:b', 'preset:b'], orderedIds: ['preset:a'] });

    const expected = { pinnedIds: ['preset:b'], orderedIds: ['preset:a'] };
    expect(saved).toEqual(expected);
    expect(JSON.parse(store.get(STORAGE_KEY) ?? 'null')).toEqual(expected);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<unknown>;
    expect(event.type).toBe(TIMEOUT_SOUNDBOARD_CHANGED_EVENT);
    expect(event.detail).toEqual(expected);
  });
});
