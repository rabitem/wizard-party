/**
 * Expansion special card faces.
 *
 * Adding a new special card's face:
 * 1. Add its colours to SPECIAL_CARD_PALETTES (special-card-palettes.ts).
 * 2. Add an emblem painter to SPECIAL_CARD_EMBLEMS (special-card-emblems.ts).
 * Both records are keyed by SpecialCardType, so a missing entry fails to compile.
 * Title, corner index and value come from the card catalog; every art style
 * composes its own frame around the emblem, so all decks pick the card up.
 */

export { drawClassicSpecialCard } from './classic-special-card';
export { drawSpecialCardEmblem } from './special-card-emblems';
export {
  getSpecialCardFace,
  layoutSpecialFace,
  splitValueLabel,
  type SpecialCardFace,
} from './special-card-face';
export { mapEmblemPalette } from './special-card-palettes';
