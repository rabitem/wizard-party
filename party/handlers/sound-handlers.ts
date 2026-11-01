import type * as Party from "../runtime";
import {
  GameEventType,
  SOUNDBOARD_SOUND_NAMES,
  resolveLegacySoundName,
  type SoundPreferences,
  type SoundboardSoundName,
  type TimeoutSoundPlayedEvent,
  type CustomSound,
} from "../../shared/domain";
import type { ServerContext } from "../utils/types";
import { normalizeSoundPreferences, normalizeTimeoutCustomAudioChoice } from "../utils/helpers";
import { soundPreferencesChangedFact } from "../telemetry";

/**
 * A player's own sound settings and the timeout soundboard: per-player preferences that never
 * change the game itself. (Muting chat and emotes is the client's own filter; the server keeps
 * no mute state.)
 */

export function handleUpdateSoundPreferences(
  ctx: ServerContext,
  preferences: SoundPreferences,
  sender: Party.Connection
): void {
  const playerId = ctx.connectionToPlayer.get(sender.id);
  if (!playerId) return;

  const normalizedPreferences = normalizeSoundPreferences(preferences);

  const existing = ctx.playerSoundPreferences.get(playerId) || {};
  const merged = { ...existing, ...normalizedPreferences };
  ctx.playerSoundPreferences.set(playerId, merged);
  const fact = soundPreferencesChangedFact(playerId, existing, merged);
  if (fact) ctx.telemetry.record(fact, ctx.game);
  // Preferences are not part of the game: only the table's shared sounds may have changed.
  ctx.syncSharedSounds();
  ctx.saveState();
}

function isValidSoundboardSoundName(soundName: unknown): soundName is SoundboardSoundName {
  return typeof soundName === 'string' &&
    (SOUNDBOARD_SOUND_NAMES as readonly string[]).includes(soundName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getTimeoutSoundRequest(input: unknown): { soundName?: unknown; customAudio?: unknown } {
  if (typeof input === 'string') return { soundName: input };
  if (!isRecord(input)) return {};
  return {
    soundName: input.soundName,
    customAudio: input.customAudio,
  };
}

function resolveTimeoutSound(input: unknown): { soundName?: SoundboardSoundName; customAudio?: CustomSound } {
  const request = getTimeoutSoundRequest(input);
  const customAudio = normalizeTimeoutCustomAudioChoice(request.customAudio);
  if (customAudio) return { customAudio };
  const soundName = resolveLegacySoundName(request.soundName);
  if (isValidSoundboardSoundName(soundName)) return { soundName };
  throw new Error('Sound is not in the timeout sound library');
}

/**
 * Send a timeout sound to the timed-out player and the player who triggered it.
 */
export function handlePlayTimeoutSound(
  ctx: ServerContext,
  soundRequest: unknown,
  sender: Party.Connection
): void {
  const senderPlayerId = ctx.connectionToPlayer.get(sender.id);
  if (!senderPlayerId) return;

  const timeoutSound = resolveTimeoutSound(soundRequest);

  const timer = ctx.game.turnTimerState;
  if (!timer?.expired) {
    throw new Error('Soundboard opens after the turn timer runs out');
  }

  const senderPlayer = ctx.game.getPlayer(senderPlayerId);
  const targetPlayer = ctx.game.getPlayer(timer.playerId);
  if (!senderPlayer || !targetPlayer) {
    throw new Error('Player not found');
  }

  if (senderPlayer.id === targetPlayer.id) {
    throw new Error('You cannot play a timeout sound for yourself');
  }

  if (targetPlayer.isBot) {
    throw new Error('Timeout sounds can only target connected players');
  }

  const event: TimeoutSoundPlayedEvent = {
    type: GameEventType.TIMEOUT_SOUND_PLAYED,
    targetPlayerId: targetPlayer.id,
    targetPlayerName: targetPlayer.name,
    senderPlayerId: senderPlayer.id,
    senderPlayerName: senderPlayer.name,
    ...timeoutSound,
    timestamp: Date.now(),
  };

  let sentToTarget = false;
  for (const [connectionId, playerId] of ctx.connectionToPlayer) {
    if (playerId !== targetPlayer.id) continue;

    const connection = ctx.activeConnections.get(connectionId);
    if (!connection) continue;

    ctx.sendToConnection(connection, event);
    sentToTarget = true;
  }

  if (!sentToTarget) {
    throw new Error('Target player is not connected');
  }

  ctx.sendToConnection(sender, event);
  ctx.telemetry.capture([event], ctx.game);
}
