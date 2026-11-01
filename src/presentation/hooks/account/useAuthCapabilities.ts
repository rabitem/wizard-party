'use client';

import { useEffect, useState } from 'react';

import { accountApi } from '@/lib/account/account-api';
import type { DeploymentCapabilities } from '@/infrastructure/auth/auth-capabilities';

/** Unreachable endpoint: offer the basics; features that turn out to be off answer with 503 themselves. */
const FALLBACK: DeploymentCapabilities = { providers: [], email: false, passkeys: true, tournaments: true };
let cached: Promise<DeploymentCapabilities> | null = null;

/** Sign-in methods and optional features this deployment offers (switched on via env vars). */
export function useAuthCapabilities(): DeploymentCapabilities | null {
  const [capabilities, setCapabilities] = useState<DeploymentCapabilities | null>(null);
  useEffect(() => {
    let active = true;
    cached ??= accountApi.capabilities().catch(() => FALLBACK);
    void cached.then((value) => active && setCapabilities(value));
    return () => {
      active = false;
    };
  }, []);
  return capabilities;
}
