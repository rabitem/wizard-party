// Table contents of the privacy policy. Storage periods must match TELEMETRY_RETENTION
// (src/infrastructure/telemetry/telemetry-retention.ts).

export const GAME_RECORD_ROWS: [string, ...string[]][] = [
    ["Game events", "Game start and end, dealt cards, trump, bids, played cards, tricks, scores, pauses, timeouts, rematches, lobby joins/leaves and reconnect grace periods", "13 months"],
    ["Settings", "Room and rule settings, sound preferences (names only, never your audio files), muting other players", "13 months"],
    ["Chat and emotes", "Chat message text, emotes sent", "Message text: 30 days, then deleted (the fact that a message was sent is kept)"],
    ["Rejected actions", "Invalid or not permitted moves with error code", "90 days"],
    ["Connection and device data", "Browser and version, operating system, device type, language, country (derived by Cloudflare, not the IP address), Cloudflare data center, connection duration", "90 days (full user agent string), afterwards only browser, OS and device type"],
];

export const STORAGE_ROWS: [string, ...string[]][] = [
    ["wizard-party-player-id, -username, -settings, -session, -recent-rooms, -player-stats and further wizard-party-* keys (local storage)", "Player ID, name, settings, sounds, statistics, tutorial state", "Until you clear your browser data", "Necessary"],
    ["wizard-party-table-sounds (IndexedDB)", "Sounds other players shared at your recent tables, with their player name, so you can import them in Preferences; never leaves your device", "14 days, at most 24 sounds", "Necessary"],
    ["wizard-party-cookie-consent (local storage)", "Remembers your privacy choice, its version and date", "12 months", "Necessary"],
    ["better-auth.session_token / session_data (cookie)", "Keeps you signed in (accounts only)", "60 days / 5 minutes", "Necessary"],
    ["better-auth.two_factor, trust_device, dont_remember, last_used_login_method, OAuth state cookies", "Two-factor sign-in, trusted device, sign-in method hint", "10 minutes to 30 days", "Necessary"],
    ["wizard-party-account-* (local storage)", "Uploading results and syncing settings for signed-in players", "Until sign-out or clearing browser data", "Necessary"],
    ["Session/tab ID for analytics (session storage)", "Groups the analytics events of one browser tab", "Until the tab is closed", "Analytics (consent)"],
    ["wizard-party-tournament-ticket:<table> (session storage)", "Seat pass for your tournament table (signed-in players only)", "Until it expires (at most 2 hours) or the tab is closed", "Necessary"],
];

export const RETENTION_ROWS: [string, ...string[]][] = [
    ["Chat message text", "30 days"],
    ["Inbox notifications (friend requests, game invites)", "30 days"],
    ["Online status", "About 2 minutes after your last heartbeat"],
    ["Full user agent in game records, rejected actions", "90 days"],
    ["Analytics data (section 7)", "90 days"],
    ["Game records (section 5)", "13 months"],
    ["Name reservation, rate-limit counters", "Minutes (automatic expiry)"],
    ["Account data (section 6)", "When you delete your account; sessions after 60 days of inactivity"],
    ["Local and session storage", "When you clear your browser data or close the tab"],
];
