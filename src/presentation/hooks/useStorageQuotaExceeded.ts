'use client';

import { useSyncExternalStore } from 'react';

import { safeLocalStorage } from '@/lib/storage';

const subscribe = (listener: () => void) => safeLocalStorage.onUnsavedChange(listener);
const readQuotaExceeded = () => safeLocalStorage.hasUnsavedValues('quota');
const readOnServer = () => false;

/**
 * True while some change of this visit is kept only in memory because the browser's storage is
 * full (SafeStorage still applies it). It covers writes made before the calling component mounted
 * and clears once a later save persists, e.g. after the player removed a custom sound. The UI
 * should say that the change will not be remembered.
 */
export function useStorageQuotaExceeded(): boolean {
  return useSyncExternalStore(subscribe, readQuotaExceeded, readOnServer);
}
