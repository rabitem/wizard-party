'use client';

import { clientTelemetry } from './client-telemetry/browser-client-telemetry';
import { toGameTracePayload } from './client-telemetry/game-trace-payload';
import { safeSessionStorage } from './storage';

const TRACE_SESSION_STORAGE_KEY = 'wizard-party-trace-session';

export type GameTraceSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface GameTraceEvent {
  type: string;
  severity?: GameTraceSeverity;
  roomId?: string;
  playerId?: string | null;
  eventType?: string;
  commandType?: string;
  cardId?: string;
  requestId?: string;
  serverTimestamp?: number;
  lagMs?: number;
  replayedCardCount?: number;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface GameTraceEntry extends GameTraceEvent {
  severity: GameTraceSeverity;
  clientTimestamp: number;
  traceSessionId: string;
  visibilityState?: string;
  online?: boolean;
}

const TRACE_BUFFER_LIMIT = 250;
const SERVER_TRACE_EVENT_TYPES = new Set([
  'BID_PLACED',
  'TRUMP_SELECTED',
  'CARD_PLAYED',
  'TRICK_COMPLETE',
  'ROUND_COMPLETE',
  'GAME_PAUSED',
  'GAME_RESUMED',
  'ERROR',
]);
const SERVER_TRACE_COMMAND_TYPES = new Set([
  'PLACE_BID',
  'SELECT_TRUMP',
  'PLAY_CARD',
  'NEXT_ROUND',
]);

declare global {
  interface Window {
    __wizardGameTrace?: GameTraceEntry[];
  }
}

function getTraceSessionId(): string {
  if (typeof window === 'undefined') return 'server';

  const existing = safeSessionStorage.getItem(TRACE_SESSION_STORAGE_KEY);
  if (existing) return existing;

  const traceSessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  safeSessionStorage.setItem(TRACE_SESSION_STORAGE_KEY, traceSessionId);
  return traceSessionId;
}

function appendTraceEntry(entry: GameTraceEntry): void {
  if (typeof window === 'undefined') return;

  const buffer = window.__wizardGameTrace ?? [];
  buffer.push(entry);
  if (buffer.length > TRACE_BUFFER_LIMIT) {
    buffer.splice(0, buffer.length - TRACE_BUFFER_LIMIT);
  }
  window.__wizardGameTrace = buffer;
}

function shouldSendGameTraceToServer(
  event: Pick<GameTraceEvent, 'type' | 'severity' | 'eventType' | 'commandType'>
): boolean {
  if (event.severity === 'warn' || event.severity === 'error') return true;
  if (event.type === 'ws.event' && event.eventType && SERVER_TRACE_EVENT_TYPES.has(event.eventType)) return true;
  if (event.type === 'ws.command' && event.commandType && SERVER_TRACE_COMMAND_TYPES.has(event.commandType)) return true;
  return event.type.startsWith('animation.replay');
}

/**
 * Traces leave the browser only with analytics consent (§ 25(1) TDDDG): then they are persisted as
 * client telemetry, batched with everything else. Without consent they stay in the local debug
 * buffer (window.__wizardGameTrace) only.
 */
function forwardTraceEntry(entry: GameTraceEntry): void {
  if (!clientTelemetry.isEnabled()) return;
  const payload = toGameTracePayload(entry);
  if (payload) clientTelemetry.track('game.trace', payload);
}

export function recordGameTrace(event: GameTraceEvent): GameTraceEntry {
  const entry: GameTraceEntry = {
    ...event,
    severity: event.severity ?? 'info',
    clientTimestamp: Date.now(),
    traceSessionId: getTraceSessionId(),
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : undefined,
    online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
  };

  appendTraceEntry(entry);

  if (entry.severity === 'error') {
    console.error('[GameTrace]', entry);
  } else if (entry.severity === 'warn') {
    console.warn('[GameTrace]', entry);
  }

  if (shouldSendGameTraceToServer(entry)) {
    forwardTraceEntry(entry);
  }

  return entry;
}
