import { LOCAL_REALTIME_HOST, normalizePartyHostInput } from '@shared/realtime/realtime-host';

/**
 * Where this deployment lives and who operates it. Every value comes from the environment; the code
 * names no site, worker or operator of its own. Without the environment a build talks to the local
 * dev servers and shows a placeholder imprint, so a contributor never reaches production by
 * accident. A Vercel production build refuses to start without its settings (next.config.ts,
 * deployment-requirements.ts).
 *
 * NEXT_PUBLIC_* values are inlined at build time, so they are read literally, one by one.
 */

const LOCAL = {
  SITE_URL: 'http://localhost:3000',
  REALTIME_HOST: LOCAL_REALTIME_HOST,
  IMPRINT: {
    name: 'Site operator (set NEXT_PUBLIC_IMPRINT_NAME)',
    addressLines: ['Street and number', 'Postal code and city', 'Country'],
    email: 'operator@example.com',
    website: 'https://example.com',
  },
} as const;

/** Where the game worker lived before the move to Cloudflare; old links and settings may name it. */
const RETIRED_REALTIME_HOST = 'wizard-party.rabitem.partykit.dev';

/** A Vercel preview without NEXT_PUBLIC_APP_URL links to its own deployment. */
const VERCEL_DEPLOYMENT_URL = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '';

/** Public origin without a trailing slash (NEXT_PUBLIC_APP_URL), e.g. https://wizard.example. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || VERCEL_DEPLOYMENT_URL || LOCAL.SITE_URL).replace(/\/+$/, '');

/** The origin's host, for branding text in images and emails, e.g. wizard.example. */
export const SITE_HOST = SITE_URL.replace(/^[a-z][a-z\d+.-]*:\/\//i, '');

const configuredRealtimeHost = normalizePartyHostInput(
  process.env.NEXT_PUBLIC_REALTIME_HOST || process.env.NEXT_PUBLIC_PARTYKIT_HOST || ''
);

/** The build names its game worker (NEXT_PUBLIC_REALTIME_HOST, legacy NEXT_PUBLIC_PARTYKIT_HOST). */
export const IS_REALTIME_HOST_CONFIGURED = configuredRealtimeHost !== '' && configuredRealtimeHost !== RETIRED_REALTIME_HOST;

/** The game worker of this deployment (host only), e.g. wizard-party.example.workers.dev. */
export const REALTIME_HOST = IS_REALTIME_HOST_CONFIGURED ? configuredRealtimeHost : LOCAL.REALTIME_HOST;

/** Host input from links, saved settings or env, with the retired PartyKit host moved to this deployment's worker. */
export function normalizeRealtimeHost(host: string): string {
  const normalized = normalizePartyHostInput(host);
  return normalized === RETIRED_REALTIME_HOST ? REALTIME_HOST : normalized;
}

/** The game worker server routes talk to: REALTIME_HOST (runtime, server only), else the build's. */
export function serverRealtimeHost(env: Record<string, string | undefined> = process.env): string {
  return env.REALTIME_HOST ? normalizeRealtimeHost(env.REALTIME_HOST) : REALTIME_HOST;
}

export interface ImprintDetails {
  name: string;
  /** Postal address, one line each (street, postal code and city, country). */
  addressLines: readonly string[];
  email: string;
  /** Absolute URL; empty to omit. */
  website: string;
}

const lines = (...values: (string | undefined)[]) => values.filter((value): value is string => Boolean(value?.trim()));

const imprintName = process.env.NEXT_PUBLIC_IMPRINT_NAME;

/**
 * The operator named on the imprint page. Configured as a whole: once NEXT_PUBLIC_IMPRINT_NAME is
 * set, the other NEXT_PUBLIC_IMPRINT_* values are used as given and unset ones are left out, so
 * no placeholder ever mixes into a real operator's notice.
 */
export const IMPRINT: ImprintDetails = imprintName
  ? {
      name: imprintName,
      addressLines: lines(
        process.env.NEXT_PUBLIC_IMPRINT_STREET,
        process.env.NEXT_PUBLIC_IMPRINT_CITY,
        process.env.NEXT_PUBLIC_IMPRINT_COUNTRY
      ),
      email: process.env.NEXT_PUBLIC_IMPRINT_EMAIL ?? '',
      website: process.env.NEXT_PUBLIC_IMPRINT_WEBSITE ?? '',
    }
  : LOCAL.IMPRINT;
