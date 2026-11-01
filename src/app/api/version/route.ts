import { resolveAppVersion } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

/** The release this deployment serves; open tabs compare it with their own to offer a reload. */
export function GET(): Response {
  return Response.json({ version: resolveAppVersion() }, { headers: { 'Cache-Control': 'no-store' } });
}
