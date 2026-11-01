export type AuthProviderId = 'google' | 'discord' | 'github';

/** What the sign-in UI may offer; computed on the server from configuration. */
export interface AuthCapabilities {
  providers: AuthProviderId[];
  /**
   * Mail can be delivered: password reset codes, and email verification by code (then required
   * before the first password sign-in).
   */
  email: boolean;
  passkeys: boolean;
}

/** The capabilities answer: sign-in methods plus the optional features this deployment runs. */
export interface DeploymentCapabilities extends AuthCapabilities {
  /** TOURNAMENT_SECRET and the database are configured (docs/accounts/tournaments.md#configuration). */
  tournaments: boolean;
}
