import { CUSTOM_SOUND_LIMITS } from '../constants/custom-sound-limits';
import { ClientCommandType } from './client-commands';

const KIB = 1024;

/**
 * Field bounds every client command is decoded against before any use case runs. They are
 * deliberately looser than the product rules (a name of at most 20 characters, a bid up to the
 * cards in hand): the domain enforces those with a helpful error, the decoder only keeps garbage
 * and oversized values out.
 */
export const COMMAND_LIMITS = {
  MAX_REQUEST_ID_LENGTH: 100,
  /** Player, bot, card and persistent ids. */
  MAX_ID_LENGTH: 100,
  /** Session tokens are 43 characters today; the bound leaves room for a longer format. */
  MAX_SESSION_TOKEN_LENGTH: 256,
  /** Signed tournament match tickets carry the ruleset; the verifier allows 8 KiB of them. */
  MAX_TOURNAMENT_TICKET_LENGTH: 16 * KIB,
  /** Signed character tickets (a name and a look); the verifier allows 2 KiB of them. */
  MAX_APPEARANCE_TICKET_LENGTH: 2 * KIB,
  MAX_PLAYER_NAME_LENGTH: 64,
  MAX_SOUND_NAME_LENGTH: 64,
  /** Raw chat input; the chat use case shortens what it broadcasts. */
  MAX_CHAT_INPUT_LENGTH: 500,
  /** No round deals more cards than the 60-card deck. */
  MAX_BID: 60,
  /** Physics vectors are table coordinates and throw speeds; anything beyond is not a throw. */
  MAX_PHYSICS_MAGNITUDE: 10_000,
  MAX_PROTOCOL_VERSION: 1_000,
} as const;

/** Emote ids are catalogue keys (avatar preset ids such as `wizard` or `thumbs_up`). */
export const EMOTE_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

const SOUND_FRAME_OVERHEAD = 16 * KIB;
const soundFrame = (sounds: number) => sounds * CUSTOM_SOUND_LIMITS.MAX_DATA_URL_LENGTH + SOUND_FRAME_OVERHEAD;

/** Longest raw frame (characters of JSON) accepted per kind of command. */
export const FRAME_LIMITS = {
  /** Commands with a handful of scalar fields. */
  DEFAULT: 16 * KIB,
  /** Commands carrying room settings or a ruleset. */
  SETTINGS: 64 * KIB,
  /** Commands carrying one uploaded sound (a wizard/jester sound, a soundboard sound). */
  ONE_SOUND: soundFrame(1),
  /** A full sound preference update: the trick-win pool, the shared sounds and one legacy sound. */
  SOUND_PREFERENCES: soundFrame(
    CUSTOM_SOUND_LIMITS.MAX_TRICK_WIN_SOUNDS_PER_PLAYER + CUSTOM_SOUND_LIMITS.MAX_SHARED_SOUNDS_PER_PLAYER + 1
  ),
} as const;

const FRAME_LIMIT_BY_TYPE: Partial<Record<ClientCommandType, number>> = {
  [ClientCommandType.JOIN_GAME]: FRAME_LIMITS.SETTINGS,
  [ClientCommandType.SET_ROOM_SETTINGS]: FRAME_LIMITS.SETTINGS,
  [ClientCommandType.SET_RULESET]: FRAME_LIMITS.SETTINGS,
  [ClientCommandType.PLAY_CARD]: FRAME_LIMITS.ONE_SOUND,
  [ClientCommandType.PLAY_TIMEOUT_SOUND]: FRAME_LIMITS.ONE_SOUND,
  [ClientCommandType.UPDATE_SOUND_PREFERENCES]: FRAME_LIMITS.SOUND_PREFERENCES,
};

/** Longest frame a command of `type` may arrive in. */
export function maxFrameLengthFor(type: ClientCommandType): number {
  return FRAME_LIMIT_BY_TYPE[type] ?? FRAME_LIMITS.DEFAULT;
}

/** Longest frame of any command; larger frames are refused before they are parsed. */
export const MAX_FRAME_LENGTH = Math.max(...Object.values(FRAME_LIMITS));
