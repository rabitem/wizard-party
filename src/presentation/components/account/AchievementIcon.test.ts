import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from '@shared/domain/account';

import { hasAchievementIcon } from './AchievementIcon';

describe('AchievementIcon', () => {
  it('should map an icon for every achievement in the catalogue', () => {
    const missing = ACHIEVEMENTS.filter((achievement) => !hasAchievementIcon(achievement.icon)).map((a) => `${a.id} (${a.icon})`);
    expect(missing).toEqual([]);
  });
});
