import {
  StartGameUseCase,
  SelectTrumpUseCase,
  PlaceBidUseCase,
  PlayCardUseCase,
  ResolveEffectUseCase,
  NextRoundUseCase,
  ResumeGameUseCase,
  JoinGameUseCase,
  LeaveGameUseCase,
  AddBotUseCase,
  RemoveBotUseCase,
  SetReadyUseCase,
  KickPlayerUseCase,
  TransferHostUseCase,
  SendEmoteUseCase,
  SendChatUseCase,
  RequestRematchUseCase,
  BotTurnUseCase,
  TurnTimeoutUseCase,
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
  resolveEffect: ResolveEffectUseCase;
  nextRound: NextRoundUseCase;
  resumeGame: ResumeGameUseCase;
  joinGame: JoinGameUseCase;
  leaveGame: LeaveGameUseCase;
  addBot: AddBotUseCase;
  removeBot: RemoveBotUseCase;
  setReady: SetReadyUseCase;
  kickPlayer: KickPlayerUseCase;
  transferHost: TransferHostUseCase;
  sendEmote: SendEmoteUseCase;
  sendChat: SendChatUseCase;
  requestRematch: RequestRematchUseCase;
  botTurn: BotTurnUseCase;
  /** The move made for a connected player whose turn timer ran out. */
  turnTimeout: TurnTimeoutUseCase;
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
    resolveEffect: new ResolveEffectUseCase(),
    nextRound: new NextRoundUseCase(),
    resumeGame: new ResumeGameUseCase(),
    joinGame: new JoinGameUseCase(),
    leaveGame: new LeaveGameUseCase(),
    addBot: new AddBotUseCase(),
    removeBot: new RemoveBotUseCase(),
    setReady: new SetReadyUseCase(),
    kickPlayer: new KickPlayerUseCase(),
    transferHost: new TransferHostUseCase(),
    sendEmote: new SendEmoteUseCase(),
    sendChat: new SendChatUseCase(),
    requestRematch: new RequestRematchUseCase(),
    botTurn: new BotTurnUseCase(),
    turnTimeout: new TurnTimeoutUseCase(),
  };
}
