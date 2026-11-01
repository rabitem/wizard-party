/**
 * `commandType` values for causes that are not client commands, so server-initiated work can be
 * told apart from commands in the envelope.
 */
export const ServerTrigger = {
  /** A WebSocket was opened. */
  CONNECT: 'CONNECT',
  /** A WebSocket was closed. */
  CONNECTION_CLOSED: 'CONNECTION_CLOSED',
  /** The debounced leave after a player's last connection closed. */
  DISCONNECT: 'DISCONNECT',
  /** A Durable Object alarm (grace periods, pause timeouts, turn timers). */
  ALARM: 'ALARM',
} as const;

export type ServerTrigger = (typeof ServerTrigger)[keyof typeof ServerTrigger];
