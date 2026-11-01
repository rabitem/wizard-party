import { CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES } from './sound-options';

/** Room for the `data:audio/<subtype>;base64,` prefix in front of the encoded file. */
const DATA_URL_HEADER_ALLOWANCE = 128;

/** Base64 turns every 3 bytes into 4 characters. */
function base64Length(bytes: number): number {
  return Math.ceil(bytes / 3) * 4;
}

/**
 * Bounds for uploaded sounds that travel through the game server.
 *
 * The file size and duration rules live in sound-options.ts (what a player may upload); these
 * bound what one player can make the room carry, so a single seat cannot fill every frame or the
 * room's memory. The server truncates to these limits instead of rejecting a whole preference
 * update (only a frame above FRAME_LIMITS.SOUND_PREFERENCES is refused as a whole).
 */
export const CUSTOM_SOUND_LIMITS = {
  /** Longest data URL for one sound: the base64 of the largest allowed file plus its header. */
  MAX_DATA_URL_LENGTH: base64Length(CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES) + DATA_URL_HEADER_ALLOWANCE,
  /** Sound ids and names are client-chosen text. */
  MAX_ID_LENGTH: 100,
  MAX_NAME_LENGTH: 120,
  /** Trick-win sounds one player keeps in their random pool. */
  MAX_TRICK_WIN_SOUNDS_PER_PLAYER: 4,
  /** Sounds one player offers to the whole table. */
  MAX_SHARED_SOUNDS_PER_PLAYER: 4,
  /**
   * Data URL characters of all sounds shared in one room. Owners are taken in seat order and a
   * sound that would exceed the budget is left out, so one SHARED_SOUNDS frame stays bounded.
   */
  MAX_ROOM_SHARED_SOUND_DATA_LENGTH: 12 * 1024 * 1024,
} as const;
