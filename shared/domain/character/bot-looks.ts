import { DEFAULT_APPEARANCE, type CharacterAppearance } from './appearance';

/** Bots have no account: each difficulty has a fixed look, so players learn to recognise them. */
const BOT_LOOKS: Readonly<Record<number, CharacterAppearance>> = {
  1: { ...DEFAULT_APPEARANCE, headwear: 'headwear:none', cape: 'cape:none', palette: 'palette:forest', familiar: 'familiar:toad' },
  2: { ...DEFAULT_APPEARANCE, head: 'head:rogue', outfit: 'outfit:rogue', headwear: 'headwear:none', cape: 'cape:rogue', mainHand: 'main:mug', offHand: 'off:none', familiar: 'familiar:none' },
  3: { ...DEFAULT_APPEARANCE, head: 'head:knight', outfit: 'outfit:knight', headwear: 'headwear:knight-helmet', cape: 'cape:knight', mainHand: 'main:none', offHand: 'off:round-shield', palette: 'palette:royal', familiar: 'familiar:none' },
  4: { ...DEFAULT_APPEARANCE, head: 'head:barbarian', outfit: 'outfit:barbarian', headwear: 'headwear:barbarian-hat', cape: 'cape:barbarian', mainHand: 'main:mug', offHand: 'off:barbarian-shield', palette: 'palette:ember', familiar: 'familiar:cat' },
  5: { ...DEFAULT_APPEARANCE, mainHand: 'main:staff', offHand: 'off:none', palette: 'palette:arcane', familiar: 'familiar:raven' },
};

/** The look of a bot at `difficulty` (1 easiest to 5); the middle one when unknown. */
export function botAppearance(difficulty: number | undefined): CharacterAppearance {
  return BOT_LOOKS[difficulty ?? 3] ?? BOT_LOOKS[3];
}

export const BOT_DIFFICULTIES_WITH_LOOKS = Object.keys(BOT_LOOKS).map(Number);
