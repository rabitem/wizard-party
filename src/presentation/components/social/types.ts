import { AVATAR_PRESETS } from '../settings';
import { CONSTANTS } from '@/presentation/config/constants';

/**
 * Emote interface for social interactions
 */
export interface Emote {
  id: string;
  icon: string; // RPG-Awesome icon class
  label: string;
}

/**
 * Use avatar presets as emotes for consistent theming
 */
export const EMOTES: Emote[] = AVATAR_PRESETS.map(avatar => ({
  id: avatar.id,
  icon: avatar.icon,
  label: avatar.label,
}));

/**
 * Rate limit cooldown in seconds (derived from CONSTANTS)
 */
export const COOLDOWN_SECONDS = CONSTANTS.SOCIAL.COOLDOWN_MS / 1000;

/**
 * Quick chat messages - medieval themed
 */
export const QUICK_MESSAGES = [
  'Good luck!',
  'Well played!',
  'Nice trick!',
  'Oops!',
  'Sorry!',
  "Let's go!",
  'GG!',
  'Rematch?',
  'Impressive!',
  'By the gods!',
  'Huzzah!',
  'Curses!',
  'Fortune favors the bold!',
  'A worthy opponent!',
  'The magic flows strong!',
  'My thanks, friend!',
  'Brilliant strategy!',
  'To victory!',
];
