import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from '../account';
import {
  CHARACTER_PARTS,
  CHARACTER_SLOTS,
  DEFAULT_APPEARANCE,
  LEGACY_AVATAR_LOOKS,
  BOT_DIFFICULTIES_WITH_LOOKS,
  appearanceForLegacyAvatar,
  botAppearance,
  displayedAppearance,
  parseAppearance,
  repairAppearance,
  unlockedCharacterParts,
  validateAppearance,
  withPart,
  type CharacterAppearance,
  type CharacterUnlockContext,
} from './index';

const NEW_PLAYER: CharacterUnlockContext = { level: 1, achievementIds: new Set() };
const VETERAN: CharacterUnlockContext = { level: 99, achievementIds: new Set(ACHIEVEMENTS.map((achievement) => achievement.id)) };
const look = (overrides: Partial<CharacterAppearance>): CharacterAppearance => ({ ...DEFAULT_APPEARANCE, ...overrides });

describe('character catalog', () => {
  it('should keep part ids unique, because they are stored', () => {
    expect(new Set(CHARACTER_PARTS.map((part) => part.id)).size).toBe(CHARACTER_PARTS.length);
  });

  it('should give a new player at least one part in every slot', () => {
    const slots = new Set(unlockedCharacterParts(NEW_PLAYER).map((part) => part.slot));
    expect([...CHARACTER_SLOTS].filter((slot) => !slots.has(slot))).toEqual([]);
  });

  it('should only unlock parts through achievements that exist', () => {
    const known = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
    const referenced = CHARACTER_PARTS.flatMap((part) => (part.unlock.kind === 'achievement' ? [part.unlock.achievementId] : []));
    expect(referenced.filter((id) => !known.has(id))).toEqual([]);
  });

  it('should unlock by level and by achievement', () => {
    const at = (level: number, ...achievementIds: string[]) => unlockedCharacterParts({ level, achievementIds: new Set(achievementIds) }).map((part) => part.id);
    expect(at(4)).not.toContain('head:knight');
    expect(at(5)).toContain('head:knight');
    expect(at(99)).not.toContain('off:badge-shield');
    expect(at(1, 'wins-10')).toContain('off:badge-shield');
  });
});

describe('validateAppearance', () => {
  it('should accept the default look for a brand-new player', () => {
    expect(validateAppearance(DEFAULT_APPEARANCE, NEW_PLAYER)).toBeNull();
  });

  it.each([
    ['an unknown part', look({ head: 'head:dragon' }), 'unknown_part'],
    ['a part in the wrong slot', look({ head: 'outfit:mage' }), 'wrong_slot'],
    ['a two-handed staff with something in the off hand', look({ mainHand: 'main:staff', offHand: 'off:spellbook' }), 'two_handed'],
    ['a hat on a hood', look({ head: 'head:rogue-hooded', headwear: 'headwear:mage-hat' }), 'hood_and_headwear'],
  ])('should reject %s', (_, appearance, error) => {
    expect(validateAppearance(appearance, VETERAN)).toBe(error);
  });

  it('should reject a part the player has not unlocked yet, and accept it without a context', () => {
    const knight = look({ head: 'head:knight' });
    expect(validateAppearance(knight, NEW_PLAYER)).toBe('locked_part');
    expect(validateAppearance(knight)).toBeNull();
  });
});

describe('parseAppearance', () => {
  it('should read a stored appearance and refuse anything else', () => {
    expect(parseAppearance(JSON.parse(JSON.stringify(DEFAULT_APPEARANCE)))).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance({ ...DEFAULT_APPEARANCE, v: 2 })).toBeNull();
    expect(parseAppearance({ ...DEFAULT_APPEARANCE, head: 7 })).toBeNull();
    expect(parseAppearance([DEFAULT_APPEARANCE])).toBeNull();
    expect(parseAppearance(null)).toBeNull();
  });
});

describe('repairAppearance', () => {
  it('should replace only the slots that are no longer allowed', () => {
    const stored = look({ head: 'head:knight', palette: 'palette:forest', mainHand: 'main:mug' });
    expect(repairAppearance(stored, NEW_PLAYER)).toEqual(look({ palette: 'palette:forest', mainHand: 'main:mug' }));
  });

  it('should leave a valid combination after repairing', () => {
    const stored = look({ head: 'head:rogue-hooded', mainHand: 'main:staff', headwear: 'headwear:knight-helmet' });
    expect(validateAppearance(repairAppearance(stored, { level: 15, achievementIds: new Set() }), { level: 15, achievementIds: new Set() })).toBeNull();
  });
});

describe('appearanceForLegacyAvatar', () => {
  it('should turn every avatar from before characters into a look a new player may wear', () => {
    for (const avatarId of [...Object.keys(LEGACY_AVATAR_LOOKS), 'not-an-avatar', null, undefined, 'constructor']) {
      expect(validateAppearance(appearanceForLegacyAvatar(avatarId), NEW_PLAYER)).toBeNull();
    }
  });

  it('should carry the flavour of the old avatar over', () => {
    expect(appearanceForLegacyAvatar('skull')).toMatchObject({ head: 'head:rogue', palette: 'palette:shadow' });
    expect(appearanceForLegacyAvatar('beer').mainHand).toBe('main:mug');
  });
});

describe('displayedAppearance', () => {
  it('should show a saved look, even with parts the viewer could not unlock', () => {
    const knight = look({ head: 'head:knight', outfit: 'outfit:knight' });
    expect(displayedAppearance(JSON.parse(JSON.stringify(knight)), 'skull')).toEqual(knight);
  });

  it('should fall back to the old avatar when nothing valid was saved', () => {
    expect(displayedAppearance(null, 'skull')).toEqual(appearanceForLegacyAvatar('skull'));
    expect(displayedAppearance(look({ head: 'head:retired' }), 'beer')).toEqual(appearanceForLegacyAvatar('beer'));
    expect(displayedAppearance({ v: 9 }, null)).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('botAppearance', () => {
  it('should give every bot difficulty its own valid look, and a middle one when unknown', () => {
    const looks = BOT_DIFFICULTIES_WITH_LOOKS.map((difficulty) => botAppearance(difficulty));
    expect(looks.every((botLook) => validateAppearance(botLook) === null)).toBe(true);
    expect(new Set(looks.map((botLook) => JSON.stringify(botLook))).size).toBe(looks.length);
    expect(botAppearance(undefined)).toEqual(botAppearance(3));
    expect(botAppearance(42)).toEqual(botAppearance(3));
  });
});

describe('withPart', () => {
  it('should let the new choice win: staff and off hand, hood and headwear', () => {
    const withStaff = withPart(DEFAULT_APPEARANCE, 'main:staff');
    expect(withStaff).toMatchObject({ mainHand: 'main:staff', offHand: 'off:none' });
    expect(withPart(withStaff, 'off:round-shield')).toMatchObject({ mainHand: 'main:none', offHand: 'off:round-shield' });
    const hooded = withPart(DEFAULT_APPEARANCE, 'head:rogue-hooded');
    expect(hooded).toMatchObject({ head: 'head:rogue-hooded', headwear: 'headwear:none' });
    expect(withPart(hooded, 'headwear:knight-helmet')).toMatchObject({ head: 'head:rogue', headwear: 'headwear:knight-helmet' });
  });

  it('should always leave a valid combination and ignore unknown parts', () => {
    let current = DEFAULT_APPEARANCE;
    for (const part of CHARACTER_PARTS) {
      current = withPart(current, part.id);
      expect(validateAppearance(current)).toBeNull();
    }
    expect(withPart(DEFAULT_APPEARANCE, 'head:dragon')).toBe(DEFAULT_APPEARANCE);
  });
});
