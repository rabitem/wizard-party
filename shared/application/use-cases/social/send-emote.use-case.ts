import {
  Game,
  GameEventType,
  PlayerNotFoundError,
  type EmoteEvent,
} from '../../../domain';

export interface SendEmoteInput {
  game: Game;
  playerId: string;
  emoteId: string;
}

export interface SendEmoteOutput {
  emoteEvent: EmoteEvent;
}

/**
 * Use case for sending an emote
 */
export class SendEmoteUseCase {
  execute(input: SendEmoteInput): SendEmoteOutput {
    const { game, playerId, emoteId } = input;

    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    return {
      emoteEvent: {
        type: GameEventType.EMOTE,
        playerId,
        playerName: player.name,
        emoteId,
        timestamp: Date.now(),
      },
    };
  }
}
