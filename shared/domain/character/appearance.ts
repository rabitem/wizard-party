import { CHARACTER_PARTS, CHARACTER_SLOTS, findCharacterPart, type CharacterPart, type CharacterSlot } from './character-catalog';

/** The stored shape (player_profiles.appearance). `v` lets a later shape migrate on read. */
export interface CharacterAppearance {
  v: 1;
  head: string;
  outfit: string;
  headwear: string;
  cape: string;
  mainHand: string;
  offHand: string;
  palette: string;
  familiar: string;
}

/** What a player has earned so far; parts unlock from it, nothing about unlocks is stored. */
export interface CharacterUnlockContext {
  level: number;
  achievementIds: ReadonlySet<string>;
}

export type AppearanceError =
  | 'appearance_shape'
  | 'unknown_part'
  | 'wrong_slot'
  | 'locked_part'
  | 'two_handed'
  | 'hood_and_headwear';

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  v: 1,
  head: 'head:mage',
  outfit: 'outfit:mage',
  headwear: 'headwear:mage-hat',
  cape: 'cape:mage',
  mainHand: 'main:wand',
  offHand: 'off:spellbook',
  palette: 'palette:classic',
  familiar: 'familiar:owl',
};

export function isPartUnlocked(part: CharacterPart, context: CharacterUnlockContext): boolean {
  switch (part.unlock.kind) {
    case 'starter': return true;
    case 'level': return context.level >= part.unlock.level;
    case 'achievement': return context.achievementIds.has(part.unlock.achievementId);
  }
}

/** Every part the player may wear, in catalog order. */
export function unlockedCharacterParts(context: CharacterUnlockContext): CharacterPart[] {
  return CHARACTER_PARTS.filter((part) => isPartUnlocked(part, context));
}

/** Reads untrusted JSON (a request body, a stored row). Null when it is not an appearance. */
export function parseAppearance(value: unknown): CharacterAppearance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.v !== 1) return null;
  const appearance = { v: 1 } as CharacterAppearance;
  for (const slot of CHARACTER_SLOTS) {
    const id = record[slot];
    if (typeof id !== 'string') return null;
    appearance[slot] = id;
  }
  return appearance;
}

/** Checks the parts, their slots and combinations; with a context also that each one is unlocked. */
export function validateAppearance(appearance: CharacterAppearance, context?: CharacterUnlockContext): AppearanceError | null {
  const parts = {} as Record<CharacterSlot, CharacterPart>;
  for (const slot of CHARACTER_SLOTS) {
    const part = findCharacterPart(appearance[slot]);
    if (!part) return 'unknown_part';
    if (part.slot !== slot) return 'wrong_slot';
    if (context && !isPartUnlocked(part, context)) return 'locked_part';
    parts[slot] = part;
  }
  if (parts.mainHand.twoHanded && appearance.offHand !== 'off:none') return 'two_handed';
  if (parts.head.coversHead && appearance.headwear !== 'headwear:none') return 'hood_and_headwear';
  return null;
}

/**
 * A stored appearance that is no longer valid (a part was retired, or the player lost a level
 * after a rule change) falls back slot by slot, so the rest of their choices survive.
 */
export function repairAppearance(appearance: CharacterAppearance, context: CharacterUnlockContext): CharacterAppearance {
  const repaired = { ...appearance };
  for (const slot of CHARACTER_SLOTS) {
    const part = findCharacterPart(repaired[slot]);
    if (!part || part.slot !== slot || !isPartUnlocked(part, context)) repaired[slot] = DEFAULT_APPEARANCE[slot];
  }
  if (findCharacterPart(repaired.mainHand)?.twoHanded) repaired.offHand = 'off:none';
  if (findCharacterPart(repaired.head)?.coversHead) repaired.headwear = 'headwear:none';
  return repaired;
}

type StarterLook = Partial<Omit<CharacterAppearance, 'v'>>;

const ROGUE: StarterLook = { head: 'head:rogue', outfit: 'outfit:rogue', headwear: 'headwear:none', cape: 'cape:none' };

/** Today's avatar ids (the presentation's AVATAR_PRESETS), mapped onto starter parts only. */
export const LEGACY_AVATAR_LOOKS: Readonly<Record<string, StarterLook>> = {
  wizard: {},
  scroll: { offHand: 'off:spellbook' },
  brain: { offHand: 'off:spellbook' },
  potion: { palette: 'palette:forest' },
  fairy: { palette: 'palette:forest' },
  beer: { mainHand: 'main:mug' },
  trophy: { mainHand: 'main:mug' },
  skull: { ...ROGUE, palette: 'palette:shadow' },
  ghost: { ...ROGUE, palette: 'palette:shadow' },
  bat: { ...ROGUE, palette: 'palette:shadow' },
  raven: { ...ROGUE, palette: 'palette:shadow' },
  wolf: { ...ROGUE, palette: 'palette:shadow' },
  eye: { ...ROGUE, palette: 'palette:shadow' },
  archer: ROGUE,
  sword: ROGUE,
  'crossed-swords': ROGUE,
  'spinning-sword': ROGUE,
  key: ROGUE,
  dice: ROGUE,
};

/** The character a player starts with: derived from the avatar they chose before characters. */
export function appearanceForLegacyAvatar(avatarId: string | null | undefined): CharacterAppearance {
  const look = (avatarId && Object.prototype.hasOwnProperty.call(LEGACY_AVATAR_LOOKS, avatarId)) ? LEGACY_AVATAR_LOOKS[avatarId] : {};
  return { ...DEFAULT_APPEARANCE, ...look };
}

/**
 * The look other players see: the saved one while every part still exists in the slot it was
 * saved in, else the one derived from the avatar chosen before characters. Display never checks
 * unlocks; the server checked them when the look was saved.
 */
export function displayedAppearance(stored: unknown, legacyAvatarId: string | null | undefined): CharacterAppearance {
  const saved = parseAppearance(stored);
  return saved && validateAppearance(saved) === null ? saved : appearanceForLegacyAvatar(legacyAvatarId);
}
