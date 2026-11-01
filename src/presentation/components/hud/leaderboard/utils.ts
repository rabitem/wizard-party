import { IPlayer } from '@shared/domain';
import { AVATAR_PRESETS, loadGameSettings } from '../../settings';

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
 * Get avatar icon for a player
 */
export function getPlayerAvatarIcon(isLocalPlayer: boolean, playerIndex: number): string {
  if (isLocalPlayer) {
    const settings = loadGameSettings();
    const avatarPreset = AVATAR_PRESETS.find((a) => a.id === settings.avatar);
    return avatarPreset?.icon || AVATAR_PRESETS[0].icon;
  }
  return AVATAR_PRESETS[playerIndex % AVATAR_PRESETS.length].icon;
}
