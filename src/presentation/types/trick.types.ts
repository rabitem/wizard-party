import type { SoundPreferences } from '@shared/domain';

/**
 * A completed trick as the table presents it: who takes it, and the winner's sound. The single
 * definition for the connection layer, the 3D scene and the HUD.
 */
export interface TrickResult {
  /** Player the trick goes to (for a voided trick: the next leader). */
  winnerId: string;
  winnerName: string;
  /** A Bomb destroyed the trick: nobody is credited with it. */
  voided?: boolean;
  timestamp: number;
  /** The winner's trick-win sound choice. */
  soundChoice?: string;
  customTrickWinAudio?: SoundPreferences['customTrickWinAudio'];
}
