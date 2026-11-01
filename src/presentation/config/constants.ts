/**
 * Centralized application constants for the Wizard Party game.
 * All magic numbers and configuration values should be defined here.
 */

/**
 * Application-wide constants organized by domain.
 * Use these values instead of hardcoded numbers throughout the codebase.
 */
export const CONSTANTS = {
  /** Developer animation sandbox route; settings there are isolated from the player's own. */
  SANDBOX_ROUTE: '/sandbox',

  /**
   * API endpoint paths for server communication.
   */
  API: {
    /** Username availability check endpoint */
    USERNAME_CHECK: '/api/username/check',
    /** Global stats endpoint */
    STATS: '/api/stats',
  },

  /**
   * Timing-related constants in milliseconds.
   */
  TIMING: {
    /** Duration to display error messages (5 seconds) */
    ERROR_DISPLAY_MS: 5000,
    /** Session time-to-live in localStorage (24 hours) */
    SESSION_TTL_MS: 24 * 60 * 60 * 1000,
  },

  /**
   * "Preparing the Table" over the 3D table until it has drawn its first frame (the 3D bundle,
   * renderer and card textures load after the game state has arrived).
   */
  TABLE_LOADING: {
    /** Consecutive frames the visible canvas must draw before the loader lifts */
    READY_FRAMES: 3,
    /** Fade-out once the table is drawn */
    FADE_MS: 400,
    /** Never hide the game longer than this, even if the table has not drawn yet */
    MAX_WAIT_MS: 20_000,
  },

  // Reconnect backoff, connection liveness and the command outbox: see connection.config.ts.

  /**
   * Social feature constants (emotes, chat, bids).
   */
  SOCIAL: {
    /** Duration to display emote animations (3 seconds) */
    EMOTE_DISPLAY_MS: 3000,
    /** Duration to display chat messages (3 seconds) */
    CHAT_DISPLAY_MS: 3000,
    /** Duration to display bid notifications (1 second) */
    BID_DISPLAY_MS: 1000,
    /** Maximum number of chat messages to retain in history */
    MAX_CHAT_HISTORY: 50,
    /** Cooldown between social actions (3 seconds) */
    COOLDOWN_MS: 3000,
  },

  // Expansion special cards
  SPECIAL_CARDS: {
    /** How long a special-card announcement stays on screen (4 seconds) */
    NOTICE_DISPLAY_MS: 4000,
    /** Announcements shown at once */
    MAX_NOTICES: 3,
  },

  /**
   * Lobby constants.
   */
  LOBBY: {
    /** Number of recent lobby activity entries (joins, leaves, rule changes) kept for the UI */
    ACTIVITY_MAX_ENTRIES: 5,
  },

  /**
   * Responsive design breakpoints in pixels.
   */
  BREAKPOINTS: {
    /** Mobile device max width */
    MOBILE: 768,
    /** Tablet device max width */
    TABLET: 1024,
    /** Viewport max height that gets the compact (mobile) HUD, e.g. phones in landscape */
    COMPACT_HEIGHT: 500,
  },

  /**
   * Username validation and input constants.
   */
  USERNAME: {
    /** Maximum allowed username length */
    MAX_LENGTH: 20,
    /** Debounce delay for username availability check (400ms) */
    DEBOUNCE_MS: 400,
  },

  /**
   * Game configuration constants.
   */
  GAME: {
    /** Minimum number of players required to start a game */
    MIN_PLAYERS: 3,
    /** Maximum number of players allowed in a game */
    MAX_PLAYERS: 6,
  },

  /**
   * localStorage key names for persistent data.
   */
  STORAGE_KEYS: {
    /** Session data storage key */
    SESSION: 'wizard-party-session',
    /** Username storage key */
    USERNAME: 'wizard-party-username',
    /** User settings storage key */
    SETTINGS: 'wizard-party-settings',
    /** Settings used while the animation sandbox is open; never synced to an account */
    SANDBOX_SETTINGS: 'wizard-party-sandbox-settings',
    /** Player ID storage key */
    PLAYER_ID: 'wizard-party-player-id',
    /** Secret session tokens of the seats this browser holds, per room */
    SEAT_SESSIONS: 'wizard-party-seat-sessions',
    /** Player statistics storage key */
    PLAYER_STATS: 'wizard-party-player-stats',
    /** Recent rooms history storage key */
    RECENT_ROOMS: 'wizard-party-recent-rooms',
    /** Tutorial completion flag storage key */
    TUTORIAL_SEEN: 'wizard-party-tutorial-seen',
  },

  /**
   * Seasonal themes promo (waving mascots) shown on the home page.
   */
  SEASONAL_PROMO: {
    /** The mascots stop showing after this instant (ISO 8601) */
    ENDS_AT: '2026-12-01T00:00:00Z',
  },
} as const;
