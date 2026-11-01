/**
 * Game Event Factory
 *
 * Builds the events several use cases emit for the same state transition (a trump
 * reveal, a completed trick, resolved special-card effects, the end of a round), so
 * every path reports them identically.
 */

import {
  Game,
  GamePhase,
  GameEventType,
  type EffectProgress,
  type GameCompleteEvent,
  type PlayCardResult,
  type RoundCompleteEvent,
  type TrickCompleteEvent,
  type TrickEffectResolvedEvent,
  type TrumpRevealedEvent,
} from '../../../domain';

export interface RoundEndEvents {
  roundCompleteEvent?: RoundCompleteEvent;
  gameCompleteEvent?: GameCompleteEvent;
}

export function buildTrumpRevealedEvent(game: Game, timestamp: number): TrumpRevealedEvent {
  const choosesTrump = game.phase === GamePhase.TRUMP_SELECTION;
  return {
    type: GameEventType.TRUMP_REVEALED,
    trumpCard: game.trumpCard?.toJSON() ?? null,
    trumpSuit: game.trumpSuit,
    dealerMustChoose: choosesTrump,
    trumpChooserId: choosesTrump ? game.getTrumpChooser()?.id ?? null : null,
    timestamp,
  };
}

/**
 * Event for the most recently completed trick
 */
export function buildTrickCompleteEvent(
  game: Game,
  result: PlayCardResult,
  timestamp: number
): TrickCompleteEvent | undefined {
  const completedTrick = game.completedTricks[game.completedTricks.length - 1];
  if (!result.trickComplete || !result.trick || !completedTrick) return undefined;

  return {
    type: GameEventType.TRICK_COMPLETE,
    // A voided trick still travels to the player who leads next.
    winnerId: result.trick.winnerId ?? result.trick.leaderId,
    ...(result.trick.voided ? { voided: true } : {}),
    trickIndex: game.completedTricks.length - 1,
    trickCards: completedTrick.cards.map((pc) => ({ playerId: pc.playerId, card: pc.card })),
    timestamp,
  };
}

export function buildEffectEvents(
  progress: Partial<EffectProgress>,
  timestamp: number
): TrickEffectResolvedEvent[] {
  return (progress.effectOutcomes ?? []).map((outcome) => ({
    type: GameEventType.TRICK_EFFECT_RESOLVED,
    outcome,
    timestamp,
  }));
}

export function buildRoundEndEvents(game: Game, timestamp: number): RoundEndEvents {
  const roundCompleteEvent: RoundCompleteEvent = {
    type: GameEventType.ROUND_COMPLETE,
    scores: game.players.map((p) => {
      const latestRound = p.roundHistory[p.roundHistory.length - 1];
      return {
        playerId: p.id,
        roundScore: latestRound?.score ?? 0,
        totalScore: p.score,
      };
    }),
    timestamp,
  };

  if (game.phase !== GamePhase.GAME_END) return { roundCompleteEvent };

  const winnerIds = game.getWinnerIds();
  return {
    roundCompleteEvent,
    gameCompleteEvent: {
      type: GameEventType.GAME_COMPLETE,
      winnerId: winnerIds[0] ?? '',
      winnerIds,
      standings: game.getStandings(),
      finalScores: game.players.map((p) => ({ playerId: p.id, score: p.score })),
      timestamp,
    },
  };
}
