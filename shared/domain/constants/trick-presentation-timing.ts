/**
 * How long a client takes to present a completed trick: its last card lands, then the winner
 * collects the cards (in the slowest collection style). Shared by the client's animations and the
 * game server, so the room never moves on while a table still shows the trick: no bot leads the
 * next one and no round is advanced on the host's behalf before it is collected.
 */
export const TRICK_PRESENTATION_TIMING = {
  /** The longest flight of a played card. */
  CARD_FLIGHT_MS: 1_000,
  /** Gathering, hovering, the first card's flight to the winner's deck and its settle. */
  COLLECTION_BASE_MS: 1_400,
  /** Every further card of the trick takes off one flight slot later. */
  COLLECTION_PER_CARD_MS: 650,
} as const;

/** How long a table presents a completed trick of `cardCount` cards, from its last card played. */
export function getTrickPresentationMs(cardCount: number): number {
  const { CARD_FLIGHT_MS, COLLECTION_BASE_MS, COLLECTION_PER_CARD_MS } = TRICK_PRESENTATION_TIMING;
  return CARD_FLIGHT_MS + COLLECTION_BASE_MS + Math.max(0, cardCount - 1) * COLLECTION_PER_CARD_MS;
}
