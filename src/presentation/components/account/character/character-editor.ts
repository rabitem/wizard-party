import { ACHIEVEMENTS } from '@shared/domain/account';
import {
  CHARACTER_PARTS,
  CHARACTER_SLOTS,
  findCharacterPart,
  type CharacterAppearance,
  type CharacterPart,
  type CharacterSlot,
} from '@shared/domain/character';

/** Slots in editor order, with the names players see. */
export const EDITOR_SLOTS: readonly { slot: CharacterSlot; label: string }[] = [
  { slot: 'head', label: 'Head' },
  { slot: 'headwear', label: 'Headwear' },
  { slot: 'outfit', label: 'Outfit' },
  { slot: 'cape', label: 'Cape' },
  { slot: 'mainHand', label: 'Main hand' },
  { slot: 'offHand', label: 'Off hand' },
  { slot: 'palette', label: 'Colours' },
  { slot: 'familiar', label: 'Familiar' },
];

export interface PartOption {
  id: string;
  name: string;
  selected: boolean;
  locked: boolean;
  /** How a locked part unlocks, e.g. "Level 5" or "Achievement: Champion". */
  requirement: string | null;
}

const ACHIEVEMENT_NAMES = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement.name]));

/** What a player must do for a part; null for starter parts. */
export function unlockRequirement(part: CharacterPart): string | null {
  switch (part.unlock.kind) {
    case 'starter': return null;
    case 'level': return `Level ${part.unlock.level}`;
    case 'achievement': return `Achievement: ${ACHIEVEMENT_NAMES.get(part.unlock.achievementId) ?? part.unlock.achievementId}`;
  }
}

/** The choices of one slot, in catalog order, as the server reported the unlocks. */
export function partOptions(slot: CharacterSlot, draft: CharacterAppearance, unlockedPartIds: ReadonlySet<string>): PartOption[] {
  return CHARACTER_PARTS.filter((part) => part.slot === slot).map((part) => {
    const locked = !unlockedPartIds.has(part.id);
    return { id: part.id, name: part.name, selected: draft[slot] === part.id, locked, requirement: locked ? unlockRequirement(part) : null };
  });
}

/** True when the draft differs from the saved look in any slot. */
export function isDirty(draft: CharacterAppearance, saved: CharacterAppearance): boolean {
  return CHARACTER_SLOTS.some((slot) => draft[slot] !== saved[slot]);
}

/** Why a part of the draft is shown as "changed to fit": the rule withPart applied. */
export function adjustedSlots(before: CharacterAppearance, after: CharacterAppearance, chosenPartId: string): CharacterSlot[] {
  const chosen = findCharacterPart(chosenPartId)?.slot;
  return CHARACTER_SLOTS.filter((slot) => slot !== chosen && before[slot] !== after[slot]);
}

/** Messages for the reasons the server refuses a save (AppearanceError codes). */
export const SAVE_ERRORS: Readonly<Record<string, string>> = {
  locked_part: 'One of these parts is not unlocked yet.',
  unknown_part: 'One of these parts no longer exists. Pick another one.',
  wrong_slot: 'One of these parts does not fit its slot.',
  two_handed: 'The staff needs both hands.',
  hood_and_headwear: 'A hood and headwear do not go together.',
  appearance_shape: 'This look could not be read. Reload and try again.',
};
