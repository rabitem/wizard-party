export {
  GameError,
  // Authorization
  NotHostError,
  NotYourTurnError,
  NotDealerError,
  NotTrumpChooserError,
  // Special cards
  DeclarationRequiredError,
  EffectPendingError,
  InvalidEffectResponseError,
  NoTrumpNotAllowedError,
  InvalidTrumpSuitError,
  // Game State
  InvalidPhaseError,
  InvalidPhaseTransitionError,
  GameNotStartedError,
  GameAlreadyStartedError,
  GameNotFoundError,
  // Player
  PlayerNotFoundError,
  PlayerAlreadyInGameError,
  MaxPlayersReachedError,
  NotEnoughPlayersError,
  PlayersReconnectingError,
  GamePausedError,
  PlayerKickedError,
  CannotTargetSelfError,
  InvalidHostTargetError,
  // Card
  CardNotFoundError,
  CardNotPlayableError,
  InvalidCardValueError,
  // Bidding
  InvalidBidError,
  BidAlreadyPlacedError,
  ForbiddenBidError,
  // Room
  RoomFullError,
} from './game-errors';

// Connection validation errors
export {
  PlayerNameTakenError,
  InvalidPlayerNameError,
  InvalidPersistentIdError,
  SessionExpiredError,
  SessionRejectedError,
  ReconnectionSlotTakenError,
  ReconnectionNotAllowedError,
  DuplicateJoinError,
} from './connection-errors';

// Tournament match room errors
export {
  TOURNAMENT_GAME_ERROR_CODES,
  TournamentTicketRequiredError,
  TournamentTicketInvalidError,
  TournamentNoShowError,
  TournamentMatchLockedError,
  TournamentsUnavailableError,
} from './tournament-errors';
