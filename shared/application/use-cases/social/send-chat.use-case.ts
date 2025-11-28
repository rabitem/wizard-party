import {
  Game,
  GameEventType,
  PlayerNotFoundError,
  type ChatMessageEvent,
} from '../../../domain';

export interface SendChatInput {
  game: Game;
  playerId: string;
  message: string;
}

export interface SendChatOutput {
  chatMessageEvent: ChatMessageEvent;
}

/**
 * Use case for sending a chat message
 * Sanitizes message for basic XSS prevention
 */
export class SendChatUseCase {
  execute(input: SendChatInput): SendChatOutput {
    const { game, playerId, message } = input;

    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    // Sanitize message (basic XSS prevention)
    const sanitizedMessage = message.slice(0, 100).replace(/[<>]/g, '');

    return {
      chatMessageEvent: {
        type: GameEventType.CHAT_MESSAGE,
        playerId,
        playerName: player.name,
        message: sanitizedMessage,
        timestamp: Date.now(),
      },
    };
  }
}
