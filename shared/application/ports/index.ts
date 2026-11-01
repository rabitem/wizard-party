export type { IGameRepository, PersistedGameState } from './game-repository.port';
export type { IPlayerRegistry } from './player-registry.port';
export type { IEventEmitter } from './event-emitter.port';
export type { ITelemetryEventStore, TelemetryAppendResult } from './telemetry-event-store.port';
export type {
  IClientTelemetryStore,
  ClientTelemetryAppendResult,
  IClientTelemetryRetention,
  ClientTelemetryDeleteResult,
} from './client-telemetry-store.port';
export type { IUsageCounter } from './usage-counter.port';
export type { ISeatSessionStore, ISessionCredentialFactory } from './seat-sessions.port';
// Chance and time are domain ports (the Game and the bots need them); adapters
// for other runtimes implement these interfaces.
export type { IRandom, IClock, IManualClock } from '../../domain/ports';
