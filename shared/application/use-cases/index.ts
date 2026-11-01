// Game use cases
export {
  StartGameUseCase,
  type StartGameInput,
  type StartGameOutput,
  SelectTrumpUseCase,
  type SelectTrumpInput,
  type SelectTrumpOutput,
  PlaceBidUseCase,
  type PlaceBidInput,
  type PlaceBidOutput,
  PlayCardUseCase,
  type PlayCardInput,
  type PlayCardOutput,
  ResolveEffectUseCase,
  type ResolveEffectInput,
  type ResolveEffectOutput,
  NextRoundUseCase,
  type NextRoundInput,
  type NextRoundOutput,
  ResumeGameUseCase,
  type ResumeGameInput,
  type ResumeGameOutput,
  TurnTimeoutUseCase,
  type TurnTimeoutInput,
} from './game';

// Player use cases
export {
  JoinGameUseCase,
  type JoinGameInput,
  type JoinGameOutput,
  LeaveGameUseCase,
  type LeaveGameInput,
  type LeaveGameOutput,
  AddBotUseCase,
  type AddBotInput,
  type AddBotOutput,
  RemoveBotUseCase,
  type RemoveBotInput,
  type RemoveBotOutput,
  SetReadyUseCase,
  type SetReadyInput,
  type SetReadyOutput,
  KickPlayerUseCase,
  type KickPlayerInput,
  type KickPlayerOutput,
  TransferHostUseCase,
  type TransferHostInput,
  type TransferHostOutput,
  claimSeat,
  usesSessionTokens,
  type SeatClaim,
  type SeatClaimRequest,
  type SeatProof,
} from './player';

// Social use cases
export {
  SendEmoteUseCase,
  type SendEmoteInput,
  type SendEmoteOutput,
  SendChatUseCase,
  type SendChatInput,
  type SendChatOutput,
  RequestRematchUseCase,
  type RequestRematchInput,
  type RequestRematchOutput,
} from './social';

// Bot use cases
export {
  BotTurnUseCase,
  type BotTurnInput,
  type BotTurnOutput,
  type BotTurnOptions,
  type BotFallbackInfo,
  type IBotDecisionMaker,
  fallbackBotAction,
  isLegalBotAction,
} from './bot';

// Telemetry
export {
  IngestTelemetryBatchUseCase,
  type IngestTelemetryBatchOutput,
  IngestClientTelemetryUseCase,
  type IngestClientTelemetryInput,
  type IngestClientTelemetryOutput,
  type ClientTelemetryVolumeBudget,
  PruneClientTelemetryUseCase,
  type PruneClientTelemetryOutput,
  type PruneClientTelemetryOptions,
} from './telemetry';
