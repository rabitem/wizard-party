/**
 * How the table presents the cards of a trick when it falls behind the game (a reconnect, a
 * stall, a burst of bot moves). See docs/client/connection.md.
 */
export const TRICK_PRESENTATION = {
  /**
   * Card flights shown at live pace, the one in the air included. Older waiting cards are placed
   * at rest at once, so the table never lags more than about this many flights behind the game.
   */
  MAX_FLIGHT_BACKLOG: 2,
} as const;
