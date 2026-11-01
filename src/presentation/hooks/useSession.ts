'use client';

import { useState, useCallback } from 'react';
import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '@/presentation/config/constants';

export interface SavedSession {
  host: string;
  room: string;
  name: string;
  timestamp: number;
}

function getUrlParams(): { room?: string; host?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return { room: params.get('room') || undefined, host: params.get('host') || undefined };
}

function clearUrlParamsFromBrowser() {
  if (typeof window !== 'undefined' && window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function saveSessionToStorage(host: string, room: string, name: string) {
  safeLocalStorage.writeJson(CONSTANTS.STORAGE_KEYS.SESSION, { host, room, name, timestamp: Date.now() });
}

function isSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Record<keyof SavedSession, unknown>>;
  return typeof session.host === 'string'
    && typeof session.room === 'string'
    && typeof session.name === 'string'
    && typeof session.timestamp === 'number';
}

function loadSessionFromStorage(): SavedSession | null {
  if (typeof window === 'undefined') return null;
  const session = safeLocalStorage.readJson(CONSTANTS.STORAGE_KEYS.SESSION);
  if (!isSavedSession(session)) return null;
  if (Date.now() - session.timestamp > CONSTANTS.TIMING.SESSION_TTL_MS) {
    safeLocalStorage.removeItem(CONSTANTS.STORAGE_KEYS.SESSION);
    return null;
  }
  return session;
}

function clearSessionFromStorage() {
  safeLocalStorage.removeItem(CONSTANTS.STORAGE_KEYS.SESSION);
}

function getInitialUrlParams() {
  if (typeof window === 'undefined') return {};
  const params = getUrlParams();
  if (params.room) clearUrlParamsFromBrowser();
  return params;
}

export interface UseSessionReturn {
  savedSession: SavedSession | null;
  sessionLoaded: boolean;
  urlRoomId: string | undefined;
  urlHost: string | undefined;
  saveSession: (host: string, room: string, name: string) => void;
  clearSession: () => void;
  clearUrlParams: () => void;
}

/** Simple session management - just storage, no reconnection logic */
export function useSession(): UseSessionReturn {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(loadSessionFromStorage);
  const [urlRoomId, setUrlRoomId] = useState<string | undefined>(() => getInitialUrlParams().room);
  const [urlHost, setUrlHost] = useState<string | undefined>(() => getInitialUrlParams().host);

  const saveSession = useCallback((host: string, room: string, name: string) => {
    saveSessionToStorage(host, room, name);
    setUrlRoomId(undefined);
    setUrlHost(undefined);
  }, []);

  const clearSession = useCallback(() => {
    clearSessionFromStorage();
    setSavedSession(null);
  }, []);

  const clearUrlParams = useCallback(() => {
    setUrlRoomId(undefined);
    setUrlHost(undefined);
  }, []);

  return {
    savedSession,
    sessionLoaded: true,
    urlRoomId,
    urlHost,
    saveSession,
    clearSession,
    clearUrlParams,
  };
}
