/**
 * Live pulse of the realm shown on the home page. Counts come from server-side game telemetry
 * (humans only, guests included via their persistent player id) and the account table.
 */
export interface CommunityStats {
  /** Humans in a running game with activity in the last few minutes. */
  playingNow: number;
  /** Distinct humans who played in the last 24 hours. */
  playersToday: number;
  gamesToday: number;
  registeredPlayers: number;
}

export const COMMUNITY_STATS_RULES = {
  /** A running game counts as live while it had an event within this window. */
  LIVE_WINDOW_MINUTES: 5,
  TODAY_WINDOW_HOURS: 24,
} as const;

/** Guards against negative or non-integer values from storage. */
export function sanitizeCommunityStats(value: Partial<Record<keyof CommunityStats, unknown>>): CommunityStats {
  const count = (raw: unknown) => {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const playersToday = count(value.playersToday);
  return {
    // Everyone playing now has played today; keep the numbers consistent across both windows.
    playingNow: Math.min(count(value.playingNow), Math.max(playersToday, count(value.playingNow))),
    playersToday: Math.max(playersToday, count(value.playingNow)),
    gamesToday: count(value.gamesToday),
    registeredPlayers: count(value.registeredPlayers),
  };
}
