import {
  Game,
  GamePhase,
  InvalidPhaseError,
  InvalidEffectResponseError,
  PlayerNotFoundError,
  parseEffectResponse,
  type GameCompleteEvent,
  type RoundCompleteEvent,
  type TrickEffectResolvedEvent,
} from '../../../domain';
import { buildEffectEvents, buildRoundEndEvents } from './game-event-factory';

export interface ResolveEffectInput {
  game: Game;
  playerId: string;
  /** Untrusted client payload; parsed into a TrickEffectResponse. */
  response: unknown;
}

export interface ResolveEffectOutput {
  effectEvents: TrickEffectResolvedEvent[];
  /** True while another effect (or other players) still need to answer. */
  awaitingEffects: boolean;
  roundCompleteEvent?: RoundCompleteEvent;
  gameCompleteEvent?: GameCompleteEvent;
}

/**
 * Use case for answering a special-card effect after a trick
 * (Juggler: pass a card left, Cloud: raise or lower the bid, Witch: swap with the trick)
 */
export class ResolveEffectUseCase {
  execute(input: ResolveEffectInput): ResolveEffectOutput {
    const { game, playerId } = input;

    if (game.phase !== GamePhase.PLAYING) {
      throw new InvalidPhaseError('PLAYING', game.phase);
    }
    if (!game.getPlayer(playerId)) {
      throw new PlayerNotFoundError(playerId);
    }

    const response = parseEffectResponse(input.response);
    if (!response) {
      throw new InvalidEffectResponseError('Invalid special card choice');
    }
    const error = game.getEffectResponseError(playerId, response);
    if (error) {
      throw new InvalidEffectResponseError(error);
    }

    const progress = game.resolveEffect(playerId, response);
    const timestamp = Date.now();
    return {
      effectEvents: buildEffectEvents(progress, timestamp),
      awaitingEffects: progress.awaitingEffects,
      ...(progress.roundComplete ? buildRoundEndEvents(game, timestamp) : {}),
    };
  }
}
