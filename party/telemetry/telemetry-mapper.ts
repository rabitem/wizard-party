import {
  GameEventType,
  TrickEffectKind,
  getStandings,
  type Game,
  type GameEvent,
  type ICard,
  type TrickCompleteEvent,
} from '../../shared/domain';
import {
  TELEMETRY_PAYLOAD_LIMITS,
  TelemetryEventType,
  boundedText,
  type TelemetryCard,
} from '../../shared/telemetry';
import { summarizeCustomAudio } from './sound-telemetry';
import { telemetryFact, type AnyTelemetryFact } from './telemetry-fact';

/**
 * Translates domain events into telemetry facts.
 *
 * Domain events are shaped for clients (sounds, physics, hidden information); telemetry facts are
 * shaped for analysis and replay. Mapping happens right after the use case ran, so `game` reflects
 * the state the event produced.
 */

interface MappingContext {
  game: Game;
  /** All domain events produced by the same operation (e.g. a card that also completes a trick). */
  batch: readonly GameEvent[];
}

type Mapper<E extends GameEvent> = (event: E, ctx: MappingContext) => AnyTelemetryFact | null;
type MapperRegistry = { [K in GameEventType]?: Mapper<Extract<GameEvent, { type: K }>> };

function toCard(card: ICard): TelemetryCard {
  return { id: card.id, type: card.type, suit: card.suit, value: card.value };
}

const MAPPERS: MapperRegistry = {
  [GameEventType.PLAYER_JOINED]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_JOINED, event.playerId, {
      playerId: event.playerId,
      name: event.playerName,
      isBot: event.isBot ?? false,
    }),

  [GameEventType.PLAYER_LEFT]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_LEFT, event.playerId, { playerId: event.playerId }),

  // A kicked player leaves the table like any other; replay only needs the departure.
  [GameEventType.PLAYER_KICKED]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_LEFT, event.playerId, { playerId: event.playerId }),

  [GameEventType.GAME_STARTED]: (_event, { game }) =>
    telemetryFact(TelemetryEventType.GAME_STARTED, game.hostId, {
      hostId: game.hostId,
      maxRounds: game.maxRounds,
      ruleset: game.rulesetConfig,
      players: game.players.map((player, seat) => ({
        playerId: player.id,
        name: player.name,
        isBot: player.isBot,
        botDifficulty: player.botDifficulty ?? null,
        seat,
      })),
    }),

  [GameEventType.TRUMP_REVEALED]: (event, { game }) =>
    telemetryFact(TelemetryEventType.ROUND_STARTED, null, {
      dealerId: game.getDealer().id,
      cardsPerPlayer: game.getCardsPerPlayerForCurrentRound(),
      trumpCard: event.trumpCard ? toCard(event.trumpCard) : null,
      trumpSuit: event.trumpSuit,
      dealerMustChoose: event.dealerMustChoose,
      hands: Object.fromEntries(game.players.map((player) => [player.id, player.hand.map((card) => card.id)])),
    }),

  [GameEventType.TRUMP_SELECTED]: (event, { game }) => {
    const chooserId = event.playerId ?? game.getDealer().id;
    return telemetryFact(TelemetryEventType.TRUMP_SELECTED, chooserId, { playerId: chooserId, suit: event.trumpSuit });
  },

  [GameEventType.BID_PLACED]: (event) =>
    telemetryFact(TelemetryEventType.BID_PLACED, event.playerId, { playerId: event.playerId, bid: event.bid }),

  [GameEventType.CARD_PLAYED]: (event, { game, batch }) => {
    const trickComplete = batch.find(
      (candidate): candidate is TrickCompleteEvent => candidate.type === GameEventType.TRICK_COMPLETE
    );
    // A completing card moves the trick into completedTricks; otherwise it is still the current trick.
    const trickNumber = trickComplete ? trickComplete.trickIndex + 1 : game.completedTricks.length + 1;
    const positionInTrick = trickComplete ? trickComplete.trickCards.length : (game.currentTrick?.cards.length ?? 1);
    return telemetryFact(TelemetryEventType.CARD_PLAYED, event.playerId, {
      playerId: event.playerId,
      card: toCard(event.card),
      trickNumber,
      positionInTrick,
    });
  },

  [GameEventType.TRICK_COMPLETE]: (event, { game }) => {
    const declarations = new Map(
      (game.completedTricks[event.trickIndex]?.cards ?? []).map((played) => [played.card.id, played.declaration])
    );
    return telemetryFact(TelemetryEventType.TRICK_COMPLETED, event.winnerId, {
      trickNumber: event.trickIndex + 1,
      winnerId: event.winnerId,
      voided: event.voided ?? false,
      cards: event.trickCards.map(({ playerId, card }) => {
        const declaration = declarations.get(card.id);
        return declaration ? { playerId, cardId: card.id, declaration } : { playerId, cardId: card.id };
      }),
    });
  },

  [GameEventType.TRICK_EFFECT_RESOLVED]: ({ outcome }) => {
    switch (outcome.kind) {
      case TrickEffectKind.ADJUST_BID:
        return telemetryFact(TelemetryEventType.TRICK_EFFECT_RESOLVED, outcome.playerId, {
          kind: outcome.kind,
          playerId: outcome.playerId,
          delta: outcome.delta,
          newBid: outcome.newBid,
        });
      case TrickEffectKind.SWAP_WITH_TRICK:
        return telemetryFact(TelemetryEventType.TRICK_EFFECT_RESOLVED, outcome.playerId, {
          kind: outcome.kind,
          playerId: outcome.playerId,
          givenCardId: outcome.givenCard.id,
          takenCardId: outcome.takenCard.id,
        });
      default:
        return telemetryFact(TelemetryEventType.TRICK_EFFECT_RESOLVED, null, { kind: outcome.kind, playerId: null });
    }
  },

  [GameEventType.ROUND_COMPLETE]: (event, { game }) =>
    telemetryFact(TelemetryEventType.ROUND_COMPLETED, null, {
      results: event.scores.map((score) => {
        const player = game.getPlayer(score.playerId);
        return {
          playerId: score.playerId,
          bid: player?.bid ?? null,
          tricksWon: player?.tricksWon ?? 0,
          roundScore: score.roundScore,
          totalScore: score.totalScore,
        };
      }),
    }),

  [GameEventType.GAME_COMPLETE]: (event) =>
    telemetryFact(TelemetryEventType.GAME_COMPLETED, event.winnerId, {
      winnerId: event.winnerId,
      // Filled in by the recorder, which knows when the game started.
      durationMs: 0,
      // The domain's competition ranking (ties share a rank), as everywhere else.
      standings: event.standings ?? getStandings(
        event.finalScores.map((entry) => ({ id: entry.playerId, score: entry.score }))
      ),
    }),

  [GameEventType.GAME_PAUSED]: (event) =>
    telemetryFact(TelemetryEventType.GAME_PAUSED, event.pausedForPlayerId, {
      pausedForPlayerId: event.pausedForPlayerId,
      reason: event.reason,
      timeoutMs: event.timeoutDuration,
    }),

  [GameEventType.GAME_RESUMED]: (event) =>
    telemetryFact(TelemetryEventType.GAME_RESUMED, event.resumedPlayerId, { playerId: event.resumedPlayerId }),

  [GameEventType.TURN_TIMER_EXPIRED]: (event, { game }) =>
    telemetryFact(TelemetryEventType.TURN_TIMER_EXPIRED, event.playerId, {
      playerId: event.playerId,
      phase: game.phase,
      sequence: event.sequence,
    }),

  // The text is bounded and kept for 30 days (privacy policy); the fact that a message was sent is kept.
  [GameEventType.CHAT_MESSAGE]: (event) =>
    telemetryFact(TelemetryEventType.CHAT_SENT, event.playerId, {
      playerId: event.playerId,
      message: boundedText(event.message, TELEMETRY_PAYLOAD_LIMITS.MAX_CHAT_MESSAGE_LENGTH) ?? '',
      length: event.message.length,
    }),

  [GameEventType.EMOTE]: (event) =>
    telemetryFact(TelemetryEventType.EMOTE_SENT, event.playerId, {
      playerId: event.playerId,
      // Emote ids are not validated by the domain, so they are bounded here.
      emoteId: boundedText(event.emoteId, TELEMETRY_PAYLOAD_LIMITS.MAX_SHORT_TEXT_LENGTH) ?? '',
    }),

  [GameEventType.TIMEOUT_SOUND_PLAYED]: (event) =>
    telemetryFact(TelemetryEventType.TIMEOUT_SOUND_PLAYED, event.senderPlayerId, {
      senderPlayerId: event.senderPlayerId,
      targetPlayerId: event.targetPlayerId,
      soundName: event.soundName ?? null,
      customAudio: event.customAudio ? summarizeCustomAudio(event.customAudio) : null,
    }),

  [GameEventType.PLAYER_GRACED]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_GRACED, event.playerId, {
      playerId: event.playerId,
      graceDurationMs: event.graceDuration,
      wasHost: event.wasHost,
    }),

  [GameEventType.PLAYER_GRACE_EXPIRED]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_GRACE_EXPIRED, event.playerId, {
      playerId: event.playerId,
      newHostId: event.newHostId ?? null,
    }),

  [GameEventType.PLAYER_GRACE_RESTORED]: (event) =>
    telemetryFact(TelemetryEventType.PLAYER_GRACE_RESTORED, event.playerId, {
      playerId: event.playerId,
      isHost: event.isHost,
    }),

  // REMATCH_REQUESTED has no producer in the domain; requests are recorded by handleRequestRematch.

  // `game` is the fresh lobby the rematch created.
  [GameEventType.REMATCH_STARTED]: (_event, { game }) =>
    telemetryFact(TelemetryEventType.REMATCH_STARTED, game.hostId, {
      hostId: game.hostId,
      playerIds: game.players.map((player) => player.id),
    }),
};

/** Causal order of events that a single operation can emit together. */
const EVENT_ORDER: readonly GameEventType[] = [
  GameEventType.PLAYER_JOINED,
  GameEventType.GAME_STARTED,
  GameEventType.TRUMP_REVEALED,
  GameEventType.TRUMP_SELECTED,
  GameEventType.BID_PLACED,
  GameEventType.CARD_PLAYED,
  GameEventType.TRICK_COMPLETE,
  GameEventType.TRICK_EFFECT_RESOLVED,
  GameEventType.ROUND_COMPLETE,
  GameEventType.GAME_COMPLETE,
  GameEventType.TURN_TIMER_EXPIRED,
  GameEventType.PLAYER_GRACED,
  GameEventType.PLAYER_GRACE_RESTORED,
  GameEventType.PLAYER_GRACE_EXPIRED,
  GameEventType.PLAYER_LEFT,
  GameEventType.PLAYER_KICKED,
  GameEventType.GAME_PAUSED,
  GameEventType.GAME_RESUMED,
];

function orderOf(event: GameEvent): number {
  const index = EVENT_ORDER.indexOf(event.type);
  return index === -1 ? EVENT_ORDER.length : index;
}

export function mapDomainEvents(events: readonly GameEvent[], game: Game): AnyTelemetryFact[] {
  const batch = [...events].sort((a, b) => orderOf(a) - orderOf(b));
  const result: AnyTelemetryFact[] = [];
  for (const event of batch) {
    const mapper = MAPPERS[event.type] as Mapper<GameEvent> | undefined;
    const telemetryEvent = mapper?.(event, { game, batch });
    if (telemetryEvent) result.push(telemetryEvent);
  }
  return result;
}

const GAME_EVENT_TYPES = new Set<string>(Object.values(GameEventType));

export function isGameEvent(value: unknown): value is GameEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    GAME_EVENT_TYPES.has((value as { type: string }).type)
  );
}
