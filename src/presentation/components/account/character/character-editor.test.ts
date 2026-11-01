import { describe, expect, it } from 'vitest';
import { CHARACTER_PARTS, CHARACTER_SLOTS, DEFAULT_APPEARANCE, findCharacterPart, withPart } from '@shared/domain/character';

import { EDITOR_SLOTS, adjustedSlots, isDirty, partOptions, unlockRequirement } from './character-editor';

const STARTER = new Set(CHARACTER_PARTS.filter((part) => part.unlock.kind === 'starter').map((part) => part.id));

describe('character editor', () => {
  it('should offer every slot once', () => {
    expect(EDITOR_SLOTS.map((entry) => entry.slot).sort()).toEqual([...CHARACTER_SLOTS].sort());
  });

  it('should mark the selected part and say how locked parts unlock', () => {
    const heads = partOptions('head', DEFAULT_APPEARANCE, STARTER);
    expect(heads.find((option) => option.selected)?.id).toBe('head:mage');
    expect(heads.find((option) => option.id === 'head:knight')).toMatchObject({ locked: true, requirement: 'Level 5' });
    expect(heads.find((option) => option.id === 'head:rogue')).toMatchObject({ locked: false, requirement: null });
  });

  it('should name the achievement behind an achievement part', () => {
    const shield = findCharacterPart('off:badge-shield');
    expect(shield && unlockRequirement(shield)).toBe('Achievement: Champion');
  });

  it('should tell a changed draft from the saved look', () => {
    expect(isDirty(DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE })).toBe(false);
    expect(isDirty({ ...DEFAULT_APPEARANCE, palette: 'palette:forest' }, DEFAULT_APPEARANCE)).toBe(true);
  });

  it('should report the slots a choice changed to fit, not the chosen one', () => {
    expect(adjustedSlots(DEFAULT_APPEARANCE, withPart(DEFAULT_APPEARANCE, 'main:staff'), 'main:staff')).toEqual(['offHand']);
    expect(adjustedSlots(DEFAULT_APPEARANCE, withPart(DEFAULT_APPEARANCE, 'palette:forest'), 'palette:forest')).toEqual([]);
  });
});
