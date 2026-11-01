/**
 * Utility functions for the game paused overlay
 */

export function calculateTimeRemaining(pausedAt: number, timeoutDuration: number): number {
  const elapsed = Date.now() - pausedAt;
  return Math.max(0, Math.ceil((timeoutDuration - elapsed) / 1000));
}
