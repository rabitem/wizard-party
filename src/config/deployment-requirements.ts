/**
 * Settings a public production deployment must name itself. The code holds no operator, site or
 * worker of its own, so a production build without them would show placeholders: next.config.ts
 * fails the Vercel production build instead. Kept free of imports, because next.config.ts loads it.
 */
export const PRODUCTION_SETTINGS = [
  { name: 'NEXT_PUBLIC_APP_URL', purpose: 'public origin of the site' },
  { name: 'NEXT_PUBLIC_REALTIME_HOST', purpose: 'game worker host' },
  { name: 'NEXT_PUBLIC_IMPRINT_NAME', purpose: 'operator named on /imprint' },
  { name: 'NEXT_PUBLIC_IMPRINT_STREET', purpose: 'imprint address' },
  { name: 'NEXT_PUBLIC_IMPRINT_CITY', purpose: 'imprint address' },
  { name: 'NEXT_PUBLIC_IMPRINT_EMAIL', purpose: 'imprint contact' },
] as const;

/** Names of the production settings missing from `env` (blank counts as missing). */
export function missingProductionSettings(env: Record<string, string | undefined>): string[] {
  return PRODUCTION_SETTINGS
    .filter((setting) => !env[setting.name]?.trim())
    .map((setting) => `${setting.name} (${setting.purpose})`);
}
