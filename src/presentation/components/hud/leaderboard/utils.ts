import { IPlayer } from '@shared/domain';
import { AVATAR_PRESETS } from '../../settings';

/**
 * Calculates the round score based on bid and tricks won
 */
export function calculateCurrentRoundScore(player: IPlayer): number {
  if (player.bid === null) return 0;

  if (player.tricksWon === player.bid) {
    return 20 + player.tricksWon * 10;
  }
  return -Math.abs(player.tricksWon - player.bid) * 10;
}

/**
 * Avatar icon for a player: the local player's own avatar (`useAvatarId`), others by seat until
 * the room carries avatars.
 */
export function getPlayerAvatarIcon(isLocalPlayer: boolean, playerIndex: number, localAvatarId: string): string {
  if (isLocalPlayer) {
    const avatarPreset = AVATAR_PRESETS.find((a) => a.id === localAvatarId);
    return avatarPreset?.icon || AVATAR_PRESETS[0].icon;
  }
  return AVATAR_PRESETS[playerIndex % AVATAR_PRESETS.length].icon;
}
