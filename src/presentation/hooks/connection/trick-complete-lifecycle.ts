import type { ICard, IGameState } from '@shared/domain';
import type { PreservedTrick } from './types';

export interface TrickCompleteCardRef {
  playerId: string;
  card: Pick<ICard, 'id'>;
}

export interface TrickCompleteLifecycle {
  processedKeys: Set<string>;
}

export function createTrickCompleteLifecycle(): TrickCompleteLifecycle {
  return {
    processedKeys: new Set(),
  };
}

export function resetTrickCompleteLifecycle(lifecycle: TrickCompleteLifecycle): void {
  lifecycle.processedKeys.clear();
}

export function markTrickCompleteProcessed(
  lifecycle: TrickCompleteLifecycle,
  trickCompleteKey: string
): boolean {
  if (lifecycle.processedKeys.has(trickCompleteKey)) return false;

  lifecycle.processedKeys.add(trickCompleteKey);
  return true;
}

export function buildTrickCompleteKey(
  winnerId: string,
  trickCards: TrickCompleteCardRef[] | undefined,
  trickIndex?: number | null,
  currentRound?: number | null,
  timestamp?: number | null
): string {
  const roundKey = typeof currentRound === 'number' ? `round-${currentRound}` : 'round-unknown';

  if (typeof trickIndex === 'number') {
    return `${roundKey}:${winnerId}:trick-${trickIndex}`;
  }

  const cardKey = (trickCards ?? [])
    .map((played) => played.card.id)
    .sort()
    .join('|');

  if (cardKey) {
    return `${roundKey}:${winnerId}:cards-${cardKey}`;
  }

  const eventKey = typeof timestamp === 'number' ? `event-${timestamp}` : 'event-unknown';
  return `${roundKey}:${winnerId}:${eventKey}`;
}

export interface DeferredTrickComplete<T> {
  key: string;
  params: T;
}

/**
 * Holds a TRICK_COMPLETE that arrived while another trick is still landing or being
 * collected, so it starts after that collection instead of overwriting it. Returns
 * false for a duplicate of the active or an already deferred trick.
 */
export function deferTrickComplete<T>(
  lifecycle: TrickCompleteLifecycle,
  queue: DeferredTrickComplete<T>[],
  key: string,
  params: T
): boolean {
  if (lifecycle.processedKeys.has(key)) return false;
  if (queue.some((deferred) => deferred.key === key)) return false;

  queue.push({ key, params });
  return true;
}

export interface ResolveTrickCompleteSnapshotParams {
  trickCards: { playerId: string; card: ICard }[] | undefined;
  currentState: IGameState | null;
  existingPreserved: PreservedTrick | null;
  winnerId: string;
}

function clonePreservedTrick(trick: PreservedTrick, winnerId: string): PreservedTrick {
  return {
    cards: [...trick.cards],
    leadSuit: trick.leadSuit,
    winnerId,
  };
}

/**
 * The trick to freeze on the table for a TRICK_COMPLETE: the most complete of the event's cards,
 * the server's current trick and the trick already frozen.
 */
export function resolveTrickCompleteSnapshot({
  trickCards,
  currentState,
  existingPreserved,
  winnerId,
}: ResolveTrickCompleteSnapshotParams): PreservedTrick | null {
  const candidates: PreservedTrick[] = [];

  if (trickCards && trickCards.length > 0) {
    candidates.push({ cards: [...trickCards], leadSuit: null, winnerId });
  }

  if (currentState?.currentTrick && currentState.currentTrick.cards.length > 0) {
    candidates.push({
      cards: [...currentState.currentTrick.cards],
      leadSuit: currentState.currentTrick.leadSuit,
      winnerId,
    });
  }

  if (existingPreserved) {
    candidates.push(clonePreservedTrick(existingPreserved, winnerId));
  }

  return selectMostCompleteTrick(candidates);
}

function snapshotTrickFromState(state: IGameState): PreservedTrick | null {
  if (!state.currentTrick?.cards || state.currentTrick.cards.length === 0) return null;

  return {
    cards: [...state.currentTrick.cards],
    leadSuit: state.currentTrick.leadSuit,
    winnerId: state.currentTrick.winnerId,
  };
}

function snapshotLatestCompletedTrickFromState(
  state: IGameState,
  activeTrickWinnerId?: string | null
): PreservedTrick | null {
  const completedTricks = state.completedTricks ?? [];

  for (let index = completedTricks.length - 1; index >= 0; index -= 1) {
    const trick = completedTricks[index];
    if (!trick?.cards || trick.cards.length === 0) continue;
    if (activeTrickWinnerId && trick.winnerId && trick.winnerId !== activeTrickWinnerId) continue;

    return {
      cards: [...trick.cards],
      leadSuit: trick.leadSuit,
      winnerId: trick.winnerId ?? activeTrickWinnerId ?? null,
    };
  }

  return null;
}

function selectMostCompleteTrick(
  candidates: Array<PreservedTrick | null | undefined>
): PreservedTrick | null {
  return candidates.reduce<PreservedTrick | null>((best, candidate) => {
    if (!candidate) return best;
    if (!best) return candidate;
    return candidate.cards.length > best.cards.length ? candidate : best;
  }, null);
}

export interface ResolveTrickGameStateUpdateParams {
  newState: IGameState;
  existingPreserved: PreservedTrick | null;
  shouldPreserveTrick: boolean;
  hasPendingOrActiveResult: boolean;
  activeTrickWinnerId?: string | null;
}

export function resolveTrickGameStateUpdate({
  newState,
  existingPreserved,
  shouldPreserveTrick,
  hasPendingOrActiveResult,
  activeTrickWinnerId,
}: ResolveTrickGameStateUpdateParams): PreservedTrick | null {
  const shouldFreezeSnapshot = shouldPreserveTrick || hasPendingOrActiveResult;
  const incomingCurrentSnapshot = snapshotTrickFromState(newState);
  const incomingCompletedSnapshot = shouldFreezeSnapshot
    ? snapshotLatestCompletedTrickFromState(newState, activeTrickWinnerId)
    : null;
  const recoveredSnapshot = selectMostCompleteTrick([
    existingPreserved,
    incomingCompletedSnapshot,
  ]);
  const incomingSnapshot = recoveredSnapshot ?? incomingCompletedSnapshot ?? incomingCurrentSnapshot;
  return shouldFreezeSnapshot ? incomingSnapshot : incomingCurrentSnapshot ?? existingPreserved;
}
