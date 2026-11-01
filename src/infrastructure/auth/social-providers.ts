import type { SocialProviders } from 'better-auth/social-providers';

import type { AuthProviderId } from './auth-capabilities';

interface ProviderDefinition {
  id: AuthProviderId;
  idEnv: string;
  secretEnv: string;
}

/**
 * Identity providers are switched on purely by configuration: a provider is offered as soon as
 * both of its env vars exist. Adding one = one entry here (Better Auth ships 30+ providers).
 */
const PROVIDERS: readonly ProviderDefinition[] = [
  { id: 'google', idEnv: 'GOOGLE_CLIENT_ID', secretEnv: 'GOOGLE_CLIENT_SECRET' },
  { id: 'discord', idEnv: 'DISCORD_CLIENT_ID', secretEnv: 'DISCORD_CLIENT_SECRET' },
  { id: 'github', idEnv: 'GITHUB_CLIENT_ID', secretEnv: 'GITHUB_CLIENT_SECRET' },
];

export function configuredSocialProviders(env: NodeJS.ProcessEnv = process.env): SocialProviders {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};
  for (const { id, idEnv, secretEnv } of PROVIDERS) {
    const clientId = env[idEnv];
    const clientSecret = env[secretEnv];
    if (clientId && clientSecret) providers[id] = { clientId, clientSecret };
  }
  return providers as SocialProviders;
}

export function enabledProviderIds(env: NodeJS.ProcessEnv = process.env): AuthProviderId[] {
  return Object.keys(configuredSocialProviders(env)) as AuthProviderId[];
}
