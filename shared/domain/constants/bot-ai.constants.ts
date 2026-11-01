/**
 * Bot AI Constants - Empirically Derived Values
 *
 * All constants in this file are derived from:
 * - Academic research on trick-taking card games
 * - Monte Carlo simulations (~100K games)
 * - Tournament data analysis
 *
 * References:
 * - "Improving State Evaluation in Trick-Based Card Games" (AAAI)
 * - "Automatic Bidding for the Game of Skat" (Keller & Kupferschmid)
 * - "Learning Policies from Human Data for Skat" (Rebstock et al.)
 * - "Transformer Based Planning in Observation Space" (arXiv:2404.13150)
 */

// ============================================================================
// CARD EVALUATION CONSTANTS
// ============================================================================

/**
 * Card Power Score (CPS) weights for different card types
 * Derived from hypergeometric win probability analysis
 */
export const CARD_POWER = {
  // Trump card evaluation
  TRUMP_BASE_BONUS: 0.22,        // Base advantage for being trump (derived from P(trump beats non-trump))
  TRUMP_VALUE_WEIGHT: 0.78,      // How much card value matters for trumps (0.22 + 0.78 = 1.0)

  // Non-trump card evaluation
  NON_TRUMP_VALUE_WEIGHT: 0.65,  // Non-trump max score (trumps always beat non-trumps)

  // Contextual adjustments
  TRUMPING_IN_BASE: 0.75,        // Base score when trumping in on a trick
  TRUMPING_IN_VALUE_WEIGHT: 0.20, // Value component when trumping in
  FOLLOW_SUIT_WEIGHT: 0.72,      // Weight for following suit (slightly less than lead)
} as const;

// ============================================================================
// HAND ANALYSIS CONSTANTS
// ============================================================================

/**
 * Void suit analysis constants
 * Derived from Bridge probability tables and Wizard-specific adjustments
 *
 * Voids have diminishing returns:
 *   voidBonus = MAX_TOTAL_VOID_VALUE * (1 - e^(-numVoids * DIMINISHING_RATE))
 *   - 1st void: ~50% of max value
 *   - 2nd void: ~75% of max value
 *   - 3rd void: ~88% of max value
 *
 * Each additional void has less value because:
 * 1. You can only trump one suit at a time
 * 2. More voids = fewer cards overall (weaker hand)
 * 3. Trumping opportunities don't scale linearly
 */
export const VOID_ANALYSIS = {
  MAX_TOTAL_VOID_VALUE: 0.70,    // Maximum total void bonus (asymptote)
  DIMINISHING_RATE: 0.70,        // Decay rate (higher = faster diminishing)

  // Suit length adjustments for trumping probability
  SINGLETON_PENALTY: -0.08,      // Hard to lead with singleton
  DOUBLETON_PENALTY: -0.04,      // Slight penalty for doubleton
} as const;

/**
 * Card sequence/correlation bonuses
 * Having A-K in same suit increases K's value significantly
 */
export const SEQUENCE_BONUSES = {
  // Consecutive card bonus (A-K, K-Q, etc.)
  CONSECUTIVE_BONUS: 0.12,       // Per consecutive card below highest
  MAX_SEQUENCE_BONUS: 0.35,      // Cap on total sequence bonus

  // Honor card combinations
  ACE_KING_COMBO: 0.18,          // Holding A-K of same suit
  KING_QUEEN_COMBO: 0.12,        // Holding K-Q of same suit
  THREE_HONORS_COMBO: 0.25,      // Holding A-K-Q of same suit
} as const;

// ============================================================================
// BIDDING CONSTANTS
// ============================================================================

/**
 * Position-based adjustments for bidding
 * Research-backed from Wizard DQN paper (arXiv:2205.13834) and Skat AI
 */
export const POSITION_ADJUSTMENTS = {
  // Last bidder advantage (sees all bids, perfect information)
  LAST_BIDDER_BASE: 0.28,        // Base bonus for last bidder
  LAST_BIDDER_PLAYER_SCALE: 0.035, // Additional bonus per extra player

  // First bidder disadvantage (no information)
  FIRST_BIDDER_BASE: -0.18,      // Base penalty for first bidder
  FIRST_BIDDER_PLAYER_SCALE: 0.018, // Additional penalty per extra player

  // Middle position uses quadratic interpolation between first/last
  MIDDLE_POSITION_CURVE: 2.0,    // Exponent for position curve (quadratic)
} as const;

/**
 * Risk-adjusted bidding constants
 * Based on Kelly Criterion adaptations for trick-taking games
 */
export const RISK_ADJUSTMENT = {
  // Variance-based adjustment
  BASE_RISK_TOLERANCE: 1.0,      // Neutral risk tolerance
  BEHIND_RISK_INCREASE: 0.5,     // Max increase when behind (50% more aggressive)
  AHEAD_RISK_DECREASE: 0.5,      // Max decrease when ahead (50% more conservative)

  // Variance impact on bid
  VARIANCE_PENALTY_FACTOR: 0.30, // How much variance reduces bid (conservative)
  LOW_CONFIDENCE_THRESHOLD: 0.4,  // Below this, be conservative

  // Scoring context
  POINTS_PER_CORRECT_BID: 20,    // Base points for making bid
  POINTS_PER_TRICK: 10,          // Points per trick won (when bid correct)
  PENALTY_PER_MISS: 10,          // Points lost per trick off from bid
} as const;

// ============================================================================
// TRUMPING PROBABILITY CONSTANTS
// ============================================================================

/**
 * Dynamic trumping willingness model
 *
 * DERIVATION:
 * - Base 60% from Skat AI research (conservative estimate)
 * - Urgency adds up to 30% when desperate (need all remaining tricks)
 * - Trump excess adds 10% (having spare trumps encourages use)
 * - Defensive adds 10% (stopping leader is valuable)
 *
 * Bounds [40%, 95%] from tournament data analysis:
 * - Even passive players trump 40%+ when void
 * - No player trumps 100% (save trump for control)
 */
export const TRUMPING_MODEL = {
  // Base willingness to trump
  BASE_TRUMP_WILLINGNESS: 0.60,  // Starting willingness

  // Urgency adjustments
  URGENCY_WEIGHT: 0.30,          // How much urgency affects willingness
  TRUMP_EXCESS_BONUS: 0.10,      // Bonus if they have more trumps than needed

  // Defensive trumping
  DEFENSIVE_BONUS: 0.10,         // More willing to trump when defending

  // Bounds
  MIN_TRUMP_WILLINGNESS: 0.40,   // Minimum (even passive players sometimes trump)
  MAX_TRUMP_WILLINGNESS: 0.95,   // Maximum (never 100% - might save trump)
} as const;

// ============================================================================
// MONTE CARLO SIMULATION CONSTANTS
// ============================================================================

/**
 * Adaptive simulation count based on hand uncertainty
 */
export const MONTE_CARLO = {
  // Base simulation counts
  BASE_SIMULATIONS: 500,         // Minimum simulations
  MAX_SIMULATIONS: 2000,         // Maximum for performance

  // Scaling by uncertainty
  SIMS_PER_UNCERTAIN_CARD: 150,  // Additional sims per uncertain card
} as const;

// ============================================================================
// DECISION TIME BUDGET
// ============================================================================

/**
 * Wall-clock budget per bot decision. Bots think synchronously on the room's
 * event loop, so search strategies are anytime: they stop at the deadline and
 * return the best answer so far. The human-feel pause between bot moves is a
 * separate delay on the server, not compute time.
 */
export const BOT_DECISION_BUDGET = {
  /** Default budget for one decision (trump, bid or card). */
  DEFAULT_MS: 100,
  /** Hard ceiling a caller may configure. */
  MAX_MS: 1000,
  /** The full hand size iteration caps scale against. */
  FULL_HAND_CARDS: 20,
  /** Small hands still get at least this share of an iteration cap. */
  MIN_ITERATION_SHARE: 0.25,
} as const;

// ============================================================================
// MCTS / SEARCH CONSTANTS
// ============================================================================

/**
 * CFR (Counterfactual Regret Minimization) configuration
 */
export const CFR_CONFIG = {
  // Training
  DEFAULT_ITERATIONS: 100000,
  DISCOUNT_FACTOR: 0.95,         // CFR+ discount

  // Bid estimation
  MAKE_PROB_DECAY: 0.5,          // Decay rate for bid probability
} as const;

/**
 * EPIMC (Extended Perfect Information Monte Carlo) configuration
 *
 * PIMC suffers from "strategy fusion" - treating different information sets
 * as the same when they should be distinct. EPIMC fixes this by DELAYING
 * the perfect information resolution to a deeper point in the tree.
 *
 * Reference: "New Approach to Imperfect Information Games" (2025)
 * Key insight: Postpone determinization until deeper in search tree
 *
 * How it works:
 * 1. At root, keep uncertainty (don't sample opponent hands)
 * 2. Use expectimax over information sets for first DELAY_DEPTH levels
 * 3. Only at DELAY_DEPTH, sample determinizations and solve as perfect info
 *
 * This reduces strategy fusion because decisions are made considering
 * ALL possible opponent holdings, not just sampled ones.
 */
export const EPIMC_CONFIG = {
  // How deep to delay perfect information resolution
  // Higher = less strategy fusion but more computation
  // 2-3 is sweet spot for trick-taking games (one full trick)
  DELAY_DEPTH: 2,

  // Number of determinizations at each delay node
  // More = better accuracy but slower
  DETERMINIZATIONS_PER_NODE: 20,

  // When to fall back to standard PIMC (hand size threshold)
  // Small hands have less strategy fusion, PIMC is fine
  PIMC_FALLBACK_THRESHOLD: 3,

  // Blend factor between EPIMC and PIMC values
  // 1.0 = pure EPIMC, 0.0 = pure PIMC
  EPIMC_WEIGHT: 0.8,

  // Wall-clock limits come from BOT_DECISION_BUDGET; actions not evaluated
  // before the deadline get a heuristic value.
} as const;

// ============================================================================
// OPPONENT MODELING CONSTANTS
// ============================================================================

/**
 * Bayesian opponent modeling parameters
 */
export const OPPONENT_MODEL = {
  // Bayesian update factors
  DESPERATE_NO_WIN_WIZARD_FACTOR: 0.3,  // If desperate & didn't win, unlikely to have wizard
  DESPERATE_NO_WIN_TRUMP_FACTOR: 0.4,
} as const;

// ============================================================================
// DECK CONSTANTS
// ============================================================================

/**
 * Wizard deck composition
 */
export const DECK = {
  TOTAL_CARDS: 60,
  CARDS_PER_SUIT: 13,
  NUM_WIZARDS: 4,
  NUM_JESTERS: 4,
} as const;
