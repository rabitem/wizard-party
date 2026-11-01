import type * as Party from "../runtime";
import {
  CardType,
  CUSTOM_AUDIO_MAX_DURATION_SECONDS,
  CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES,
  CUSTOM_AUDIO_MIN_DURATION_SECONDS,
  CUSTOM_SOUND_LIMITS,
  DEFAULT_CUSTOM_SOUND_CATEGORY,
  SOUND_CATEGORY_IDS,
  resolveLegacySoundName,
  type CustomSound,
  type SoundCategory,
  type SharedCustomSound,
  type CustomTrickWinAudio,
  type SoundPreferences,
  type Game,
} from "../../shared/domain";
import { JESTER_SOUNDS, TRICK_WIN_SOUNDS, WIZARD_SOUNDS } from "./types";

/**
 * Generate a physics seed for consistent per-card variation across all clients
 * Uses a combination of timestamp and card ID for deterministic randomness
 */
export function generatePhysicsSeed(cardId: string): number {
  const timestamp = Date.now();
  let hash = 0;
  const str = `${cardId}-${timestamp}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getPlayerTrickWinSound(
  playerId: string,
  playerSoundPreferences: Map<string, SoundPreferences>
): string | undefined {
  // Room state saved before the sound library changed may still hold a retired id.
  const preference = resolveLegacySoundName(playerSoundPreferences.get(playerId)?.trickWinSound);
  if (isValidTrickWinPreference(preference)) return preference;
  // Resolve random, missing, and invalid persisted values on the server so all clients hear the same playable sound.
  return getRandomSound(TRICK_WIN_SOUNDS);
}

export function getPlayerTrickWinCustomAudio(
  playerId: string,
  playerSoundPreferences: Map<string, SoundPreferences>
): CustomTrickWinAudio | undefined {
  const preferences = playerSoundPreferences.get(playerId);
  const customPool = preferences?.customTrickWinAudios;
  if (Array.isArray(customPool) && customPool.length > 0) {
    return customPool[Math.floor(Math.random() * customPool.length)];
  }
  if (customPool === null) return undefined;
  return preferences?.customTrickWinAudio ?? undefined;
}

function isValidTrickWinPreference(preference: unknown): preference is SoundPreferences['trickWinSound'] {
  return typeof preference === 'string' && preference !== 'random' && TRICK_WIN_SOUNDS.includes(preference as never);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

/**
 * An uploaded sound as the server accepts it. The declared `size` is the client's word; the data
 * URL's own length is what travels, so that is what is bounded.
 */
function normalizeCustomAudioBase(value: unknown): CustomTrickWinAudio | undefined {
  if (!isRecord(value)) return undefined;

  const { id, name, dataUrl, size, duration } = value;
  if (
    !isBoundedText(id, CUSTOM_SOUND_LIMITS.MAX_ID_LENGTH) ||
    !isBoundedText(name, CUSTOM_SOUND_LIMITS.MAX_NAME_LENGTH) ||
    !isBoundedText(dataUrl, CUSTOM_SOUND_LIMITS.MAX_DATA_URL_LENGTH) ||
    !dataUrl.startsWith('data:audio/') ||
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES ||
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration < CUSTOM_AUDIO_MIN_DURATION_SECONDS ||
    duration > CUSTOM_AUDIO_MAX_DURATION_SECONDS
  ) {
    return undefined;
  }

  return { id, name, dataUrl, size, duration };
}

function normalizeCustomSoundRoles(value: unknown): CustomSound['roles'] {
  if (!isRecord(value)) return { wizard: false, jester: false, trick: false, afk: false, shared: false };
  return {
    wizard: value.wizard === true,
    jester: value.jester === true,
    trick: value.trick === true,
    afk: value.afk === true,
    shared: value.shared === true,
  };
}

function normalizeCustomSoundCategory(value: unknown): SoundCategory {
  return typeof value === 'string' && (SOUND_CATEGORY_IDS as readonly string[]).includes(value)
    ? value as SoundCategory
    : DEFAULT_CUSTOM_SOUND_CATEGORY;
}

function normalizeCustomSound(value: unknown): CustomSound | undefined {
  const audio = normalizeCustomAudioBase(value);
  if (!audio) return undefined;
  if (!isRecord(value)) return undefined;
  return {
    ...audio,
    category: normalizeCustomSoundCategory(value.category),
    roles: normalizeCustomSoundRoles(value.roles),
  };
}

function normalizeCustomTrickWinAudio(value: unknown): CustomTrickWinAudio | null | undefined {
  if (value === null) return null;
  return normalizeCustomAudioBase(value);
}

/** The valid sounds of `role` in a client-sent pool, at most `limit` of them (in the client's order). */
function normalizeCustomSoundPool(
  value: unknown,
  role: 'trick' | 'shared',
  limit: number
): CustomSound[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, limit * 2)
    .map((audio) => normalizeCustomSound(audio))
    .filter((audio): audio is CustomSound => Boolean(audio?.roles[role]))
    .slice(0, limit);
}

function normalizeCustomTrickWinAudioPool(value: unknown): CustomSound[] | null | undefined {
  return normalizeCustomSoundPool(value, 'trick', CUSTOM_SOUND_LIMITS.MAX_TRICK_WIN_SOUNDS_PER_PLAYER);
}

function normalizeSharedCustomSoundPool(value: unknown): CustomSound[] | null | undefined {
  return normalizeCustomSoundPool(value, 'shared', CUSTOM_SOUND_LIMITS.MAX_SHARED_SOUNDS_PER_PLAYER);
}

export function normalizeSoundPreferences(preferences: unknown): SoundPreferences {
  const normalized: SoundPreferences = {};
  if (!isRecord(preferences)) return normalized;

  const trickWinSound = resolveLegacySoundName(preferences.trickWinSound);

  if (trickWinSound === 'random' || isValidTrickWinPreference(trickWinSound)) {
    normalized.trickWinSound = trickWinSound;
  }

  if (Object.prototype.hasOwnProperty.call(preferences, 'customTrickWinAudio')) {
    const customTrickWinAudio = normalizeCustomTrickWinAudio(preferences.customTrickWinAudio);
    if (customTrickWinAudio !== undefined) {
      normalized.customTrickWinAudio = customTrickWinAudio;
    }
  }

  if (Object.prototype.hasOwnProperty.call(preferences, 'customTrickWinAudios')) {
    const customTrickWinAudios = normalizeCustomTrickWinAudioPool(preferences.customTrickWinAudios);
    if (customTrickWinAudios !== undefined) {
      normalized.customTrickWinAudios = customTrickWinAudios;
    }
  }

  if (Object.prototype.hasOwnProperty.call(preferences, 'sharedCustomSounds')) {
    const sharedCustomSounds = normalizeSharedCustomSoundPool(preferences.sharedCustomSounds);
    if (sharedCustomSounds !== undefined) {
      normalized.sharedCustomSounds = sharedCustomSounds;
    }
  }

  return normalized;
}

export function normalizeCustomCardAudioChoice(
  customAudio: unknown,
  cardType: CardType | undefined
): CustomSound | undefined {
  const normalized = normalizeCustomSound(customAudio);
  if (!normalized) return undefined;
  if (cardType === CardType.WIZARD && normalized.roles.wizard) return normalized;
  if (cardType === CardType.JESTER && normalized.roles.jester) return normalized;
  return undefined;
}

export function normalizeTimeoutCustomAudioChoice(customAudio: unknown): CustomSound | undefined {
  const normalized = normalizeCustomSound(customAudio);
  if (!normalized?.roles.afk) return undefined;
  return normalized;
}

export function normalizeCardSoundChoice(soundChoice: unknown): string | undefined {
  // Clients on an older build may still send a retired sound id.
  const sound = resolveLegacySoundName(soundChoice);
  if (typeof sound !== 'string') return undefined;
  if (
    WIZARD_SOUNDS.includes(sound as never) ||
    JESTER_SOUNDS.includes(sound as never)
  ) {
    return sound;
  }
  return undefined;
}

export function getRandomSound(sounds: readonly string[]): string {
  return sounds[Math.floor(Math.random() * sounds.length)];
}

/**
 * The sounds the seated humans share with the table, in seat order, within the room's byte budget
 * (a sound that would exceed it is left out).
 */
export function getSharedCustomSounds(
  game: Game,
  playerSoundPreferences: Map<string, SoundPreferences>,
  maxTotalDataLength: number = CUSTOM_SOUND_LIMITS.MAX_ROOM_SHARED_SOUND_DATA_LENGTH
): SharedCustomSound[] {
  const sharedSounds: SharedCustomSound[] = [];
  let totalDataLength = 0;

  for (const player of game.players) {
    if (player.isBot) continue;

    const customSounds = playerSoundPreferences.get(player.id)?.sharedCustomSounds;
    if (!Array.isArray(customSounds) || customSounds.length === 0) continue;

    for (const sound of customSounds) {
      if (!sound.roles.shared) continue;
      if (totalDataLength + sound.dataUrl.length > maxTotalDataLength) continue;
      totalDataLength += sound.dataUrl.length;
      sharedSounds.push({
        ...sound,
        ownerId: player.id,
        ownerName: player.name,
      });
    }
  }

  return sharedSounds;
}

/**
 * Identifies the shared sound set without its audio, so the server can tell when it changed.
 * Owner names are part of it: a renamed owner changes what the table shows.
 */
export function sharedSoundsSignature(sounds: readonly SharedCustomSound[]): string {
  return JSON.stringify(sounds.map((sound) => [sound.ownerId, sound.ownerName, sound.id, sound.name, sound.dataUrl.length]));
}

/**
 * What of a player's sound preferences is persisted: the chosen built-in sound only. Uploaded
 * audio is large and every client sends its own again on (re)connect, so it lives in memory.
 */
export function persistableSoundPreferences(preferences: SoundPreferences): SoundPreferences {
  return preferences.trickWinSound === undefined ? {} : { trickWinSound: preferences.trickWinSound };
}

export function getPlayerId(
  sender: Party.Connection,
  connectionToPlayer: Map<string, string>
): string {
  const playerId = connectionToPlayer.get(sender.id);
  if (!playerId) throw new Error('Player not found - please rejoin');
  return playerId;
}

// Shared with in-browser transports (animation sandbox) so every client sees the same projection.
export { createPersonalizedState } from "../../shared/application/projections/personalized-state";
