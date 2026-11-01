import type * as Party from "../runtime";
import { ClientCommandType, type ClientCommand } from "../../shared/domain";
import type { ServerContext } from "../utils/types";
import {
  handleNextRound,
  handlePlaceBid,
  handlePlayCard,
  handleRequestRematch,
  handleResolveEffect,
  handleSelectTrump,
  handleStartGame,
} from "./game-handlers";
import { handleSetRoomSettings, handleSetRuleset } from "./settings-handlers";
import {
  handleAddBot,
  handleKickPlayer,
  handleLeaveGame,
  handleRemoveBot,
  handleSetReady,
  handleTransferHost,
} from "./player-handlers";
import { handlePlayTimeoutSound, handleUpdateSoundPreferences } from "./sound-handlers";
import { handleSendChat, handleSendEmote } from "./social-handlers";

/** Commands the server adapter answers itself (they need the connection's protocol session). */
export type ServerCommandType =
  | ClientCommandType.JOIN_GAME
  | ClientCommandType.REQUEST_STATE
  | ClientCommandType.PING;

export type RoutedCommandType = Exclude<ClientCommandType, ServerCommandType>;

type CommandOf<K extends ClientCommandType> = Extract<ClientCommand, { type: K }>;

/** A command that changes the room; each one has a handler in the table below. */
export type RoutedCommand = CommandOf<RoutedCommandType>;

type CommandRoute<K extends RoutedCommandType> = (ctx: ServerContext, command: CommandOf<K>, sender: Party.Connection) => void;

/**
 * One handler per command type. The table is exhaustive: a new command type does not compile
 * until it has a route here (or is answered by the server adapter).
 */
const COMMAND_ROUTES: { [K in RoutedCommandType]: CommandRoute<K> } = {
  [ClientCommandType.LEAVE_GAME]: (ctx, _command, sender) => handleLeaveGame(ctx, sender, true),
  [ClientCommandType.START_GAME]: (ctx, _command, sender) => handleStartGame(ctx, sender),
  [ClientCommandType.SET_ROOM_SETTINGS]: (ctx, command, sender) => handleSetRoomSettings(ctx, command.roomSettings, sender),
  [ClientCommandType.SET_RULESET]: (ctx, command, sender) => handleSetRuleset(ctx, command.rulesetConfig, sender),
  [ClientCommandType.SET_READY]: (ctx, command, sender) => handleSetReady(ctx, command.ready, sender),
  [ClientCommandType.KICK_PLAYER]: (ctx, command, sender) => handleKickPlayer(ctx, command.playerId, sender),
  [ClientCommandType.TRANSFER_HOST]: (ctx, command, sender) => handleTransferHost(ctx, command.playerId, sender),
  [ClientCommandType.SELECT_TRUMP]: (ctx, command, sender) => handleSelectTrump(ctx, command.suit, sender),
  [ClientCommandType.PLACE_BID]: (ctx, command, sender) => handlePlaceBid(ctx, command.bid, sender),
  [ClientCommandType.PLAY_CARD]: (ctx, command, sender) =>
    handlePlayCard(ctx, command.cardId, command.soundChoice, sender, {
      clientPhysicsState: command.physicsState,
      customAudio: command.customAudio,
      declaration: command.declaration,
    }),
  [ClientCommandType.RESOLVE_EFFECT]: (ctx, command, sender) => handleResolveEffect(ctx, command.response, sender),
  [ClientCommandType.NEXT_ROUND]: (ctx, _command, sender) => handleNextRound(ctx, sender),
  [ClientCommandType.SEND_EMOTE]: (ctx, command, sender) => handleSendEmote(ctx, command.emoteId, sender),
  [ClientCommandType.SEND_CHAT]: (ctx, command, sender) => handleSendChat(ctx, command.message, sender),
  [ClientCommandType.REQUEST_REMATCH]: (ctx, _command, sender) => handleRequestRematch(ctx, sender),
  [ClientCommandType.ADD_BOT]: (ctx, command, sender) => handleAddBot(ctx, sender, command.difficulty),
  [ClientCommandType.REMOVE_BOT]: (ctx, command, sender) => handleRemoveBot(ctx, command.botId, sender),
  [ClientCommandType.UPDATE_SOUND_PREFERENCES]: (ctx, command, sender) =>
    handleUpdateSoundPreferences(ctx, command.preferences, sender),
  [ClientCommandType.PLAY_TIMEOUT_SOUND]: (ctx, command, sender) => handlePlayTimeoutSound(ctx, command, sender),
};

export function isRoutedCommand(command: ClientCommand): command is RoutedCommand {
  return Object.prototype.hasOwnProperty.call(COMMAND_ROUTES, command.type);
}

/** Runs the handler of a decoded command. */
export function routeCommand(ctx: ServerContext, command: RoutedCommand, sender: Party.Connection): void {
  const route = COMMAND_ROUTES[command.type] as unknown as CommandRoute<RoutedCommandType>;
  route(ctx, command, sender);
}
