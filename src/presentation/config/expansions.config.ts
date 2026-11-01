/**
 * Lobby copy and limits for the expansion (special card) editor and summaries.
 * Card names and rules come from the domain card catalog, never from here.
 */
export const EXPANSIONS_UI_CONFIG = {
  SECTION_TITLE: 'Special Cards',
  SECTION_SUBTITLE: 'Based on the AMIGO anniversary editions',
  PRESETS_HEADING: 'Editions',
  CARDS_HEADING: 'Cards in the deck',
  /** Follows the total deck size, e.g. "69 cards". */
  DECK_SIZE_UNIT: 'cards',
  /** Shown instead of an edition name when the selection matches no preset. */
  CUSTOM_SET_LABEL: 'Custom',
  /** Appended to an edition name in compact badges, e.g. "30th Anniversary deck". */
  DECK_LABEL_SUFFIX: 'deck',
  /** Shown for the edition without a release year (the base game). */
  ORIGINAL_EDITION_LABEL: 'Base game',
  PAIRED_WITH_LABEL: 'Always together with',
  AS_TRUMP_CARD_LABEL: 'As trump card',
  RULES_TOGGLE_LABEL: 'Rules',
  ROUND_COUNT_NOTE: 'Round count still follows the classic 60-card deck.',

  // Expansion guide (tutorial picker, home-page carousel, explainer)
  GUIDE_HEADING: 'Special card editions',
  GUIDE_PICKER_INTRO: 'Curious about the anniversary editions? Pick one to read its cards:',
  GUIDE_OPEN_LABEL: 'Read the cards',
  GUIDE_BACK_LABEL: 'All editions',
  GUIDE_CLOSE_LABEL: 'Close',
  GUIDE_SPECIAL_CARDS_UNIT: 'special cards',
  CAROUSEL_PREVIOUS_LABEL: 'Previous edition',
  CAROUSEL_NEXT_LABEL: 'Next edition',
  CAROUSEL_SLIDE_LABEL: 'Show edition',
  /** Horizontal travel before a pointer drag counts as a swipe. */
  CAROUSEL_SWIPE_THRESHOLD_PX: 40,
} as const;
