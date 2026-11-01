export {
  Suit,
  CardType,
  SUIT_NAMES,
  ALL_SUITS,
  SPECIAL_CARD_TYPES,
  isSpecialCardType,
  type SpecialCardType,
} from './card-types';

// Game phase state machine
export { GamePhase, canTransitionPhase } from './game-phase';

// Game pause (orthogonal to the phase)
export {
  isGamePaused,
  getDisplayPhase,
  getPauseDeadline,
  toOrthogonalPause,
  toLegacyPause,
  type PauseLike,
  type PausableState,
} from './game-pause';

// Bot difficulty
export {
  BOT_DIFFICULTY_LEVELS,
  MIN_BOT_DIFFICULTY_LEVEL,
  MAX_BOT_DIFFICULTY_LEVEL,
  DEFAULT_BOT_DIFFICULTY_LEVEL,
  isBotDifficultyLevel,
  parseBotDifficulty,
  type BotDifficultyLevel,
} from './bot-difficulty';

// Expansion Rules
export {
  type IExpansionRules,
  DEFAULT_EXPANSION_RULES,
  SPECIAL_CARD_PAIRS,
  getPairedSpecialCard,
  normalizeSpecialCards,
  ensureExpansionRules,
  toggleSpecialCard,
  areSpecialCardSelectionsEqual,
} from './expansion-rules';

// Ruleset Configuration
export {
  type ICardRules,
  type IBiddingRules,
  type IScoringRules,
  type IGameStructureRules,
  type ITurnRules,
  type IRulesetConfig,
  DEFAULT_CARD_RULES,
  DEFAULT_BIDDING_RULES,
  DEFAULT_SCORING_RULES,
  DEFAULT_STRUCTURE_RULES,
  DEFAULT_TURN_RULES,
  TURN_TIMER_LIMITS,
  TIMEOUT_SOUND_VOLUME_LIMITS,
  RULESET_LIMITS,
  BIDDING_TIMER_DEFAULT_MULTIPLIER,
  DEFAULT_RULESET_CONFIG,
  getDefaultBiddingTimerSeconds,
  ensureRulesetConfig,
} from './ruleset-config';

// Ruleset metadata for the settings UI
export {
  type IRuleMetadata,
  type IRuleCategoryMeta,
  RULE_METADATA,
  RULE_CATEGORIES,
  getRulesByCategory,
  setRuleValue,
} from './ruleset-metadata';

// Ruleset Validation
export {
  type ValidationResult,
  type ValidationSuccess,
  type ValidationError,
  validateRulesetConfig,
  parseRulesetConfigSafe,
  countNonDefaultRules,
} from './ruleset-validation';
