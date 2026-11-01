export interface CardLandingLifecycle {
  expectedCardIds: Set<string>;
  landedCardIds: Set<string>;
  completedCardSetKey: string | null;
  cardSetKey: string;
}

export function createCardLandingLifecycle(): CardLandingLifecycle {
  return {
    expectedCardIds: new Set(),
    landedCardIds: new Set(),
    completedCardSetKey: null,
    cardSetKey: '',
  };
}

function buildCardSetKey(cardIds: Iterable<string>): string {
  return [...cardIds].sort().join('|');
}

function hasAllExpectedCardsLanded(lifecycle: CardLandingLifecycle): boolean {
  if (lifecycle.expectedCardIds.size === 0) return false;

  for (const cardId of lifecycle.expectedCardIds) {
    if (!lifecycle.landedCardIds.has(cardId)) return false;
  }

  return true;
}

function maybeNotifyAllLanded(
  lifecycle: CardLandingLifecycle,
  isWaitingForCardsToLand: boolean
): boolean {
  if (!isWaitingForCardsToLand) return false;
  if (lifecycle.completedCardSetKey === lifecycle.cardSetKey) return false;
  if (!hasAllExpectedCardsLanded(lifecycle)) return false;

  lifecycle.completedCardSetKey = lifecycle.cardSetKey;
  return true;
}

function isStrictSubsetOfExpected(
  cardIds: string[],
  expectedCardIds: Set<string>
): boolean {
  if (cardIds.length >= expectedCardIds.size) return false;
  if (expectedCardIds.size === 0) return false;

  return cardIds.every((cardId) => expectedCardIds.has(cardId));
}

export function syncExpectedCards(
  lifecycle: CardLandingLifecycle,
  cardIds: string[],
  isWaitingForCardsToLand: boolean
): boolean {
  if (isWaitingForCardsToLand && isStrictSubsetOfExpected(cardIds, lifecycle.expectedCardIds)) {
    return maybeNotifyAllLanded(lifecycle, isWaitingForCardsToLand);
  }

  const nextKey = buildCardSetKey(cardIds);

  if (nextKey !== lifecycle.cardSetKey) {
    lifecycle.cardSetKey = nextKey;
    lifecycle.expectedCardIds = new Set(cardIds);
    lifecycle.landedCardIds = new Set(
      [...lifecycle.landedCardIds].filter((cardId) => lifecycle.expectedCardIds.has(cardId))
    );
    lifecycle.completedCardSetKey = null;
  }

  if (cardIds.length === 0 && !isWaitingForCardsToLand) {
    lifecycle.expectedCardIds.clear();
    lifecycle.landedCardIds.clear();
    lifecycle.completedCardSetKey = null;
    lifecycle.cardSetKey = '';
  }

  return maybeNotifyAllLanded(lifecycle, isWaitingForCardsToLand);
}

export function markCardLanded(
  lifecycle: CardLandingLifecycle,
  cardId: string,
  isWaitingForCardsToLand: boolean
): boolean {
  lifecycle.landedCardIds.add(cardId);

  return maybeNotifyAllLanded(lifecycle, isWaitingForCardsToLand);
}

export function markCardsAlreadyLanded(
  lifecycle: CardLandingLifecycle,
  cardIds: string[],
  isWaitingForCardsToLand: boolean
): boolean {
  let shouldNotify = false;

  for (const cardId of cardIds) {
    shouldNotify = markCardLanded(lifecycle, cardId, isWaitingForCardsToLand) || shouldNotify;
  }

  return shouldNotify;
}
