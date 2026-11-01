'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONSTANTS } from '@/presentation/config/constants';

export type UsernameValidationStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken' // The name belongs to a registered account
  | 'rate_limited'
  | 'error';

export interface UsernameValidationResult {
  status: UsernameValidationStatus;
  isChecking: boolean;
  isAvailable: boolean;
  isTaken: boolean;
  isRateLimited: boolean;
  error: string | null;
  checkUsername: (username: string) => void;
}

/** Status and message for a response of the username check route. */
function readCheckResponse(
  data: { available?: boolean; error?: string },
  status: number
): { status: UsernameValidationStatus; error: string | null } {
  if (status === 429) return { status: 'rate_limited', error: data.error || 'Too many requests' };
  if (data.available) return { status: 'available', error: null };
  return { status: 'taken', error: data.error || 'Username is already taken' };
}

/** Debounced check whether a guest may play under a name (account names are reserved). */
export function useUsernameValidation(): UsernameValidationResult {
  const [status, setStatus] = useState<UsernameValidationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCheckedRef = useRef<string>('');

  const checkUsername = useCallback((username: string) => {
    const trimmed = username.trim();
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }

    if (!trimmed) { setStatus('idle'); setError(null); lastCheckedRef.current = ''; return; }
    if (trimmed.length > CONSTANTS.USERNAME.MAX_LENGTH) { setStatus('error'); setError(`Username must be ${CONSTANTS.USERNAME.MAX_LENGTH} characters or less`); return; }
    if (trimmed.toLowerCase() === lastCheckedRef.current.toLowerCase()) return;

    setStatus('checking');
    setError(null);

    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      try {
        const params = new URLSearchParams({ username: trimmed });
        const response = await fetch(`${CONSTANTS.API.USERNAME_CHECK}?${params}`, { signal: abortControllerRef.current.signal });
        const result = readCheckResponse(await response.json(), response.status);
        setStatus(result.status);
        setError(result.error);
        lastCheckedRef.current = trimmed;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStatus('available');
        setError(null);
      }
    }, CONSTANTS.USERNAME.DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  }, []);

  return { status, isChecking: status === 'checking', isAvailable: status === 'available', isTaken: status === 'taken', isRateLimited: status === 'rate_limited', error, checkUsername };
}
