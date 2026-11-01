import { describe, expect, it } from 'vitest';

import {
  AVATAR_FRAMES,
  LEVEL_REWARDS,
  PROFILE_BANNERS,
  equippedCosmetics,
  getProgression,
  isAvatarFrameId,
  isProfileBannerId,
  levelsGained,
  nextReward,
  rewardMilestones,
  summarizeLevelUps,
  totalXpForLevel,
  xpToNextLevel,
} from './index';

describe('totalXpForLevel', () => {
  it('should equal the sum of the per-level steps', () => {
    let sum = 0;
    for (let level = 1; level <= 60; level += 1) {
      expect(totalXpForLevel(level)).toBe(sum);
      expect(getProgression(sum)).toMatchObject({ level, levelXp: 0 });
      sum += xpToNextLevel(level);
    }
    expect(getProgression(0)).toMatchObject({ level: 1, levelXp: 0, title: 'Apprentice' });
    expect(getProgression(totalXpForLevel(3) + 5)).toMatchObject({ level: 3, levelXp: 5, title: 'Hedge Mage' });
  });

  it('should clamp levels below one to zero XP', () => {
    expect(totalXpForLevel(0)).toBe(0);
    expect(totalXpForLevel(-3)).toBe(0);
  });
});

describe('LEVEL_REWARDS', () => {
  it('should have unique ids and be sorted by level', () => {
    expect(new Set(LEVEL_REWARDS.map((reward) => reward.id)).size).toBe(LEVEL_REWARDS.length);
    const levels = LEVEL_REWARDS.map((reward) => reward.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('should keep starting cosmetics at level one', () => {
    expect(AVATAR_FRAMES[0].level).toBe(1);
    expect(PROFILE_BANNERS[0].level).toBe(1);
  });
});

describe('nextReward', () => {
  it('should find the next reward ahead', () => {
    expect(nextReward(1)).toMatchObject({ id: 'title:hedge-mage', level: 3 });
    expect(nextReward(3)).toMatchObject({ id: 'frame:bronze', level: 5 });
    expect(nextReward(50)).toBeNull();
  });
});

describe('rewardMilestones', () => {
  it('should group rewards by level without losing any', () => {
    const milestones = rewardMilestones();
    expect(milestones.flatMap((milestone) => milestone.rewards)).toEqual([...LEVEL_REWARDS]);
    expect(new Set(milestones.map((milestone) => milestone.level)).size).toBe(milestones.length);
  });
});

describe('equippedCosmetics', () => {
  it('should default to the highest unlocked frame and banner', () => {
    expect(equippedCosmetics(1)).toEqual({ frameId: 'plain', bannerId: 'parchment' });
    expect(equippedCosmetics(9)).toEqual({ frameId: 'bronze', bannerId: 'ember' });
    expect(equippedCosmetics(20)).toEqual({ frameId: 'gold', bannerId: 'twilight' });
    expect(equippedCosmetics(99)).toEqual({ frameId: 'legendary', bannerId: 'starfall' });
  });

  it('should recognise cosmetic ids', () => {
    expect(isAvatarFrameId('gold')).toBe(true);
    expect(isAvatarFrameId('platinum')).toBe(false);
    expect(isProfileBannerId('aurora')).toBe(true);
    expect(isProfileBannerId(undefined)).toBe(false);
  });
});

describe('levelsGained', () => {
  it('should be empty when no level is crossed', () => {
    expect(levelsGained(0, 50)).toEqual([]);
    expect(levelsGained(500, 500)).toEqual([]);
    expect(levelsGained(500, 100)).toEqual([]);
  });

  it('should list each crossed level with its rewards', () => {
    const gained = levelsGained(totalXpForLevel(4) + 10, totalXpForLevel(6));
    expect(gained.map((levelUp) => levelUp.level)).toEqual([5, 6]);
    expect(gained[0].rewards.map((reward) => reward.id)).toEqual(['frame:bronze', 'part:head:knight', 'part:outfit:knight', 'part:headwear:knight-helmet', 'part:cape:knight']);
    expect(gained[1]).toMatchObject({ title: 'Conjurer' });
    expect(levelsGained(totalXpForLevel(9), totalXpForLevel(10))[0].rewards.map((reward) => reward.id)).toEqual([
      'title:sorcerer', 'frame:silver', 'part:head:barbarian', 'part:outfit:barbarian', 'part:headwear:barbarian-hat', 'part:cape:barbarian', 'part:off:barbarian-shield',
    ]);
    expect(levelsGained(totalXpForLevel(1), totalXpForLevel(2))[0].rewards).toEqual([]);
  });

  it('should summarize several level-ups into the highest one with all rewards', () => {
    const summary = summarizeLevelUps(levelsGained(0, totalXpForLevel(5)));
    expect(summary).toMatchObject({ level: 5, title: 'Hedge Mage' });
    expect(summary?.rewards.map((reward) => reward.id)).toEqual([
      'title:hedge-mage', 'part:palette:ember', 'frame:bronze', 'part:head:knight', 'part:outfit:knight', 'part:headwear:knight-helmet', 'part:cape:knight',
    ]);
    expect(summarizeLevelUps([])).toBeNull();
  });
});
