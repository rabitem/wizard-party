'use client';

import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'wizard-party-session';

export interface SavedSession {
  host: string;
  room: string;
  name: string;
  timestamp: number;
}

function getUrlParams(): { room?: string; host?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get('room') || undefined,
    host: params.get('host') || undefined,
  };
}

function clearUrlParamsFromBrowser() {
  if (typeof window !== 'undefined' && window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function saveSessionToStorage(host: string, room: string, name: string) {
  const session: SavedSession = { host, room, name, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSessionFromStorage(): SavedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const session: SavedSession = JSON.parse(data);
    // Session valid for 24 hours
    if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearSessionFromStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

function getInitialUrlParams(): { room?: string; host?: string } {
  if (typeof window === 'undefined') return {};
  const params = getUrlParams();
  if (params.room) {
    clearUrlParamsFromBrowser();
  }
  return params;
}

export interface UseSessionReturn {
  savedSession: SavedSession | null;
  sessionLoaded: boolean;
  isReconnecting: boolean;
  urlRoomId: string | undefined;
  urlHost: string | undefined;
  saveSession: (host: string, room: string, name: string) => void;
  clearSession: () => void;
  clearUrlParams: () => void;
  startReconnect: (connect: (host: string, room: string, name: string) => void) => void;
  onConnected: () => void;
  onError: () => void;
}

// Initialize URL params once at module load (safe since it's client-only)
function getInitialUrlState(): { room?: string; host?: string } {
  const params = getInitialUrlParams();
  return params;
}

export function useSession(): UseSessionReturn {
  const [savedSession, setSavedSession] = useState<SavedSession | null>(loadSessionFromStorage);
  // Session is loaded immediately since this is a client-only hook that
  // initializes synchronously from localStorage
  const sessionLoaded = true;
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [urlRoomId, setUrlRoomId] = useState<string | undefined>(
    () => getInitialUrlState().room
  );
  const [urlHost, setUrlHost] = useState<string | undefined>(
    () => getInitialUrlState().host
  );

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedReconnectRef = useRef(false);

  const saveSession = useCallback((host: string, room: string, name: string) => {
    saveSessionToStorage(host, room, name);
    setUrlRoomId(undefined);
    setUrlHost(undefined);
  }, []);

  const clearSession = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    clearSessionFromStorage();
    setSavedSession(null);
    setIsReconnecting(false);
    hasStartedReconnectRef.current = false;
  }, []);

  const startReconnect = useCallback((connect: (host: string, room: string, name: string) => void) => {
    if (!savedSession || !sessionLoaded || hasStartedReconnectRef.current || urlRoomId) {
      return;
    }

    hasStartedReconnectRef.current = true;
    setIsReconnecting(true);

    connectTimerRef.current = setTimeout(() => {
      connect(savedSession.host, savedSession.room, savedSession.name);
    }, 500);

    reconnectTimeoutRef.current = setTimeout(() => {
      clearSessionFromStorage();
      setSavedSession(null);
      setIsReconnecting(false);
      hasStartedReconnectRef.current = false;
    }, 8000);
  }, [savedSession, sessionLoaded, urlRoomId]);

  const onConnected = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    setIsReconnecting(false);
    hasStartedReconnectRef.current = false;
  }, []);

  const onError = useCallback(() => {
    if (!isReconnecting) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    clearSessionFromStorage();
    setSavedSession(null);
    setIsReconnecting(false);
    hasStartedReconnectRef.current = false;
  }, [isReconnecting]);

  const handleClearUrlParams = useCallback(() => {
    setUrlRoomId(undefined);
    setUrlHost(undefined);
  }, []);

  return {
    savedSession,
    sessionLoaded,
    isReconnecting,
    urlRoomId,
    urlHost,
    saveSession,
    clearSession,
    clearUrlParams: handleClearUrlParams,
    startReconnect,
    onConnected,
    onError,
  };
}
