import {
  Game,
  GamePhase,
  GameEventType,
  InvalidPhaseError,
  NotYourTurnError,
  PlayerNotFoundError,
  CardNotPlayableError,
  type CardPlayedEvent,
  type TrickCompleteEvent,
  type RoundCompleteEvent,
  type GameCompleteEvent,
  type ICard,
} from '../../../domain';

export interface PlayCardInput {
  game: Game;
  playerId: string;
  cardId: string;
}

export interface PlayCardOutput {
  cardPlayedEvent: CardPlayedEvent;
  trickCompleteEvent?: TrickCompleteEvent;
  roundCompleteEvent?: RoundCompleteEvent;
  gameCompleteEvent?: GameCompleteEvent;
  card: ICard;
  previousPlayerIndex: number;
}

/**
 * Use case for playing a card
 * Validates card is playable and handles trick/round/game completion
 */
export class PlayCardUseCase {
  execute(input: PlayCardInput): PlayCardOutput {
    const { game, playerId, cardId } = input;

    // Validate phase
    if (game.phase !== GamePhase.PLAYING) {
      throw new InvalidPhaseError('PLAYING', game.phase);
    }

    // Validate player exists
    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    // Validate turn
    if (game.getCurrentPlayer().id !== playerId) {
      throw new NotYourTurnError('play');
    }

    // Get card before playing (for event)
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      throw new CardNotPlayableError(cardId);
    }

    // Validate card is playable
    const playableCards = player.getPlayableCards(game.currentTrick?.getLeadSuit() ?? null);
    if (!playableCards.some((c) => c.id === cardId)) {
      throw new CardNotPlayableError(cardId);
    }

    // Store previous player index for undo
    const previousPlayerIndex = game.currentPlayerIndex;

    // Play the card
    const result = game.playCard(playerId, cardId);

    const timestamp = Date.now();
    const output: PlayCardOutput = {
      cardPlayedEvent: {
        type: GameEventType.CARD_PLAYED,
        playerId,
        card: card.toJSON(),
        nextPlayerId: game.phase === GamePhase.PLAYING ? game.getCurrentPlayer().id : null,
        timestamp,
      },
      card: card.toJSON(),
      previousPlayerIndex,
    };

    // Handle trick completion
    if (result.trickComplete && result.winnerId) {
      // Get the completed trick (it was just pushed to completedTricks)
      const completedTrick = game.completedTricks[game.completedTricks.length - 1];
      // Cards are already serialized as ICard in the Trick entity
      const trickCards = completedTrick.cards.map((pc) => ({
        playerId: pc.playerId,
        card: pc.card,
      }));

      output.trickCompleteEvent = {
        type: GameEventType.TRICK_COMPLETE,
        winnerId: result.winnerId,
        trickIndex: game.completedTricks.length - 1,
        trickCards,
        timestamp,
      };

      // Handle round completion
      if (result.roundComplete) {
        const scores = game.players.map((p) => ({
          playerId: p.id,
          roundScore: p.tricksWon === p.bid ? 20 + p.tricksWon * 10 : -Math.abs(p.tricksWon - (p.bid ?? 0)) * 10,
          totalScore: p.score,
        }));

        output.roundCompleteEvent = {
          type: GameEventType.ROUND_COMPLETE,
          scores,
          timestamp,
        };

        // Handle game completion (read phase after state transition)
        const currentPhase = game.phase as GamePhase;
        if (currentPhase === GamePhase.GAME_END) {
          const winner = game.getWinner();
          output.gameCompleteEvent = {
            type: GameEventType.GAME_COMPLETE,
            winnerId: winner?.id ?? '',
            finalScores: game.players.map((p) => ({ playerId: p.id, score: p.score })),
            timestamp,
          };
        }
      }
    }

    return output;
  }
}
