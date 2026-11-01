/**
 * Expansions
 *
 * Special cards based on the Wizard anniversary editions and the rule engines
 * that make every card type (classic or special) behave correctly.
 */

export {
  TrickRank,
  TrickEffectKind,
  CardForm,
  DeclarationKind,
  hasEffect,
  type CardBehavior,
  type ICardDeclaration,
} from './card-behavior';

export {
  TrumpRevealOutcome,
  JUGGLER_VALUE,
  CLOUD_VALUE,
  CARD_DEFINITIONS,
  getCardDefinition,
  type ICardDefinition,
} from './card-definitions';

export {
  EMPTY_ROUND_CONTEXT,
  getEffectiveDefinition,
  resolveCardBehavior,
  getRequiredDeclaration,
  getDeclarationOptions,
  normalizeDeclaration,
  getLeadSuit,
  getTrickLead,
  canFollowSuit,
  legalPlays,
  type ICardRoundContext,
  type IPlayedCardLike,
} from './card-rules';

export {
  TrickLeadKind,
  PENDING_LEAD,
  FREE_LEAD,
  suitLead,
  advanceLead,
  leadOf,
  leadSuitOf,
  type TrickLead,
} from './trick-lead';

export {
  getRoundCount,
  getCardsForRound,
  getRoundPlan,
  isBidInRange,
  computeForbiddenBid,
  scoreRound,
} from './round-rules';

export {
  resolveTrick,
  wouldTakeLead,
  behaviorBeats,
  type IResolvedPlay,
  type TrickResolution,
} from './trick-resolver';

export {
  TrumpChoiceReason,
  revealTrump,
  type ITrumpChoice,
  type IWerewolfSwap,
  type TrumpRevealResult,
  type TrumpRevealInput,
} from './trump-reveal';

export {
  deriveTrickEffects,
  getAwaitingPlayerIds,
  getForcedResponse,
  validateEffectResponse,
  applyEffectResponse,
  parseEffectResponse,
  isSwappableTrickCard,
  type PendingTrickEffect,
  type IPassLeftEffect,
  type IAdjustBidEffect,
  type ISwapWithTrickEffect,
  type InteractiveEffectKind,
  type TrickEffectResponse,
  type TrickEffectOutcome,
  type BidAdjustment,
  type ITrickEffectPort,
  type ApplyResult,
} from './trick-effects';

export {
  CLASSIC_DECK_SIZE,
  SUIT_CARD_MIN_VALUE,
  SUIT_CARD_MAX_VALUE,
  specialCardId,
  buildClassicDeckCards,
  buildDeckCards,
  countInDeck,
} from './deck-composition';

export {
  ExpansionSetId,
  EXPANSION_SETS,
  getExpansionSet,
  findMatchingExpansionSet,
  type IExpansionSet,
} from './expansion-sets';

export {
  CARD_CATALOG,
  getCardCatalogEntry,
  type ICardCatalogEntry,
} from './card-catalog';
