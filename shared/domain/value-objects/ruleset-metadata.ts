/**
 * Ruleset Metadata
 *
 * Describes every rule of IRulesetConfig for the settings UI (name, description,
 * input type and range). Numeric ranges come from the same limit tables the
 * normalizer and the validator use (RULESET_LIMITS, TURN_TIMER_LIMITS), so the UI
 * can never offer a value the server would reject.
 */

import {
  DEFAULT_TURN_RULES,
  RULESET_LIMITS,
  TIMEOUT_SOUND_VOLUME_LIMITS,
  TURN_TIMER_LIMITS,
  type IRulesetConfig,
} from './ruleset-config';


/**
 * Rule metadata for dynamic UI generation
 */
export interface IRuleMetadata {
  /** Property key within the category */
  key: string;
  /** Category this rule belongs to */
  category: keyof IRulesetConfig;
  /** Display name for the UI */
  name: string;
  /** Description explaining what the rule does */
  description: string;
  /** Type of input to render */
  type: 'boolean' | 'number';
  /** Default value (for reference) */
  defaultValue: boolean | number | null;
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
}

/**
 * Metadata for all available rules
 * Used by UI to generate rule configuration forms
 */
export const RULE_METADATA: IRuleMetadata[] = [
  // Card Rules
  {
    key: 'lastWizardWins',
    category: 'card',
    name: 'Last Wizard Wins',
    description: 'When multiple wizards are played, the last one wins the trick instead of the first',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'lastJesterWins',
    category: 'card',
    name: 'Last Jester Wins',
    description: 'When all cards in a trick are Jesters, the last one wins instead of the first',
    type: 'boolean',
    defaultValue: false,
  },

  // Bidding Rules
  {
    key: 'hiddenBids',
    category: 'bidding',
    name: 'Hidden Bids',
    description: 'Bids are hidden from other players until everyone has placed their bid',
    type: 'boolean',
    defaultValue: false,
  },
  {
    key: 'allowEqualBids',
    category: 'bidding',
    name: 'Allow Equal Bids',
    description: 'The last bidder can bid to make the total equal to available tricks',
    type: 'boolean',
    defaultValue: false,
  },

  // Scoring Rules
  {
    key: 'baseBidPoints',
    category: 'scoring',
    name: 'Base Bid Points',
    description: 'Points awarded for making your exact bid',
    type: 'number',
    defaultValue: 20,
    min: RULESET_LIMITS.BASE_BID_POINTS.MIN,
    max: RULESET_LIMITS.BASE_BID_POINTS.MAX,
  },
  {
    key: 'pointsPerTrick',
    category: 'scoring',
    name: 'Points Per Trick',
    description: 'Bonus points for each trick won when bid is correct',
    type: 'number',
    defaultValue: 10,
    min: RULESET_LIMITS.POINTS_PER_TRICK.MIN,
    max: RULESET_LIMITS.POINTS_PER_TRICK.MAX,
  },
  {
    key: 'penaltyPerMiss',
    category: 'scoring',
    name: 'Penalty Per Miss',
    description: 'Points deducted for each trick over or under your bid',
    type: 'number',
    defaultValue: 10,
    min: RULESET_LIMITS.PENALTY_PER_MISS.MIN,
    max: RULESET_LIMITS.PENALTY_PER_MISS.MAX,
  },

  // Structure Rules
  {
    key: 'customRoundCount',
    category: 'structure',
    name: 'Custom Round Count',
    description: 'Override the number of rounds (leave empty for automatic)',
    type: 'number',
    defaultValue: null,
    min: RULESET_LIMITS.CUSTOM_ROUND_COUNT.MIN,
    max: RULESET_LIMITS.CUSTOM_ROUND_COUNT.MAX,
  },
  {
    key: 'descendingRounds',
    category: 'structure',
    name: 'Descending Rounds',
    description: 'Start with maximum cards and decrease each round',
    type: 'boolean',
    defaultValue: false,
  },

  // Turn Rules
  {
    key: 'biddingTimerSeconds',
    category: 'turn',
    name: 'Bidding Timer',
    description: 'Seconds for bidding and trump selection. Then the soundboard unlocks, and soon after the table moves for the player',
    type: 'number',
    defaultValue: DEFAULT_TURN_RULES.biddingTimerSeconds,
    min: TURN_TIMER_LIMITS.MIN_SECONDS,
    max: TURN_TIMER_LIMITS.MAX_SECONDS,
  },
  {
    key: 'playTimerSeconds',
    category: 'turn',
    name: 'Play Timer',
    description: 'Seconds for playing a card. Then the soundboard unlocks, and soon after the table plays a legal card for the player',
    type: 'number',
    defaultValue: DEFAULT_TURN_RULES.playTimerSeconds,
    min: TURN_TIMER_LIMITS.MIN_SECONDS,
    max: TURN_TIMER_LIMITS.MAX_SECONDS,
  },
  {
    key: 'timeoutSoundVolume',
    category: 'turn',
    name: 'AFK Sound Volume',
    description: 'Volume for turn-timeout soundboard sounds',
    type: 'number',
    defaultValue: DEFAULT_TURN_RULES.timeoutSoundVolume,
    min: TIMEOUT_SOUND_VOLUME_LIMITS.MIN,
    max: TIMEOUT_SOUND_VOLUME_LIMITS.MAX,
  },
];

/**
 * Category metadata for UI organization
 */
export interface IRuleCategoryMeta {
  key: keyof IRulesetConfig;
  name: string;
  description: string;
  icon: string;
}

/**
 * Metadata for rule categories
 */
export const RULE_CATEGORIES: IRuleCategoryMeta[] = [
  {
    key: 'card',
    name: 'Card Rules',
    description: 'Rules affecting how tricks are resolved',
    icon: 'Wand2',
  },
  {
    key: 'bidding',
    name: 'Bidding Rules',
    description: 'Rules affecting the bidding phase',
    icon: 'Scale',
  },
  {
    key: 'scoring',
    name: 'Scoring Rules',
    description: 'Rules affecting point calculations',
    icon: 'Calculator',
  },
  {
    key: 'structure',
    name: 'Game Structure',
    description: 'Rules affecting round and game flow',
    icon: 'Layers',
  },
  {
    key: 'turn',
    name: 'Turn Timer',
    description: 'Rules affecting active player timing',
    icon: 'Clock',
  },
];

/**
 * Get rules metadata filtered by category
 */
export function getRulesByCategory(category: keyof IRulesetConfig): IRuleMetadata[] {
  return RULE_METADATA.filter((rule) => rule.category === category);
}

/**
 * Create a new config with a single rule changed
 */
export function setRuleValue<K extends keyof IRulesetConfig>(
  config: IRulesetConfig,
  category: K,
  key: keyof IRulesetConfig[K],
  value: IRulesetConfig[K][keyof IRulesetConfig[K]]
): IRulesetConfig {
  return {
    ...config,
    [category]: {
      ...config[category],
      [key]: value,
    },
  };
}
