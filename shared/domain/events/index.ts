export {
  GameEventType,
  type BaseGameEvent,
  type GameEvent,
  // Physics state types for multiplayer sync
  type PhysicsVector3,
  type CardPhysicsState,
  // Individual event types
  type PlayerJoinedEvent,
  type PlayerLeftEvent,
  type PlayerReconnectedEvent,
  // Lobby management events
  type PlayerKickedEvent,
  type HostChangedEvent,
  // Lobby grace period events
  type PlayerGracedEvent,
  type PlayerGraceExpiredEvent,
  type PlayerGraceRestoredEvent,
  type GameStartedEvent,
  type RoundStartedEvent,
  type TrumpRevealedEvent,
  type TrumpSelectedEvent,
  type BidPlacedEvent,
  type BiddingCompleteEvent,
  type CardPlayedEvent,
  type TrickCompleteEvent,
  type TrickEffectResolvedEvent,
  type RoundCompleteEvent,
  type GameCompleteEvent,
  type TurnTimerExpiredEvent,
  type TimeoutSoundPlayedEvent,
  type GamePausedEvent,
  type GameResumedEvent,
  type GameStateEvent,
  type ErrorEvent,
  type SessionEvent,
  type PongEvent,
  type CommandAckEvent,
  type SharedSoundsEvent,
  type BroadcastEvent,
  type EmoteEvent,
  type ChatMessageEvent,
  type RematchRequestedEvent,
  type RematchStartedEvent,
} from './game-events';

export {
  ClientCommandType,
  type BaseCommand,
  type ClientCommand,
  // Physics state for client commands
  type ClientPhysicsState,
  // Individual command types
  type JoinGameCommand,
  type LeaveGameCommand,
  type StartGameCommand,
  type RequestStateCommand,
  type PingCommand,
  type SetRoomSettingsCommand,
  type SetRulesetCommand,
  type SetReadyCommand,
  type KickPlayerCommand,
  type TransferHostCommand,
  type SelectTrumpCommand,
  type PlaceBidCommand,
  type PlayCardCommand,
  type ResolveEffectCommand,
  type NextRoundCommand,
  type SendEmoteCommand,
  type SendChatCommand,
  type RequestRematchCommand,
  type AddBotCommand,
  type RemoveBotCommand,
  // Sound Commands
  type SoundPreferences,
  type UpdateSoundPreferencesCommand,
  type PlayTimeoutSoundCommand,
} from './client-commands';

export {
  PROTOCOL_VERSION,
  LEGACY_PROTOCOL_VERSION,
  isLegacyProtocol,
  SEAT_PROOF_HEADER,
  ConnectionCloseCode,
  ConnectionCloseReason,
  ProtocolErrorCode,
  isTerminalCloseCode,
} from './protocol';

export {
  COMMAND_LIMITS,
  FRAME_LIMITS,
  MAX_FRAME_LENGTH,
  maxFrameLengthFor,
} from './command-limits';

export {
  decodeClientCommand,
  isClientCommandType,
  type CommandDecodeResult,
  type CommandDecodeFailure,
  type CommandDecodeFailureCode,
} from './command-decoders';
