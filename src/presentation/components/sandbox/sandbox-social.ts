import { GameEventType, type ChatMessageEvent, type EmoteEvent, type TimeoutSoundPlayedEvent } from '@shared/domain';
import { EMOTES, QUICK_MESSAGES } from '../social';
import type { SandboxGameHandles, SocialBurstKind } from './sandbox.types';

export interface SocialTarget {
  /** The local player, who receives timeout sounds. */
  localPlayerId: string;
  opponents: SandboxGameHandles['opponents'];
}

type SocialEvent = EmoteEvent | ChatMessageEvent | TimeoutSoundPlayedEvent;

/**
 * The `index`-th message of a social burst, as the server would broadcast it: opponents take
 * turns, emotes and chat lines cycle through the real presets. Deterministic for replays.
 */
export function socialEvent(kind: SocialBurstKind, index: number, target: SocialTarget, timestamp: number): SocialEvent | null {
  const sender = target.opponents[index % Math.max(1, target.opponents.length)];
  if (!sender) return null;
  switch (kind) {
    case 'emote':
      return { type: GameEventType.EMOTE, timestamp, playerId: sender.id, playerName: sender.name, emoteId: EMOTES[index % EMOTES.length].id };
    case 'chat':
      return { type: GameEventType.CHAT_MESSAGE, timestamp, playerId: sender.id, playerName: sender.name, message: QUICK_MESSAGES[index % QUICK_MESSAGES.length] };
    case 'timeout-sound': {
      const local = { id: target.localPlayerId, name: 'You' };
      return {
        type: GameEventType.TIMEOUT_SOUND_PLAYED,
        timestamp,
        targetPlayerId: local.id,
        targetPlayerName: local.name,
        senderPlayerId: sender.id,
        senderPlayerName: sender.name,
      };
    }
  }
}
