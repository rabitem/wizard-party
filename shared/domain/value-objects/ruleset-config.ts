/**
 * Ruleset Configuration
 *
 * Extensible game rules organized by category.
 * Each category groups related rules for maintainability and UI organization.
 *
 * To add a new rule:
 * 1. Add property to appropriate category interface
 * 2. Add default value to DEFAULT_*_RULES and DEFAULT_RULESET_CONFIG
 * 3. Add metadata entry to RULE_METADATA (ruleset-metadata.ts)
 *
 * Expansion special cards are configured in the `expansions` category
 * (see expansion-rules.ts); their behaviour lives in shared/domain/expansions.
 */

import { DEFAULT_EXPANSION_RULES, ensureExpansionRules, type IExpansionRules } from './expansion-rules';

// ============================================================================
// Card Rules - Affect trick resolution
// ============================================================================

/**
 * Rules affecting card/trick resolution
 */
export interface ICardRules {
  /**
   * When true, the last wizard played wins the trick (instead of first wizard)
   * Default: false (first wizard wins, as per standard rules)
   */
  lastWizardWins: boolean;

  /**
   * When true, if all cards in a trick are Jesters, the last one wins
   * Default: false (first Jester wins)
   */
  lastJesterWins: boolean;
}

export const DEFAULT_CARD_RULES: ICardRules = {
  lastWizardWins: false,
  lastJesterWins: false,
};

// ============================================================================
// Bidding Rules - Affect the bidding phase
// ============================================================================

/**
 * Rules affecting the bidding phase
 */
export interface IBiddingRules {
  /**
   * When true, bids are hidden from other players until all have bid
   * Default: false (visible bids)
   */
  hiddenBids: boolean;

  /**
   * When true, the last bidder CAN bid to make total equal tricks
   * Default: false (standard German Wizard rules - last bidder restricted)
   */
  allowEqualBids: boolean;
}

export const DEFAULT_BIDDING_RULES: IBiddingRules = {
  hiddenBids: false,
  allowEqualBids: false,
};

// ============================================================================
// Scoring Rules - Affect point calculations
// ============================================================================

/**
 * Rules affecting scoring calculations
 */
export interface IScoringRules {
  /**
   * Points for making your exact bid
   * Default: 20
   */
  baseBidPoints: number;

  /**
   * Points per trick won when bid is correct
   * Default: 10
   */
  pointsPerTrick: number;

  /**
   * Points lost per trick off from bid (as positive number, applied as negative)
   * Default: 10
   */
  penaltyPerMiss: number;
}

export const DEFAULT_SCORING_RULES: IScoringRules = {
  baseBidPoints: 20,
  pointsPerTrick: 10,
  penaltyPerMiss: 10,
};

// ============================================================================
// Game Structure Rules - Affect round/game structure
// ============================================================================

/**
 * Rules affecting game structure
 */
export interface IGameStructureRules {
  /**
   * Override the number of rounds (null = automatic based on player count)
   * Default: null (60 / playerCount)
   */
  customRoundCount: number | null;

  /**
   * When true, play rounds in descending order (max cards first, then decreasing)
   * Default: false (ascending order: 1 card, 2 cards, ...)
   */
  descendingRounds: boolean;
}

export const DEFAULT_STRUCTURE_RULES: IGameStructureRules = {
  customRoundCount: null,
  descendingRounds: false,
};

// ============================================================================
// Turn Rules - Affect active player timing
// ============================================================================

/**
 * Rules affecting each player's active turn.
 */
export interface ITurnRules {
  /**
   * Number of seconds before the bidding or trump-selection player can be heckled.
   * Null disables the timer for those phases.
   */
  biddingTimerSeconds: number | null;

  /**
   * Number of seconds before the playing player can be heckled.
   * Null disables the timer while cards are being played.
   */
  playTimerSeconds: number | null;

  /**
   * Volume used for turn-timeout soundboard sounds.
   * Stored as 0.0-1.0 and defaults to full volume.
   */
  timeoutSoundVolume: number;
}

export const DEFAULT_TURN_RULES: ITurnRules = {
  biddingTimerSeconds: null,
  playTimerSeconds: null,
  timeoutSoundVolume: 1,
};

export const TURN_TIMER_LIMITS = {
  MIN_SECONDS: 5,
  MAX_SECONDS: 180,
} as const;

export const TIMEOUT_SOUND_VOLUME_LIMITS = {
  MIN: 0,
  MAX: 1,
  STEP: 0.05,
} as const;

export const BIDDING_TIMER_DEFAULT_MULTIPLIER = 1.5;

/**
 * Allowed ranges of the numeric rules: the normalizer, the validator and the UI
 * metadata all read these, so they can never disagree. All of them are whole numbers.
 */
export const RULESET_LIMITS = {
  BASE_BID_POINTS: { MIN: 0, MAX: 100 },
  POINTS_PER_TRICK: { MIN: 0, MAX: 50 },
  PENALTY_PER_MISS: { MIN: 0, MAX: 50 },
  CUSTOM_ROUND_COUNT: { MIN: 1, MAX: 20 },
} as const;

// ============================================================================
// Complete Ruleset Configuration
// ============================================================================

/**
 * Complete ruleset configuration with all rule categories
 */
export interface IRulesetConfig {
  card: ICardRules;
  bidding: IBiddingRules;
  scoring: IScoringRules;
  structure: IGameStructureRules;
  turn: ITurnRules;
  expansions: IExpansionRules;
}

/**
 * Default ruleset configuration (standard Wizard rules)
 */
export const DEFAULT_RULESET_CONFIG: IRulesetConfig = {
  card: DEFAULT_CARD_RULES,
  bidding: DEFAULT_BIDDING_RULES,
  scoring: DEFAULT_SCORING_RULES,
  structure: DEFAULT_STRUCTURE_RULES,
  turn: DEFAULT_TURN_RULES,
  expansions: DEFAULT_EXPANSION_RULES,
};

/**
 * The defaults are shared by every room: freeze them (and everything they hold)
 * so no game can change another game's rules through a shared reference. Games
 * work on their own copy (ensureRulesetConfig always returns a new object).
 */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
deepFreeze(DEFAULT_RULESET_CONFIG);

// ============================================================================
// Config Validation & Defaults
// ============================================================================

/**
 * Type guard for ruleset config format
 */
function isRulesetConfig(config: unknown): config is Partial<IRulesetConfig> {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('card' in config ||
      'bidding' in config ||
      'scoring' in config ||
      'structure' in config ||
      'turn' in config ||
      'expansions' in config)
  );
}

function getObjectProperty(source: unknown, key: string): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return (source as Record<string, unknown>)[key];
}

function booleanRule(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberRule(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

/** Whole-number rule: finite numbers are truncated, then range-checked. */
function integerRule(value: unknown, limits: { MIN: number; MAX: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return numberRule(Math.trunc(value), limits.MIN, limits.MAX, fallback);
}

function nullableIntegerRule(
  value: unknown,
  limits: { MIN: number; MAX: number },
  fallback: number | null
): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return nullableNumberRule(Math.trunc(value), limits.MIN, limits.MAX, fallback);
}

function nullableNumberRule(
  value: unknown,
  min: number,
  max: number,
  fallback: number | null
): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function roundTimerSeconds(value: number): number {
  return Math.trunc(value);
}

export function getDefaultBiddingTimerSeconds(playTimerSeconds: number): number {
  const rawSeconds = Math.ceil(playTimerSeconds * BIDDING_TIMER_DEFAULT_MULTIPLIER);
  return Math.max(
    TURN_TIMER_LIMITS.MIN_SECONDS,
    Math.min(TURN_TIMER_LIMITS.MAX_SECONDS, rawSeconds)
  );
}

function nullableTimerSecondsRule(value: unknown, fallback: number | null): number | null {
  const normalized = nullableNumberRule(
    value,
    TURN_TIMER_LIMITS.MIN_SECONDS,
    TURN_TIMER_LIMITS.MAX_SECONDS,
    fallback
  );
  return normalized === null ? null : roundTimerSeconds(normalized);
}

function hasObjectProperty(source: unknown, key: string): boolean {
  return typeof source === 'object' && source !== null && Object.prototype.hasOwnProperty.call(source, key);
}

function turnTimerRules(turn: unknown): ITurnRules {
  const playTimerSeconds = nullableTimerSecondsRule(
    getObjectProperty(turn, 'playTimerSeconds'),
    DEFAULT_TURN_RULES.playTimerSeconds
  );
  const hasBiddingTimer = hasObjectProperty(turn, 'biddingTimerSeconds');
  const biddingTimerFallback = typeof playTimerSeconds === 'number'
    ? getDefaultBiddingTimerSeconds(playTimerSeconds)
    : DEFAULT_TURN_RULES.biddingTimerSeconds;

  return {
    biddingTimerSeconds: nullableTimerSecondsRule(
      hasBiddingTimer ? getObjectProperty(turn, 'biddingTimerSeconds') : undefined,
      biddingTimerFallback
    ),
    playTimerSeconds,
    timeoutSoundVolume: numberRule(
      getObjectProperty(turn, 'timeoutSoundVolume'),
      TIMEOUT_SOUND_VOLUME_LIMITS.MIN,
      TIMEOUT_SOUND_VOLUME_LIMITS.MAX,
      DEFAULT_TURN_RULES.timeoutSoundVolume
    ),
  };
}

/**
 * Ensure config is a valid IRulesetConfig, filling missing values with defaults
 */
export function ensureRulesetConfig(config: unknown): IRulesetConfig {
  if (!isRulesetConfig(config)) {
    return {
      card: { ...DEFAULT_CARD_RULES },
      bidding: { ...DEFAULT_BIDDING_RULES },
      scoring: { ...DEFAULT_SCORING_RULES },
      structure: { ...DEFAULT_STRUCTURE_RULES },
      turn: { ...DEFAULT_TURN_RULES },
      expansions: ensureExpansionRules(DEFAULT_EXPANSION_RULES),
    };
  }

  const card = getObjectProperty(config, 'card');
  const bidding = getObjectProperty(config, 'bidding');
  const scoring = getObjectProperty(config, 'scoring');
  const structure = getObjectProperty(config, 'structure');
  const turn = getObjectProperty(config, 'turn');

  return {
    card: {
      lastWizardWins: booleanRule(
        getObjectProperty(card, 'lastWizardWins'),
        DEFAULT_CARD_RULES.lastWizardWins
      ),
      lastJesterWins: booleanRule(
        getObjectProperty(card, 'lastJesterWins'),
        DEFAULT_CARD_RULES.lastJesterWins
      ),
    },
    bidding: {
      hiddenBids: booleanRule(
        getObjectProperty(bidding, 'hiddenBids'),
        DEFAULT_BIDDING_RULES.hiddenBids
      ),
      allowEqualBids: booleanRule(
        getObjectProperty(bidding, 'allowEqualBids'),
        DEFAULT_BIDDING_RULES.allowEqualBids
      ),
    },
    scoring: {
      baseBidPoints: integerRule(
        getObjectProperty(scoring, 'baseBidPoints'),
        RULESET_LIMITS.BASE_BID_POINTS,
        DEFAULT_SCORING_RULES.baseBidPoints
      ),
      pointsPerTrick: integerRule(
        getObjectProperty(scoring, 'pointsPerTrick'),
        RULESET_LIMITS.POINTS_PER_TRICK,
        DEFAULT_SCORING_RULES.pointsPerTrick
      ),
      penaltyPerMiss: integerRule(
        getObjectProperty(scoring, 'penaltyPerMiss'),
        RULESET_LIMITS.PENALTY_PER_MISS,
        DEFAULT_SCORING_RULES.penaltyPerMiss
      ),
    },
    structure: {
      customRoundCount: nullableIntegerRule(
        getObjectProperty(structure, 'customRoundCount'),
        RULESET_LIMITS.CUSTOM_ROUND_COUNT,
        DEFAULT_STRUCTURE_RULES.customRoundCount
      ),
      descendingRounds: booleanRule(
        getObjectProperty(structure, 'descendingRounds'),
        DEFAULT_STRUCTURE_RULES.descendingRounds
      ),
    },
    turn: turnTimerRules(turn),
    expansions: ensureExpansionRules(getObjectProperty(config, 'expansions')),
  };
}
