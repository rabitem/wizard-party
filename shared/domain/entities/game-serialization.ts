/**
 * Game serialization: the Game aggregate <-> IGameState (wire and storage format).
 *
 * Both directions copy every array and nested object, so a snapshot never aliases
 * live game state (an event or telemetry record holding a snapshot cannot see
 * later moves) and restoring never shares the stored object. A round trip keeps
 * everything: bot difficulties, ruleset, expansion state, pending effects, timers.
 */

import { Card, type ICard } from './card';
import { Player } from './player';
import { Trick } from './trick';
import type { GameCore } from './game-core';
import type { IExpansionRoundState, IGameState, IGraceState } from './game.types';
import { ensureRulesetConfig } from '../value-objects/ruleset-config';
import { GamePhase } from '../value-objects/game-phase';
import type { PendingTrickEffect } from '../expansions/trick-effects';

function copyCard(card: ICard): ICard {
  return { ...card };
}

function copyExpansionState(state: IExpansionRoundState | null | undefined): IExpansionRoundState | null {
  if (!state) return null;
  return {
    copySource: state.copySource ? copyCard(state.copySource) : null,
    setAsideCards: state.setAsideCards.map(copyCard),
    werewolfSwap: state.werewolfSwap
      ? { ...state.werewolfSwap, takenCard: copyCard(state.werewolfSwap.takenCard) }
      : null,
  };
}

/** Pending effects are plain JSON data (ids, suits, selections): a deep copy is exact. */
function copyPendingEffects(effects: readonly PendingTrickEffect[] | undefined): PendingTrickEffect[] {
  return effects ? (JSON.parse(JSON.stringify(effects)) as PendingTrickEffect[]) : [];
}

function copyGraceStates(states: Iterable<[string, IGraceState]>): [string, IGraceState][] {
  return Array.from(states, ([id, state]) => [id, { ...state }]);
}

/** Fields computed from the game rather than stored in it. */
export interface DerivedGameFields {
  bidsPlaced: number;
  forbiddenBid: number | null;
}

export function serializeGame(game: GameCore, derived: DerivedGameFields): IGameState {
  return {
    id: game.id,
    phase: game.phase,
    players: game.players.map((p) => p.toJSON()),
    currentRound: game.currentRound,
    maxRounds: game.maxRounds,
    trumpSuit: game.trumpSuit,
    trumpCard: game.trumpCard?.toJSON() ?? null,
    currentPlayerIndex: game.currentPlayerIndex,
    dealerIndex: game.dealerIndex,
    currentTrick: game.currentTrick?.toJSON() ?? null,
    completedTricks: game.completedTricks.map((t) => t.toJSON()),
    bidsPlaced: derived.bidsPlaced,
    hostId: game.hostId,
    forbiddenBid: derived.forbiddenBid,
    trumpChoice: game.trumpChoice ? { ...game.trumpChoice } : null,
    expansionState: copyExpansionState(game.expansionState),
    pendingEffects: copyPendingEffects(game.pendingEffects),
    rulesetConfig: ensureRulesetConfig(game.rulesetConfig),
    pauseState: game.pauseState ? { ...game.pauseState } : null,
    roundEndedAt: game.roundEndedAt,
    turnTimerState: game.turnTimerState ? { ...game.turnTimerState } : null,
    graceStates: copyGraceStates(game.graceStates.entries()),
    kickedPlayerIds: Array.from(game.kickedPlayerIds),
  };
}

/**
 * Load a stored state into a freshly constructed game.
 */
export function restoreGame(game: GameCore, data: IGameState): void {
  // Rooms saved before the pause became orthogonal stored a paused game as phase PAUSED.
  game.phase = data.phase === GamePhase.PAUSED ? data.pauseState?.previousPhase ?? GamePhase.LOBBY : data.phase;
  game.players = data.players.map((p) => Player.fromJSON(p));
  game.currentRound = data.currentRound;
  game.maxRounds = data.maxRounds;
  game.trumpSuit = data.trumpSuit;
  game.trumpCard = data.trumpCard ? Card.fromJSON(data.trumpCard) : null;
  game.trumpChoice = data.trumpChoice ? { ...data.trumpChoice } : null;
  game.expansionState = copyExpansionState(data.expansionState);
  game.pendingEffects = copyPendingEffects(data.pendingEffects);
  game.currentPlayerIndex = data.currentPlayerIndex;
  game.dealerIndex = data.dealerIndex;
  const context = game.getRoundContext();
  game.currentTrick = data.currentTrick ? Trick.fromJSON(data.currentTrick, data.trumpSuit, context) : null;
  game.completedTricks = data.completedTricks.map((t) => Trick.fromJSON(t, data.trumpSuit, context));
  game.rulesetConfig = ensureRulesetConfig(data.rulesetConfig);
  game.pauseState = data.pauseState ? { ...data.pauseState } : null;
  game.roundEndedAt = data.roundEndedAt ?? null;
  game.restoreTurnTimerState(data.turnTimerState);
  game.graceStates = new Map(copyGraceStates(data.graceStates ?? []));
  game.kickedPlayerIds = new Set(data.kickedPlayerIds ?? []);
}
