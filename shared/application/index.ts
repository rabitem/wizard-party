// Ports (interfaces)
export type {
  IGameRepository,
  PersistedGameState,
  IPlayerRegistry,
  IEventEmitter,
} from './ports';

// Use Cases
export {
  // Game
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
  NextRoundUseCase,
  type NextRoundInput,
  type NextRoundOutput,
  // Player
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
  // Social
  SendEmoteUseCase,
  type SendEmoteInput,
  type SendEmoteOutput,
  SendChatUseCase,
  type SendChatInput,
  type SendChatOutput,
  RequestRematchUseCase,
  type RequestRematchInput,
  type RequestRematchOutput,
  // Bot
  BotTurnUseCase,
  type BotTurnInput,
  type BotAction,
  // Undo
  RequestUndoUseCase,
  type RequestUndoInput,
  type RequestUndoOutput,
  type LastPlayedCard,
  type UndoRequestState,
  RespondUndoUseCase,
  type RespondUndoInput,
  type RespondUndoOutput,
  ApplyUndoUseCase,
  type ApplyUndoInput,
  type ApplyUndoOutput,
} from './use-cases';

// Use Case Registry (DI)
export {
  createUseCaseRegistry,
  getDefaultUseCaseRegistry,
  type IUseCaseRegistry,
} from './use-case-registry';
