import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE, appearanceForLegacyAvatar } from '@shared/domain/character';

vi.mock('@/lib/account/account-api', () => ({ accountApi: {} }));

import { chooseLocalAppearance } from './useLocalAppearance';

const saved = { ...DEFAULT_APPEARANCE, palette: 'palette:frost' };

describe('chooseLocalAppearance', () => {
  it('should show a silhouette for a guest', () => {
    expect(chooseLocalAppearance('guest', null, null, 'skull')).toBeNull();
  });

  it("should show the saved look once it has loaded for this player", () => {
    expect(chooseLocalAppearance('signed-in', 'u1', { userId: 'u1', appearance: saved, saved: true }, 'skull')).toEqual(saved);
  });

  it('should follow the local avatar while loading, for another player, or when nothing was saved', () => {
    const derived = appearanceForLegacyAvatar('skull');
    expect(chooseLocalAppearance('loading', null, null, 'skull')).toEqual(derived);
    expect(chooseLocalAppearance('signed-in', 'u2', { userId: 'u1', appearance: saved, saved: true }, 'skull')).toEqual(derived);
    expect(chooseLocalAppearance('signed-in', 'u1', { userId: 'u1', appearance: saved, saved: false }, 'skull')).toEqual(derived);
  });
});
