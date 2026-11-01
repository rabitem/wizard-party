'use client';

import { useEffect, useState } from 'react';

import { normalizeUsername } from '@shared/domain/account/username';

import { authClient } from '@/lib/account/auth-client';

import { AUTH_FLOW_CONFIG } from './auth-flow.config';
import { usernameProblem } from './auth-flow.utils';

export type UsernameAvailability =
  | { status: 'idle' }
  | { status: 'invalid'; message: string }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'taken' }
  | { status: 'unknown' };

interface CheckResult {
  username: string;
  available: boolean | null;
}

/** Validates a username locally, then asks the server (debounced) whether it is still free. */
export function useUsernameAvailability(value: string): UsernameAvailability {
  const [result, setResult] = useState<CheckResult | null>(null);
  const problem = value.trim() ? usernameProblem(value) : null;
  const normalized = normalizeUsername(value);

  useEffect(() => {
    if (!normalized || problem) return;
    let active = true;
    const timer = setTimeout(() => {
      authClient
        .isUsernameAvailable({ username: normalized })
        .then(({ data }) => active && setResult({ username: normalized, available: data?.available ?? null }))
        .catch(() => active && setResult({ username: normalized, available: null }));
    }, AUTH_FLOW_CONFIG.USERNAME_CHECK_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalized, problem]);

  if (!normalized) return { status: 'idle' };
  if (problem) return { status: 'invalid', message: problem };
  if (result?.username !== normalized) return { status: 'checking' };
  if (result.available === null) return { status: 'unknown' };
  return result.available ? { status: 'available' } : { status: 'taken' };
}
