import {
  Game,
  GamePhase,
  GameEventType,
  CardNotPlayableError,
  type CardPlayedEvent,
  type TrickCompleteEvent,
  type TrickEffectResolvedEvent,
  type RoundCompleteEvent,
  type GameCompleteEvent,
  type ICard,
  type ICardDeclaration,
  type CardPhysicsState,
  type CustomSound,
} from '../../../domain';
import {
  buildEffectEvents,
  buildRoundEndEvents,
  buildTrickCompleteEvent,
} from './game-event-factory';

export interface PlayCardInput {
  game: Game;
  playerId: string;
  cardId: string;
  /** Choice for Cloud/Juggler (suit) or Shapeshifter (form); ignored for other cards. */
  declaration?: unknown;
  soundChoice?: string; // Sound to broadcast to all clients
  customAudio?: CustomSound; // Uploaded wizard/jester sound to broadcast to all clients
  physicsState?: CardPhysicsState; // Physics state for synchronized animations
}

export interface PlayCardOutput {
  cardPlayedEvent: CardPlayedEvent;
  trickCompleteEvent?: TrickCompleteEvent;
  /** Special-card effects that resolved on their own (e.g. a forced Cloud raise). */
  effectEvents: TrickEffectResolvedEvent[];
  /** True while a special-card effect waits for player input before play continues. */
  awaitingEffects: boolean;
  roundCompleteEvent?: RoundCompleteEvent;
  gameCompleteEvent?: GameCompleteEvent;
  card: ICard;
  previousPlayerIndex: number;
}

/**
 * Use case for playing a card: the game validates the play, the use case maps
 * the outcome (trick, effects, round and game completion) to events
 */
export class PlayCardUseCase {
  execute(input: PlayCardInput): PlayCardOutput {
    const { game, playerId, cardId, declaration, soundChoice, customAudio, physicsState } = input;

    // The aggregate enforces every rule (phase, turn, pending effects, legal card,
    // declaration) with typed errors; the use case orchestrates and maps events.
    const card = game.getPlayer(playerId)?.hand.find((c) => c.id === cardId)?.toJSON();
    const previousPlayerIndex = game.currentPlayerIndex;

    // Play the card
    const result = game.playCard(playerId, cardId, declaration);
    if (!card) {
      // Unreachable: the game only plays cards from the player's hand.
      throw new CardNotPlayableError(cardId);
    }
    const trick = result.trickComplete
      ? game.completedTricks[game.completedTricks.length - 1]
      : game.currentTrick;
    const playedDeclaration: ICardDeclaration | undefined = trick?.cards.find(
      (played) => played.card.id === cardId
    )?.declaration;

    const timestamp = Date.now();
    const output: PlayCardOutput = {
      cardPlayedEvent: {
        type: GameEventType.CARD_PLAYED,
        playerId,
        card,
        ...(playedDeclaration ? { declaration: playedDeclaration } : {}),
        nextPlayerId: game.phase === GamePhase.PLAYING && !game.hasPendingEffects()
          ? game.getCurrentPlayer().id
          : null,
        timestamp,
        soundChoice, // Pass through sound choice for all clients
        customAudio, // Pass through uploaded card audio for all clients
        physicsState, // Pass through physics state for synchronized animations
      },
      effectEvents: buildEffectEvents(result, timestamp),
      awaitingEffects: result.awaitingEffects ?? false,
      card,
      previousPlayerIndex,
    };

    output.trickCompleteEvent = buildTrickCompleteEvent(game, result, timestamp);
    if (result.roundComplete) {
      Object.assign(output, buildRoundEndEvents(game, timestamp));
    }

    return output;
  }
}
