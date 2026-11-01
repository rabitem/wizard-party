import type { CardPhysicsState, CustomSound } from '@shared/domain';

/** Landing sound and throw trajectory a CARD_PLAYED carried for one card. */
export interface PlayedCardMetadata {
  soundChoice?: string;
  customAudio?: CustomSound;
  physicsState?: CardPhysicsState;
}

/**
 * Per-card bookkeeping for played cards, keyed by card id. Card ids repeat every
 * round, so every entry is pruned to the server's live trick and dropped once its
 * trick is collected.
 */
export interface PlayedCardRegistry {
  metadata: Map<string, PlayedCardMetadata>;
  /** Cards that fly in with physics; any other visible card is placed at rest. */
  animatedCardIds: Set<string>;
  /** Cards whose flight finished. Survives a reconnect so landed cards do not fly again. */
  landedCardIds: Set<string>;
  /**
   * Cards of the trick that was just collected. At ROUND_END the server's currentTrick is still
   * that finished trick, so snapshots keep listing it; these ids must not be queued to fly again.
   */
  collectedCardIds: Set<string>;
}

export function createPlayedCardRegistry(): PlayedCardRegistry {
  return {
    metadata: new Map(),
    animatedCardIds: new Set(),
    landedCardIds: new Set(),
    collectedCardIds: new Set(),
  };
}

/** A new play replaces whatever an earlier play of the same card id left behind. */
export function recordPlayedCard(
  registry: PlayedCardRegistry,
  cardId: string,
  metadata: PlayedCardMetadata
): void {
  registry.metadata.set(cardId, metadata);
  registry.animatedCardIds.add(cardId);
  registry.landedCardIds.delete(cardId);
}

export function markPlayedCardLanded(registry: PlayedCardRegistry, cardId: string): void {
  registry.landedCardIds.add(cardId);
}

/**
 * Cards the catch-up placed at rest without a flight: they render static from now on, also after
 * the next snapshot (a landed card is never queued to fly again).
 */
export function settlePlayedCardsAtRest(registry: PlayedCardRegistry, cardIds: string[]): void {
  for (const cardId of cardIds) {
    registry.animatedCardIds.delete(cardId);
    registry.landedCardIds.add(cardId);
  }
}

/**
 * Splits a snapshot's cards into cards that must fly and cards that already landed
 * before the scene was rebuilt (reconnect). Cards that are still tracked as animated
 * keep flying, so a live card is never swapped for a static one when it lands.
 */
export function trackSnapshotCards(registry: PlayedCardRegistry, cardIds: string[]): string[] {
  const landedCardIds: string[] = [];

  for (const cardId of cardIds) {
    if (registry.animatedCardIds.has(cardId)) continue;
    if (registry.landedCardIds.has(cardId)) {
      landedCardIds.push(cardId);
      continue;
    }
    registry.animatedCardIds.add(cardId);
  }

  return landedCardIds;
}

export function prunePlayedCardRegistry(
  registry: PlayedCardRegistry,
  keepCardIds: Set<string>
): boolean {
  let changed = false;
  const cardIds = new Set([
    ...registry.metadata.keys(),
    ...registry.animatedCardIds,
    ...registry.landedCardIds,
  ]);

  for (const cardId of cardIds) {
    if (keepCardIds.has(cardId)) continue;
    forgetCard(registry, cardId);
    changed = true;
  }

  return changed;
}

/** Drops one card's bookkeeping (a local play the server refused). */
export function forgetPlayedCard(registry: PlayedCardRegistry, cardId: string): void {
  forgetCard(registry, cardId);
}

function forgetCard(registry: PlayedCardRegistry, cardId: string): void {
  registry.metadata.delete(cardId);
  registry.animatedCardIds.delete(cardId);
  registry.landedCardIds.delete(cardId);
}

/** Drops the cards of a collected trick; cards of a later trick keep their metadata. */
export function forgetPlayedCards(registry: PlayedCardRegistry, cardIds: string[]): void {
  for (const cardId of cardIds) forgetCard(registry, cardId);
  registry.collectedCardIds = new Set(cardIds);
}

/**
 * The snapshot cards that are still live: a collected trick that the server keeps reporting as
 * its current trick (ROUND_END) is not played again. Once a snapshot shows a trick without those
 * cards (the next trick, or the next round, where card ids repeat), the memory is cleared.
 */
export function liveSnapshotCards(registry: PlayedCardRegistry, cardIds: string[]): string[] {
  if (registry.collectedCardIds.size === 0) return cardIds;
  const live = cardIds.filter((cardId) => !registry.collectedCardIds.has(cardId));
  if (live.length === cardIds.length) registry.collectedCardIds.clear();
  return live;
}

export function clearPlayedCardRegistry(registry: PlayedCardRegistry): void {
  registry.metadata.clear();
  registry.animatedCardIds.clear();
  registry.landedCardIds.clear();
  registry.collectedCardIds.clear();
}
