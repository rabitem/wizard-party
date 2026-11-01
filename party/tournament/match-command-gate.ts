import { ClientCommandType, TournamentMatchLockedError } from '../../shared/domain';

/**
 * Commands a match room refuses: the table, its rules and its start are fixed by the tournament,
 * and there is no rematch. Values complete "You can't ... in a tournament match."
 */
const LOCKED_COMMANDS: ReadonlyMap<string, string> = new Map([
  [ClientCommandType.SET_ROOM_SETTINGS, 'change the room settings'],
  [ClientCommandType.SET_RULESET, 'change the rules'],
  [ClientCommandType.ADD_BOT, 'add bots'],
  [ClientCommandType.REMOVE_BOT, 'remove players'],
  [ClientCommandType.KICK_PLAYER, 'remove players'],
  [ClientCommandType.TRANSFER_HOST, 'hand over the table'],
  [ClientCommandType.START_GAME, 'start the game by hand'],
  [ClientCommandType.REQUEST_REMATCH, 'start a rematch'],
]);

export function lockedCommandError(commandType: string): TournamentMatchLockedError | null {
  const action = LOCKED_COMMANDS.get(commandType);
  return action === undefined ? null : new TournamentMatchLockedError(action);
}
