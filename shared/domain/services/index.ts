/**
 * Domain Services
 * Stateless services that encapsulate domain logic following SRP
 */

export {
  BiddingService,
  type BidValidationResult,
  type BidContext,
} from './bidding.service';

export {
  PhaseManager,
  GamePhaseValue,
  ACTIVE_PHASES,
  JOINABLE_PHASES,
  IN_PROGRESS_PHASES,
  type TrumpDeterminationResult,
} from './phase-manager';

export {
  createBidVisibilityPolicy,
  type BidVisibilityInput,
  type IBidVisibilityPolicy,
} from './bid-visibility';

export {
  getStandings,
  getWinnerIds,
  type IStanding,
} from './standings.service';

export { CardSortService, SUIT_ORDER } from './card-sort.service';

// Connection validation services
export {
  PlayerNameService,
  type NameValidationResult,
  type PlayerNameInfo,
} from './player-name.service';

export {
  SessionValidationService,
  type PersistentIdValidationResult,
  type PauseState,
} from './session-validation.service';

// Rule Appliers
export { shouldShowBids } from './rule-appliers';
