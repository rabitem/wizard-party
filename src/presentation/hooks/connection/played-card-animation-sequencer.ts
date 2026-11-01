/**
 * Serialises played-card flights so opponents' cards land one after another.
 *
 * A live CARD_PLAYED only announces a card. The GAME_STATE snapshot that follows
 * it is authoritative for trick order, so cards are queued and released from the
 * snapshot. The one exception is the local player's own card: it answers the
 * player's input and is released at once, even while an opponent card is flying.
 * A backlog of waiting cards is fast-forwarded (placed at rest) instead of being
 * flown one by one at live pace.
 */
export interface PlayedCardAnimationSequencer {
  visibleCardIds: Set<string>;
  animatingCardIds: Set<string>;
  pendingCardIds: string[];
  activeCardId: string | null;
}

export interface PlayedCardEnqueueOptions {
  /** Release now (the local player's own card) instead of waiting for the snapshot. */
  immediate?: boolean;
}

export interface PlayedCardReplayResult {
  /** Cards from the snapshot that were not known to the sequencer before. */
  queuedCount: number;
  releasedCardId: string | null;
  /** Backlog cards placed at rest instead of flying (catch-up), oldest first. */
  restedCardIds: string[];
}

export interface PlayedCardReplayOptions {
  /**
   * Flights shown at live pace (the active one included). Older waiting cards beyond it land at
   * rest at once, so a backlog (a reconnect, a stall, a burst of bot moves) never makes the table
   * lag seconds behind the game. Unlimited by default.
   */
  maxBacklog?: number;
}

export function createPlayedCardAnimationSequencer(): PlayedCardAnimationSequencer {
  return {
    visibleCardIds: new Set(),
    animatingCardIds: new Set(),
    pendingCardIds: [],
    activeCardId: null,
  };
}

function isShownCard(sequencer: PlayedCardAnimationSequencer, cardId: string): boolean {
  return sequencer.visibleCardIds.has(cardId) || sequencer.animatingCardIds.has(cardId);
}

function hasSeenCard(sequencer: PlayedCardAnimationSequencer, cardId: string): boolean {
  return isShownCard(sequencer, cardId) || sequencer.pendingCardIds.includes(cardId);
}

function showCard(sequencer: PlayedCardAnimationSequencer, cardId: string): void {
  sequencer.visibleCardIds.add(cardId);
  sequencer.animatingCardIds.add(cardId);
}

function releaseNextPlayedCardAnimation(sequencer: PlayedCardAnimationSequencer): string | null {
  if (sequencer.activeCardId) return null;

  const nextCardId = sequencer.pendingCardIds.shift();
  if (!nextCardId) return null;

  sequencer.activeCardId = nextCardId;
  showCard(sequencer, nextCardId);
  return nextCardId;
}

function releaseImmediately(sequencer: PlayedCardAnimationSequencer, cardId: string): string | null {
  if (isShownCard(sequencer, cardId)) return null;

  sequencer.pendingCardIds = sequencer.pendingCardIds.filter((id) => id !== cardId);
  // Idle queue: take the active slot so the next opponent card still waits for this flight.
  // Busy queue: fly alongside the active card without taking its slot.
  if (!sequencer.activeCardId) sequencer.activeCardId = cardId;
  showCard(sequencer, cardId);
  return cardId;
}

/** Live CARD_PLAYED. Returns the card id when it became visible right away. */
export function enqueuePlayedCardAnimation(
  sequencer: PlayedCardAnimationSequencer,
  cardId: string,
  { immediate = false }: PlayedCardEnqueueOptions = {}
): string | null {
  if (immediate) return releaseImmediately(sequencer, cardId);
  if (hasSeenCard(sequencer, cardId)) return null;

  sequencer.pendingCardIds.push(cardId);
  return null;
}

/**
 * Places the oldest waiting cards at rest (visible, no flight) until at most `maxBacklog` flights
 * remain, the active one included. Returns the cards placed, oldest first. Waiting cards always
 * precede a card the local player plays now, so that play first fast-forwards them all
 * (`maxBacklog` 0): the player's card never lands before the cards it follows.
 */
export function fastForwardPlayedCardBacklog(
  sequencer: PlayedCardAnimationSequencer,
  maxBacklog: number
): string[] {
  const budget = Math.max(0, maxBacklog - (sequencer.activeCardId ? 1 : 0));
  const excess = sequencer.pendingCardIds.length - budget;
  if (excess <= 0) return [];
  const rested = sequencer.pendingCardIds.slice(0, excess);
  sequencer.pendingCardIds = sequencer.pendingCardIds.slice(excess);
  for (const cardId of rested) sequencer.visibleCardIds.add(cardId);
  return rested;
}

/**
 * Snapshot of the current trick, in trick order. Rebuilds the pending queue in that
 * order (cards announced live may have arrived before earlier cards were known),
 * fast-forwards a backlog beyond `maxBacklog` and releases the next card.
 */
export function enqueuePlayedCardAnimations(
  sequencer: PlayedCardAnimationSequencer,
  cardIds: string[],
  { maxBacklog = Number.POSITIVE_INFINITY }: PlayedCardReplayOptions = {}
): PlayedCardReplayResult {
  const snapshotCardIds = new Set(cardIds);
  const queuedCount = cardIds.filter((cardId) => !hasSeenCard(sequencer, cardId)).length;
  const orderedPending = cardIds.filter((cardId) => !isShownCard(sequencer, cardId));
  const otherPending = sequencer.pendingCardIds.filter((cardId) => !snapshotCardIds.has(cardId));

  sequencer.pendingCardIds = [...orderedPending, ...otherPending];
  const restedCardIds = fastForwardPlayedCardBacklog(sequencer, maxBacklog);
  return { queuedCount, releasedCardId: releaseNextPlayedCardAnimation(sequencer), restedCardIds };
}

/** Shows cards that already landed before the scene was rebuilt, without queueing a flight. */
export function markPlayedCardsVisible(
  sequencer: PlayedCardAnimationSequencer,
  cardIds: string[]
): boolean {
  let changed = false;

  for (const cardId of cardIds) {
    if (sequencer.visibleCardIds.has(cardId)) continue;
    sequencer.visibleCardIds.add(cardId);
    sequencer.pendingCardIds = sequencer.pendingCardIds.filter((id) => id !== cardId);
    changed = true;
  }

  return changed;
}

export function completePlayedCardAnimation(
  sequencer: PlayedCardAnimationSequencer,
  cardId: string
): string | null {
  sequencer.visibleCardIds.add(cardId);

  if (sequencer.activeCardId === cardId) {
    sequencer.activeCardId = null;
  }

  return releaseNextPlayedCardAnimation(sequencer);
}

/** Drops every card that is not in the displayed trick. The snapshot enqueue releases next. */
export function syncPlayedCardAnimationSequencerToCurrentCards(
  sequencer: PlayedCardAnimationSequencer,
  currentCardIds: string[]
): boolean {
  const currentCards = new Set(currentCardIds);
  let changed = false;

  for (const cardId of [...sequencer.visibleCardIds]) {
    if (currentCards.has(cardId)) continue;
    sequencer.visibleCardIds.delete(cardId);
    changed = true;
  }

  for (const cardId of [...sequencer.animatingCardIds]) {
    if (currentCards.has(cardId)) continue;
    sequencer.animatingCardIds.delete(cardId);
    changed = true;
  }

  const pendingCardIds = sequencer.pendingCardIds.filter((cardId) => currentCards.has(cardId));
  if (pendingCardIds.length !== sequencer.pendingCardIds.length) {
    sequencer.pendingCardIds = pendingCardIds;
    changed = true;
  }

  if (sequencer.activeCardId && !currentCards.has(sequencer.activeCardId)) {
    sequencer.activeCardId = null;
    changed = true;
  }

  return changed;
}

/** Takes a card off the table (a local play the server refused); its slot goes to the next card. */
export function withdrawPlayedCard(
  sequencer: PlayedCardAnimationSequencer,
  cardId: string
): string | null {
  sequencer.visibleCardIds.delete(cardId);
  sequencer.animatingCardIds.delete(cardId);
  sequencer.pendingCardIds = sequencer.pendingCardIds.filter((id) => id !== cardId);
  if (sequencer.activeCardId !== cardId) return null;
  sequencer.activeCardId = null;
  return releaseNextPlayedCardAnimation(sequencer);
}

export function resetPlayedCardAnimationSequencer(
  sequencer: PlayedCardAnimationSequencer
): void {
  sequencer.visibleCardIds.clear();
  sequencer.animatingCardIds.clear();
  sequencer.pendingCardIds = [];
  sequencer.activeCardId = null;
}
