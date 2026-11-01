/*
 * The character parts catalog. A character is one part per slot; every part is a declarative
 * entry with the way it unlocks. Rendering lives in the presentation layer, keyed by part id, so
 * ids are stored data (player_profiles.appearance) and never change once shipped.
 *
 * Bodies, headwear, capes and hand props come from the KayKit Adventurers pack (CC0); familiars
 * are our own models. Unlocks are derived from progress (level, achievements), never stored.
 */

export const CHARACTER_SLOTS = ['head', 'outfit', 'headwear', 'cape', 'mainHand', 'offHand', 'palette', 'familiar'] as const;
export type CharacterSlot = (typeof CHARACTER_SLOTS)[number];

export type PartUnlock =
  | { kind: 'starter' }
  | { kind: 'level'; level: number }
  | { kind: 'achievement'; achievementId: string };

export interface CharacterPart {
  /** Unique across all slots, e.g. `head:knight`. */
  id: string;
  slot: CharacterSlot;
  name: string;
  unlock: PartUnlock;
  /** Main-hand props held with both hands: the off hand stays empty. */
  twoHanded?: boolean;
  /** Heads that already cover the hair (a hood): no headwear on top. */
  coversHead?: boolean;
}

const starter: PartUnlock = { kind: 'starter' };
const level = (value: number): PartUnlock => ({ kind: 'level', level: value });
const achievement = (achievementId: string): PartUnlock => ({ kind: 'achievement', achievementId });

/** Unlock levels of the four adventurer sets, shared by their heads, outfits and gear. */
export const CHARACTER_SET_LEVELS = { knight: 5, barbarian: 10, hoodedRogue: 15 } as const;

export const CHARACTER_PARTS: readonly CharacterPart[] = [
  { id: 'head:mage', slot: 'head', name: 'Mage', unlock: starter },
  { id: 'head:rogue', slot: 'head', name: 'Rogue', unlock: starter },
  { id: 'head:knight', slot: 'head', name: 'Knight', unlock: level(CHARACTER_SET_LEVELS.knight) },
  { id: 'head:barbarian', slot: 'head', name: 'Barbarian', unlock: level(CHARACTER_SET_LEVELS.barbarian) },
  { id: 'head:rogue-hooded', slot: 'head', name: 'Hooded Rogue', unlock: level(CHARACTER_SET_LEVELS.hoodedRogue), coversHead: true },

  { id: 'outfit:mage', slot: 'outfit', name: 'Mage Robes', unlock: starter },
  { id: 'outfit:rogue', slot: 'outfit', name: 'Rogue Leathers', unlock: starter },
  { id: 'outfit:knight', slot: 'outfit', name: 'Knight Armour', unlock: level(CHARACTER_SET_LEVELS.knight) },
  { id: 'outfit:barbarian', slot: 'outfit', name: 'Barbarian Furs', unlock: level(CHARACTER_SET_LEVELS.barbarian) },

  { id: 'headwear:none', slot: 'headwear', name: 'No Headwear', unlock: starter },
  { id: 'headwear:mage-hat', slot: 'headwear', name: 'Mage Hat', unlock: starter },
  { id: 'headwear:knight-helmet', slot: 'headwear', name: 'Knight Helmet', unlock: level(CHARACTER_SET_LEVELS.knight) },
  { id: 'headwear:barbarian-hat', slot: 'headwear', name: 'Horned Hat', unlock: level(CHARACTER_SET_LEVELS.barbarian) },

  { id: 'cape:none', slot: 'cape', name: 'No Cape', unlock: starter },
  { id: 'cape:mage', slot: 'cape', name: 'Mage Cape', unlock: starter },
  { id: 'cape:knight', slot: 'cape', name: 'Knight Cape', unlock: level(CHARACTER_SET_LEVELS.knight) },
  { id: 'cape:barbarian', slot: 'cape', name: 'Barbarian Cape', unlock: level(CHARACTER_SET_LEVELS.barbarian) },
  { id: 'cape:rogue', slot: 'cape', name: 'Rogue Cape', unlock: level(CHARACTER_SET_LEVELS.hoodedRogue) },

  { id: 'main:none', slot: 'mainHand', name: 'Empty Hand', unlock: starter },
  { id: 'main:wand', slot: 'mainHand', name: 'Wand', unlock: starter },
  { id: 'main:mug', slot: 'mainHand', name: 'Tavern Mug', unlock: starter },
  { id: 'main:staff', slot: 'mainHand', name: 'Staff', unlock: level(8), twoHanded: true },

  { id: 'off:none', slot: 'offHand', name: 'Empty Hand', unlock: starter },
  { id: 'off:spellbook', slot: 'offHand', name: 'Spellbook', unlock: starter },
  { id: 'off:round-shield', slot: 'offHand', name: 'Round Shield', unlock: level(8) },
  { id: 'off:barbarian-shield', slot: 'offHand', name: 'Barbarian Shield', unlock: level(CHARACTER_SET_LEVELS.barbarian) },
  { id: 'off:spellbook-open', slot: 'offHand', name: 'Open Spellbook', unlock: level(20) },
  { id: 'off:square-shield', slot: 'offHand', name: 'Tower Shield', unlock: level(25) },
  { id: 'off:badge-shield', slot: 'offHand', name: "Champion's Shield", unlock: achievement('wins-10') },
  { id: 'off:spike-shield', slot: 'offHand', name: 'Spiked Shield', unlock: achievement('full-table-win') },

  { id: 'palette:classic', slot: 'palette', name: 'Classic', unlock: starter },
  { id: 'palette:forest', slot: 'palette', name: 'Forest', unlock: starter },
  { id: 'palette:shadow', slot: 'palette', name: 'Shadow', unlock: starter },
  { id: 'palette:ember', slot: 'palette', name: 'Ember', unlock: level(3) },
  { id: 'palette:frost', slot: 'palette', name: 'Frost', unlock: level(8) },
  { id: 'palette:gold', slot: 'palette', name: 'Gold', unlock: level(20) },
  { id: 'palette:arcane', slot: 'palette', name: 'Arcane', unlock: level(30) },
  { id: 'palette:oracle', slot: 'palette', name: 'Oracle', unlock: achievement('bids-1000') },
  { id: 'palette:royal', slot: 'palette', name: 'Royal', unlock: achievement('tournament-title') },

  { id: 'familiar:none', slot: 'familiar', name: 'No Familiar', unlock: starter },
  { id: 'familiar:owl', slot: 'familiar', name: 'Owl', unlock: starter },
  { id: 'familiar:cat', slot: 'familiar', name: 'Cat', unlock: level(12) },
  { id: 'familiar:raven', slot: 'familiar', name: 'Raven', unlock: achievement('days-7') },
  { id: 'familiar:toad', slot: 'familiar', name: 'Toad', unlock: achievement('humble') },
];

const PARTS_BY_ID = new Map(CHARACTER_PARTS.map((part) => [part.id, part]));

export function findCharacterPart(id: string): CharacterPart | undefined {
  return PARTS_BY_ID.get(id);
}
