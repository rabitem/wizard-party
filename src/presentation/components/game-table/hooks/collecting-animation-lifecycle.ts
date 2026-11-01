import type { ICard } from '@shared/domain';

export interface CollectingCardRef {
  playerId: string;
  card: Pick<ICard, 'id'>;
}

export interface CollectingCompletionLifecycle {
  expectedCardIds: Set<string>;
  completedCardIds: Set<string>;
  completedAnimationKey: string | null;
  animationKey: string;
}

export function buildCollectingAnimationKey(
  winnerId: string | null | undefined,
  cards: CollectingCardRef[] | null | undefined
): string | null {
  if (!winnerId || !cards) return null;

  const cardKey = cards
    .map((entry) => entry.card.id)
    .sort()
    .join('|');

  return `${winnerId}:${cardKey}`;
}

function hasCompletedAllExpectedCards(lifecycle: CollectingCompletionLifecycle): boolean {
  if (lifecycle.expectedCardIds.size === 0) return false;

  for (const cardId of lifecycle.expectedCardIds) {
    if (!lifecycle.completedCardIds.has(cardId)) return false;
  }

  return true;
}

export function createCollectingCompletionLifecycle(): CollectingCompletionLifecycle {
  return {
    expectedCardIds: new Set(),
    completedCardIds: new Set(),
    completedAnimationKey: null,
    animationKey: '',
  };
}

export function resetCollectingCompletion(lifecycle: CollectingCompletionLifecycle): void {
  lifecycle.expectedCardIds.clear();
  lifecycle.completedCardIds.clear();
  lifecycle.completedAnimationKey = null;
  lifecycle.animationKey = '';
}

export function startCollectingCompletion(
  lifecycle: CollectingCompletionLifecycle,
  animationKey: string,
  cardIds: string[]
): void {
  if (animationKey === lifecycle.animationKey) return;

  lifecycle.expectedCardIds = new Set(cardIds);
  lifecycle.completedCardIds = new Set();
  lifecycle.completedAnimationKey = null;
  lifecycle.animationKey = animationKey;
}

export function isCollectingCompletionPending(lifecycle: CollectingCompletionLifecycle): boolean {
  return lifecycle.expectedCardIds.size > 0 && lifecycle.completedAnimationKey !== lifecycle.animationKey;
}

export function markCollectingCardComplete(
  lifecycle: CollectingCompletionLifecycle,
  cardId: string
): boolean {
  if (!lifecycle.expectedCardIds.has(cardId)) return false;
  if (lifecycle.completedAnimationKey === lifecycle.animationKey) return false;

  lifecycle.completedCardIds.add(cardId);

  if (!hasCompletedAllExpectedCards(lifecycle)) return false;

  lifecycle.completedAnimationKey = lifecycle.animationKey;
  return true;
}
