/**
 * Social Types
 * Centralized type definitions for social features (emotes, chat, bids)
 */

import type { CustomSound } from '@shared/domain';

/**
 * Emote message broadcast to room
 */
export interface EmoteMessage {
  id: string;
  playerId: string;
  playerName: string;
  emoteId: string;
  timestamp: number;
}

/**
 * Chat message in the room
 */
export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

/**
 * Bid event for displaying bid animations/notifications
 */
export interface BidEvent {
  id: string;
  playerId: string;
  bid: number;
  timestamp: number;
}

/**
 * Targeted timeout sound event received by the timed-out player and sender.
 */
export interface TimeoutSoundEvent {
  id: string;
  targetPlayerId: string;
  targetPlayerName: string;
  senderPlayerId: string;
  senderPlayerName: string;
  soundName?: string;
  customAudio?: CustomSound;
  timestamp: number;
}
