/** How an open tab finds out that a newer release was deployed. */
export const VERSION_WATCH_CONFIG = {
  /** Answers the release the deployment currently serves (src/app/api/version). */
  ENDPOINT: '/api/version',
  /** Periodic check while the page is visible. */
  POLL_INTERVAL_MS: 5 * 60 * 1000,
  /** Showing the page again checks at once, but never more often than this. */
  MIN_CHECK_GAP_MS: 60 * 1000,
} as const;
