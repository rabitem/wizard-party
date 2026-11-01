/** Client-side timing and format of the code-based auth flows (server: EMAIL_CODE in auth-options). */
export const AUTH_FLOW_CONFIG = {
  CODE_LENGTH: 6,
  /** Matches the server limit of 3 code mails per 5 minutes without hitting it in normal use. */
  RESEND_COOLDOWN_SECONDS: 60,
  USERNAME_CHECK_DEBOUNCE_MS: 400,
  PASSWORD_MIN_LENGTH: 10,
  PASSWORD_MAX_LENGTH: 128,
} as const;
