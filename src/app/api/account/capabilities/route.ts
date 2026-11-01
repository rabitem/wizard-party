import { getAuthCapabilities } from '@/infrastructure/auth/auth';
import type { DeploymentCapabilities } from '@/infrastructure/auth/auth-capabilities';
import { isTournamentsAvailable } from '@/infrastructure/tournament/tournament-config';

export const runtime = 'nodejs';

/** Public: which sign-in methods this deployment offers, and whether it runs tournaments. */
export function GET(): Response {
  const capabilities: DeploymentCapabilities = { ...getAuthCapabilities(), tournaments: isTournamentsAvailable() };
  return Response.json(capabilities, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
