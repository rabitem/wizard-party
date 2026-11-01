/**
 * Ruleset Validation
 *
 * Type-safe validation for ruleset configuration without external dependencies.
 * Provides runtime validation with helpful error messages.
 */

import {
  type IRulesetConfig,
  type ICardRules,
  type IBiddingRules,
  type IScoringRules,
  type IGameStructureRules,
  type ITurnRules,
  DEFAULT_CARD_RULES,
  DEFAULT_BIDDING_RULES,
  DEFAULT_SCORING_RULES,
  DEFAULT_STRUCTURE_RULES,
  DEFAULT_TURN_RULES,
  DEFAULT_RULESET_CONFIG,
  TURN_TIMER_LIMITS,
  TIMEOUT_SOUND_VOLUME_LIMITS,
  RULESET_LIMITS,
  getDefaultBiddingTimerSeconds,
} from './ruleset-config';
import {
  DEFAULT_EXPANSION_RULES,
  areSpecialCardSelectionsEqual,
  ensureExpansionRules,
  type IExpansionRules,
} from './expansion-rules';
import { isSpecialCardType } from './card-types';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// ============================================================================
// Primitive Validators
// ============================================================================

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return isNumber(value) && value >= min && value <= max;
}

function isNullableNumber(value: unknown, min: number, max: number): value is number | null {
  return value === null || isNumberInRange(value, min, max);
}

type RuleLimits = { readonly MIN: number; readonly MAX: number };

/** Whole number inside one of the RULESET_LIMITS ranges. */
function isIntegerInLimits(value: unknown, limits: RuleLimits): value is number {
  return isNumberInRange(value, limits.MIN, limits.MAX) && Number.isInteger(value);
}

function isNullableIntegerInLimits(value: unknown, limits: RuleLimits): value is number | null {
  return value === null || isIntegerInLimits(value, limits);
}

function describeLimits(limits: RuleLimits): string {
  return `a whole number between ${limits.MIN} and ${limits.MAX}`;
}

// ============================================================================
// Category Validators
// ============================================================================

function validateCardRules(rules: unknown, prefix = 'card'): ValidationResult<ICardRules> {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const r = rules as Record<string, unknown>;

  if (!isBoolean(r.lastWizardWins)) {
    errors.push(`${prefix}.lastWizardWins: must be a boolean`);
  }
  if (!isBoolean(r.lastJesterWins)) {
    errors.push(`${prefix}.lastJesterWins: must be a boolean`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      lastWizardWins: r.lastWizardWins as boolean,
      lastJesterWins: r.lastJesterWins as boolean,
    },
  };
}

function validateBiddingRules(rules: unknown, prefix = 'bidding'): ValidationResult<IBiddingRules> {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const r = rules as Record<string, unknown>;

  if (!isBoolean(r.hiddenBids)) {
    errors.push(`${prefix}.hiddenBids: must be a boolean`);
  }
  if (!isBoolean(r.allowEqualBids)) {
    errors.push(`${prefix}.allowEqualBids: must be a boolean`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      hiddenBids: r.hiddenBids as boolean,
      allowEqualBids: r.allowEqualBids as boolean,
    },
  };
}

function validateScoringRules(rules: unknown, prefix = 'scoring'): ValidationResult<IScoringRules> {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const r = rules as Record<string, unknown>;

  if (!isIntegerInLimits(r.baseBidPoints, RULESET_LIMITS.BASE_BID_POINTS)) {
    errors.push(`${prefix}.baseBidPoints: must be ${describeLimits(RULESET_LIMITS.BASE_BID_POINTS)}`);
  }
  if (!isIntegerInLimits(r.pointsPerTrick, RULESET_LIMITS.POINTS_PER_TRICK)) {
    errors.push(`${prefix}.pointsPerTrick: must be ${describeLimits(RULESET_LIMITS.POINTS_PER_TRICK)}`);
  }
  if (!isIntegerInLimits(r.penaltyPerMiss, RULESET_LIMITS.PENALTY_PER_MISS)) {
    errors.push(`${prefix}.penaltyPerMiss: must be ${describeLimits(RULESET_LIMITS.PENALTY_PER_MISS)}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      baseBidPoints: r.baseBidPoints as number,
      pointsPerTrick: r.pointsPerTrick as number,
      penaltyPerMiss: r.penaltyPerMiss as number,
    },
  };
}

function validateStructureRules(rules: unknown, prefix = 'structure'): ValidationResult<IGameStructureRules> {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const r = rules as Record<string, unknown>;

  if (!isNullableIntegerInLimits(r.customRoundCount, RULESET_LIMITS.CUSTOM_ROUND_COUNT)) {
    errors.push(`${prefix}.customRoundCount: must be null or ${describeLimits(RULESET_LIMITS.CUSTOM_ROUND_COUNT)}`);
  }
  if (!isBoolean(r.descendingRounds)) {
    errors.push(`${prefix}.descendingRounds: must be a boolean`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      customRoundCount: r.customRoundCount as number | null,
      descendingRounds: r.descendingRounds as boolean,
    },
  };
}

function validateTurnRules(rules: unknown, prefix = 'turn'): ValidationResult<ITurnRules> {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const r = rules as Record<string, unknown>;

  if (!isNullableNumber(r.biddingTimerSeconds, TURN_TIMER_LIMITS.MIN_SECONDS, TURN_TIMER_LIMITS.MAX_SECONDS)) {
    errors.push(
      `${prefix}.biddingTimerSeconds: must be null or a number between ${TURN_TIMER_LIMITS.MIN_SECONDS} and ${TURN_TIMER_LIMITS.MAX_SECONDS}`
    );
  }
  if (!isNullableNumber(r.playTimerSeconds, TURN_TIMER_LIMITS.MIN_SECONDS, TURN_TIMER_LIMITS.MAX_SECONDS)) {
    errors.push(
      `${prefix}.playTimerSeconds: must be null or a number between ${TURN_TIMER_LIMITS.MIN_SECONDS} and ${TURN_TIMER_LIMITS.MAX_SECONDS}`
    );
  }
  if (!isNumberInRange(r.timeoutSoundVolume, TIMEOUT_SOUND_VOLUME_LIMITS.MIN, TIMEOUT_SOUND_VOLUME_LIMITS.MAX)) {
    errors.push(
      `${prefix}.timeoutSoundVolume: must be a number between ${TIMEOUT_SOUND_VOLUME_LIMITS.MIN} and ${TIMEOUT_SOUND_VOLUME_LIMITS.MAX}`
    );
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      biddingTimerSeconds: r.biddingTimerSeconds as number | null,
      playTimerSeconds: r.playTimerSeconds as number | null,
      timeoutSoundVolume: r.timeoutSoundVolume as number,
    },
  };
}

function validateExpansionRules(rules: unknown, prefix = 'expansions'): ValidationResult<IExpansionRules> {
  // Older clients and stored rooms predate expansions: absent means the classic deck.
  if (rules === undefined) {
    return { success: true, data: ensureExpansionRules(DEFAULT_EXPANSION_RULES) };
  }
  if (typeof rules !== 'object' || rules === null) {
    return { success: false, errors: [`${prefix}: must be an object`] };
  }

  const specialCards = (rules as Record<string, unknown>).specialCards;
  if (!Array.isArray(specialCards) || !specialCards.every(isSpecialCardType)) {
    return { success: false, errors: [`${prefix}.specialCards: must be an array of special card types`] };
  }

  return { success: true, data: ensureExpansionRules(rules) };
}

// ============================================================================
// Full Config Validation
// ============================================================================

/**
 * Validate a complete ruleset configuration
 * Returns validation result with either validated data or error messages
 */
export function validateRulesetConfig(config: unknown): ValidationResult<IRulesetConfig> {
  if (typeof config !== 'object' || config === null) {
    return { success: false, errors: ['Ruleset config must be an object'] };
  }

  const c = config as Record<string, unknown>;
  const errors: string[] = [];

  // Validate each category
  const cardResult = validateCardRules(c.card);
  const biddingResult = validateBiddingRules(c.bidding);
  const scoringResult = validateScoringRules(c.scoring);
  const structureResult = validateStructureRules(c.structure);
  const turnResult = validateTurnRules(c.turn);
  const expansionsResult = validateExpansionRules(c.expansions);

  if (!cardResult.success) errors.push(...cardResult.errors);
  if (!biddingResult.success) errors.push(...biddingResult.errors);
  if (!scoringResult.success) errors.push(...scoringResult.errors);
  if (!structureResult.success) errors.push(...structureResult.errors);
  if (!turnResult.success) errors.push(...turnResult.errors);
  if (!expansionsResult.success) errors.push(...expansionsResult.errors);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // At this point, all results are successful, so we can safely access .data
  // TypeScript needs explicit type narrowing here
  return {
    success: true,
    data: {
      card: (cardResult as ValidationSuccess<ICardRules>).data,
      bidding: (biddingResult as ValidationSuccess<IBiddingRules>).data,
      scoring: (scoringResult as ValidationSuccess<IScoringRules>).data,
      structure: (structureResult as ValidationSuccess<IGameStructureRules>).data,
      turn: (turnResult as ValidationSuccess<ITurnRules>).data,
      expansions: (expansionsResult as ValidationSuccess<IExpansionRules>).data,
    },
  };
}

/**
 * Parse and validate config, applying defaults for missing fields
 * Always returns a valid IRulesetConfig (uses defaults for invalid/missing values)
 */
export function parseRulesetConfigSafe(config: unknown): IRulesetConfig {
  if (typeof config !== 'object' || config === null) {
    return DEFAULT_RULESET_CONFIG;
  }

  const c = config as Record<string, unknown>;

  return {
    card: parseCardRulesSafe(c.card),
    bidding: parseBiddingRulesSafe(c.bidding),
    scoring: parseScoringRulesSafe(c.scoring),
    structure: parseStructureRulesSafe(c.structure),
    turn: parseTurnRulesSafe(c.turn),
    expansions: ensureExpansionRules(c.expansions),
  };
}

function parseCardRulesSafe(rules: unknown): ICardRules {
  if (typeof rules !== 'object' || rules === null) {
    return DEFAULT_CARD_RULES;
  }

  const r = rules as Record<string, unknown>;

  return {
    lastWizardWins: isBoolean(r.lastWizardWins) ? r.lastWizardWins : DEFAULT_CARD_RULES.lastWizardWins,
    lastJesterWins: isBoolean(r.lastJesterWins) ? r.lastJesterWins : DEFAULT_CARD_RULES.lastJesterWins,
  };
}

function parseBiddingRulesSafe(rules: unknown): IBiddingRules {
  if (typeof rules !== 'object' || rules === null) {
    return DEFAULT_BIDDING_RULES;
  }

  const r = rules as Record<string, unknown>;

  return {
    hiddenBids: isBoolean(r.hiddenBids) ? r.hiddenBids : DEFAULT_BIDDING_RULES.hiddenBids,
    allowEqualBids: isBoolean(r.allowEqualBids) ? r.allowEqualBids : DEFAULT_BIDDING_RULES.allowEqualBids,
  };
}

function parseScoringRulesSafe(rules: unknown): IScoringRules {
  if (typeof rules !== 'object' || rules === null) {
    return DEFAULT_SCORING_RULES;
  }

  const r = rules as Record<string, unknown>;

  return {
    baseBidPoints: isIntegerInLimits(r.baseBidPoints, RULESET_LIMITS.BASE_BID_POINTS)
      ? r.baseBidPoints
      : DEFAULT_SCORING_RULES.baseBidPoints,
    pointsPerTrick: isIntegerInLimits(r.pointsPerTrick, RULESET_LIMITS.POINTS_PER_TRICK)
      ? r.pointsPerTrick
      : DEFAULT_SCORING_RULES.pointsPerTrick,
    penaltyPerMiss: isIntegerInLimits(r.penaltyPerMiss, RULESET_LIMITS.PENALTY_PER_MISS)
      ? r.penaltyPerMiss
      : DEFAULT_SCORING_RULES.penaltyPerMiss,
  };
}

function parseStructureRulesSafe(rules: unknown): IGameStructureRules {
  if (typeof rules !== 'object' || rules === null) {
    return DEFAULT_STRUCTURE_RULES;
  }

  const r = rules as Record<string, unknown>;

  return {
    customRoundCount: isNullableIntegerInLimits(r.customRoundCount, RULESET_LIMITS.CUSTOM_ROUND_COUNT)
      ? r.customRoundCount
      : DEFAULT_STRUCTURE_RULES.customRoundCount,
    descendingRounds: isBoolean(r.descendingRounds)
      ? r.descendingRounds
      : DEFAULT_STRUCTURE_RULES.descendingRounds,
  };
}

function parseTurnRulesSafe(rules: unknown): ITurnRules {
  if (typeof rules !== 'object' || rules === null) {
    return DEFAULT_TURN_RULES;
  }

  const r = rules as Record<string, unknown>;
  const playTimerSeconds = isNullableNumber(
    r.playTimerSeconds,
    TURN_TIMER_LIMITS.MIN_SECONDS,
    TURN_TIMER_LIMITS.MAX_SECONDS
  )
    ? r.playTimerSeconds
    : DEFAULT_TURN_RULES.playTimerSeconds;
  const biddingFallback = typeof playTimerSeconds === 'number'
    ? getDefaultBiddingTimerSeconds(playTimerSeconds)
    : DEFAULT_TURN_RULES.biddingTimerSeconds;

  return {
    biddingTimerSeconds: isNullableNumber(
      r.biddingTimerSeconds,
      TURN_TIMER_LIMITS.MIN_SECONDS,
      TURN_TIMER_LIMITS.MAX_SECONDS
    )
      ? r.biddingTimerSeconds
      : biddingFallback,
    playTimerSeconds,
    timeoutSoundVolume: isNumberInRange(
      r.timeoutSoundVolume,
      TIMEOUT_SOUND_VOLUME_LIMITS.MIN,
      TIMEOUT_SOUND_VOLUME_LIMITS.MAX
    )
      ? r.timeoutSoundVolume
      : DEFAULT_TURN_RULES.timeoutSoundVolume,
  };
}

/**
 * Count how many rules differ from defaults
 */
export function countNonDefaultRules(config: unknown): number {
  const normalizedConfig = parseRulesetConfigSafe(config);
  let count = 0;

  if (normalizedConfig.card.lastWizardWins !== DEFAULT_CARD_RULES.lastWizardWins) count++;
  if (normalizedConfig.card.lastJesterWins !== DEFAULT_CARD_RULES.lastJesterWins) count++;
  if (normalizedConfig.bidding.hiddenBids !== DEFAULT_BIDDING_RULES.hiddenBids) count++;
  if (normalizedConfig.bidding.allowEqualBids !== DEFAULT_BIDDING_RULES.allowEqualBids) count++;
  if (normalizedConfig.scoring.baseBidPoints !== DEFAULT_SCORING_RULES.baseBidPoints) count++;
  if (normalizedConfig.scoring.pointsPerTrick !== DEFAULT_SCORING_RULES.pointsPerTrick) count++;
  if (normalizedConfig.scoring.penaltyPerMiss !== DEFAULT_SCORING_RULES.penaltyPerMiss) count++;
  if (normalizedConfig.structure.customRoundCount !== DEFAULT_STRUCTURE_RULES.customRoundCount) count++;
  if (normalizedConfig.structure.descendingRounds !== DEFAULT_STRUCTURE_RULES.descendingRounds) count++;
  if (normalizedConfig.turn.biddingTimerSeconds !== DEFAULT_TURN_RULES.biddingTimerSeconds) count++;
  if (normalizedConfig.turn.playTimerSeconds !== DEFAULT_TURN_RULES.playTimerSeconds) count++;
  if (
    (normalizedConfig.turn.biddingTimerSeconds !== null || normalizedConfig.turn.playTimerSeconds !== null) &&
    normalizedConfig.turn.timeoutSoundVolume !== DEFAULT_TURN_RULES.timeoutSoundVolume
  ) count++;
  if (
    !areSpecialCardSelectionsEqual(
      normalizedConfig.expansions.specialCards,
      DEFAULT_EXPANSION_RULES.specialCards
    )
  ) count++;

  return count;
}
