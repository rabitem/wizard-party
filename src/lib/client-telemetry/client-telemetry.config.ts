/** Browser-side tuning for the client telemetry collector. Wire limits live in @shared/telemetry. */
export const CLIENT_TELEMETRY_CONFIG = {
  /** Periodic flush; unload flushes happen on visibilitychange=hidden and pagehide. */
  FLUSH_INTERVAL_MS: 10_000,
  /** Flush early once this many events are buffered. */
  FLUSH_THRESHOLD_EVENTS: 25,
  /** Hard cap; the oldest events are dropped beyond it. */
  MAX_BUFFERED_EVENTS: 500,
  SESSION_STORAGE_KEY: 'wizard-party-telemetry-session',
  /** Upper bound for waiting on high-entropy user agent hints before session.started is sent. */
  HIGH_ENTROPY_HINTS_TIMEOUT_MS: 1_000,
  /** Delay before profiling the device so it never competes with first paint. */
  SESSION_PROFILE_IDLE_TIMEOUT_MS: 2_000,
  /** Distinct errors reported per tab session; repeats are always suppressed. */
  MAX_DISTINCT_ERRORS_PER_SESSION: 50,
} as const;

export const RENDER_PERFORMANCE_CONFIG = {
  WINDOW_MS: 10_000,
  /** Skip windows with fewer frames (tab mostly hidden). */
  MIN_FRAMES_PER_WINDOW: 30,
  /** Enough for a full window at 240 Hz; extra frames are ignored. */
  MAX_FRAMES_PER_WINDOW: 2_400,
  /** Gaps longer than this are pauses (tab switch, debugger), not slow frames. */
  MAX_FRAME_DELTA_MS: 1_000,
  /** Fastest refresh interval assumed when estimating dropped frames (240 Hz). */
  MIN_REFRESH_INTERVAL_MS: 1000 / 240,
  /** Percentile of frame times used as the display refresh interval estimate. */
  REFRESH_ESTIMATE_PERCENTILE: 0.1,
  SLOW_TAIL_PERCENTILE: 0.95,
  BYTES_PER_MB: 1024 * 1024,
} as const;

export const REALTIME_TELEMETRY_CONFIG = {
  /** Commands without a matching server message after this long are reported as timeouts. */
  COMMAND_RTT_TIMEOUT_MS: 15_000,
  /** Bound for in-flight commands awaiting a server message. */
  MAX_PENDING_COMMANDS: 50,
} as const;
