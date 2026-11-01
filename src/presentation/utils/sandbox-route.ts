import { CONSTANTS } from '@/presentation/config/constants';

/**
 * True on the developer animation sandbox. Simulated games there must never touch the
 * player's real data: settings are isolated, account sync is off and no game results or
 * global stats are recorded.
 */
export function isSandboxRoute(pathname: string | null | undefined = typeof window === 'undefined' ? null : window.location?.pathname): boolean {
  return !!pathname && pathname.startsWith(CONSTANTS.SANDBOX_ROUTE);
}
