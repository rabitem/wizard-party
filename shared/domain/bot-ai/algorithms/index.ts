/**
 * Bot AI Algorithms
 *
 * Algorithms used by expert-level bots:
 * - ISMCTS: Information Set Monte Carlo Tree Search
 * - CFR: Counterfactual Regret Minimization for bidding
 * - Bayesian: Opponent modeling with proper Bayes updates
 * - Alpha-Beta: Fast tactical search
 * - EPIMC: Fixes strategy fusion by delaying determinization
 * - Card Inference: Learned patterns for opponent hand prediction
 * - Monte Carlo: Simulation-based bid estimation
 */

export {
  ISMCTS,
  createISMCTS,
  type ISMCTSConfig,
  DEFAULT_ISMCTS_CONFIG,
} from './ismcts';

export {
  CFRBiddingTrainer,
  getCFRTrainer,
  type CFRConfig,
  DEFAULT_CFR_CONFIG,
} from './cfr-bidding';

export {
  BayesianOpponentModel,
  createBayesianOpponentModel,
  type BayesianConfig,
  DEFAULT_BAYESIAN_CONFIG,
} from './bayesian-opponent';

export {
  AlphaBetaSearch,
  createAlphaBetaSearch,
  type AlphaBetaConfig,
  DEFAULT_ALPHABETA_CONFIG,
} from './alpha-beta';

export {
  MonteCarloBiddingSimulator,
  createMonteCarloBiddingSimulator,
  type MonteCarloConfig,
  DEFAULT_MC_CONFIG,
  type SimulationResult,
} from './monte-carlo-sim';

export {
  EPIMC,
  createEPIMC,
  type EPIMCConfig,
  DEFAULT_EPIMC_CONFIG,
} from './epimc';

export {
  CardInferenceEngine,
  createCardInferenceEngine,
  sampleInformedDeterminization,
  type CardProbabilityDistribution,
} from './card-inference';
