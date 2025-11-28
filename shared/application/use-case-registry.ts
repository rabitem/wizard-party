import {
  StartGameUseCase,
  SelectTrumpUseCase,
  PlaceBidUseCase,
  PlayCardUseCase,
  NextRoundUseCase,
  ResumeGameUseCase,
  JoinGameUseCase,
  LeaveGameUseCase,
  AddBotUseCase,
  RemoveBotUseCase,
  SendEmoteUseCase,
  SendChatUseCase,
  RequestRematchUseCase,
  BotTurnUseCase,
  RequestUndoUseCase,
  RespondUndoUseCase,
  ApplyUndoUseCase,
} from './use-cases';

/**
 * Interface for all use case dependencies
 * Allows for dependency injection and easier testing
 */
export interface IUseCaseRegistry {
  startGame: StartGameUseCase;
  selectTrump: SelectTrumpUseCase;
  placeBid: PlaceBidUseCase;
  playCard: PlayCardUseCase;
  nextRound: NextRoundUseCase;
  resumeGame: ResumeGameUseCase;
  joinGame: JoinGameUseCase;
  leaveGame: LeaveGameUseCase;
  addBot: AddBotUseCase;
  removeBot: RemoveBotUseCase;
  sendEmote: SendEmoteUseCase;
  sendChat: SendChatUseCase;
  requestRematch: RequestRematchUseCase;
  botTurn: BotTurnUseCase;
  requestUndo: RequestUndoUseCase;
  respondUndo: RespondUndoUseCase;
  applyUndo: ApplyUndoUseCase;
}

/**
 * Default factory function to create all use cases
 * Can be overridden for testing or alternative implementations
 */
export function createUseCaseRegistry(): IUseCaseRegistry {
  return {
    startGame: new StartGameUseCase(),
    selectTrump: new SelectTrumpUseCase(),
    placeBid: new PlaceBidUseCase(),
    playCard: new PlayCardUseCase(),
    nextRound: new NextRoundUseCase(),
    resumeGame: new ResumeGameUseCase(),
    joinGame: new JoinGameUseCase(),
    leaveGame: new LeaveGameUseCase(),
    addBot: new AddBotUseCase(),
    removeBot: new RemoveBotUseCase(),
    sendEmote: new SendEmoteUseCase(),
    sendChat: new SendChatUseCase(),
    requestRematch: new RequestRematchUseCase(),
    botTurn: new BotTurnUseCase(),
    requestUndo: new RequestUndoUseCase(),
    respondUndo: new RespondUndoUseCase(),
    applyUndo: new ApplyUndoUseCase(),
  };
}

/**
 * Default singleton instance for production use
 */
let defaultRegistry: IUseCaseRegistry | null = null;

export function getDefaultUseCaseRegistry(): IUseCaseRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createUseCaseRegistry();
  }
  return defaultRegistry;
}
