import type { IGameState } from '@shared/domain';
import { CONNECTION_TIMING } from '@/presentation/config/connection.config';
import type { GameTraceEvent } from '@/lib/game-trace';

/** A server message as it comes off the wire (validated field by field where it is read). */
export interface WireEvent {
  type: string;
  timestamp?: number;
  [key: string]: unknown;
}

/** A message off the wire, or null when it is not one (garbage, no type). */
export function parseWireEvent(data: unknown): WireEvent | null {
  try {
    const event = JSON.parse(String(data)) as WireEvent | null;
    return event && typeof event.type === 'string' ? event : null;
  } catch {
    return null;
  }
}

/** The refusal an ERROR carries. */
export function errorOf(event: WireEvent): { message: string; code?: string } {
  return {
    message: typeof event.message === 'string' ? event.message : '',
    ...(typeof event.code === 'string' ? { code: event.code } : {}),
  };
}

function field(source: object, key: string): unknown {
  return (source as Record<string, unknown>)[key];
}

function cardIdOf(source: object): string | undefined {
  const card = field(source, 'card') as { id?: unknown } | undefined;
  const id = card?.id ?? field(source, 'cardId');
  return typeof id === 'string' ? id : undefined;
}

export function traceSeverityForLag(lagMs: number | undefined): 'debug' | 'warn' {
  return typeof lagMs === 'number' && lagMs > CONNECTION_TIMING.TRACE_LAG_WARNING_MS ? 'warn' : 'debug';
}

/** The `ws.event` trace of one received message. */
export function eventTrace(
  event: WireEvent,
  context: { roomId?: string; playerId: string | null; lagMs?: number; state: IGameState | null }
): GameTraceEvent {
  const { state } = context;
  return {
    type: 'ws.event',
    severity: traceSeverityForLag(context.lagMs),
    roomId: context.roomId,
    playerId: context.playerId,
    eventType: event.type,
    cardId: cardIdOf(event),
    serverTimestamp: event.timestamp,
    lagMs: context.lagMs,
    details: {
      phase: state?.phase,
      currentRound: state?.currentRound,
      currentTrickCards: state?.currentTrick?.cards?.length ?? 0,
      actorPlayerId: field(event, 'playerId'),
      winnerId: field(event, 'winnerId'),
      nextPlayerId: field(event, 'nextPlayerId'),
      trickIndex: field(event, 'trickIndex'),
    },
  };
}

/** The `ws.command` trace of one command handed to the session. */
export function commandTrace(
  command: { type: string; requestId: string } & Record<string, unknown>,
  context: { roomId?: string; playerId: string | null; socketReadyState?: number; outboxSize: number }
): GameTraceEvent {
  return {
    type: 'ws.command',
    severity: 'debug',
    roomId: context.roomId,
    playerId: context.playerId,
    commandType: command.type,
    cardId: cardIdOf(command),
    requestId: command.requestId,
    details: {
      socketReadyState: context.socketReadyState,
      outboxSize: context.outboxSize,
      bid: command.bid,
      suit: command.suit,
      hasPhysicsState: !!command.physicsState,
      hasCustomAudio: !!command.customAudio,
    },
  };
}
