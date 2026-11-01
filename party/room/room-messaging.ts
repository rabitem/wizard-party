import type * as Party from '../runtime';
import {
  GameEventType,
  LEGACY_PROTOCOL_VERSION,
  isLegacyProtocol,
  type BroadcastEvent,
  type ConnectionCloseCode,
  type ConnectionCloseReason,
  type GameEvent,
  type SharedCustomSound,
} from '../../shared/domain';
import type { CommitGate } from '../protocol/commit-gate';
import { SharedSoundsTracker, gameStateMessage, sharedSoundsMessage } from '../protocol/state-messages';
import { getSharedCustomSounds } from '../utils/helpers';
import type { TournamentMatchController } from '../tournament';
import type { RoomState } from './room-state';

/** Events worth a structured log line when broadcast (moves, timeouts, pauses). */
const TRACED_EVENT_TYPES: ReadonlySet<string> = new Set([
  GameEventType.BID_PLACED,
  GameEventType.TRUMP_SELECTED,
  GameEventType.CARD_PLAYED,
  GameEventType.TRICK_COMPLETE,
  GameEventType.ROUND_COMPLETE,
  GameEventType.TURN_TIMER_EXPIRED,
  GameEventType.GAME_PAUSED,
  GameEventType.GAME_RESUMED,
]);

function traceDetails(event: BroadcastEvent): object | null {
  const typed = event as {
    type?: unknown;
    timestamp?: unknown;
    playerId?: unknown;
    winnerId?: unknown;
    nextPlayerId?: unknown;
    trickIndex?: unknown;
    card?: { id?: unknown };
  };
  if (typeof typed.type !== 'string' || !TRACED_EVENT_TYPES.has(typed.type)) return null;
  return {
    eventType: typed.type,
    timestamp: typed.timestamp,
    actorPlayerId: typed.playerId,
    winnerId: typed.winnerId,
    nextPlayerId: typed.nextPlayerId,
    trickIndex: typed.trickIndex,
    cardId: typed.card?.id,
  };
}

/**
 * Everything the room sends. Every message passes the commit gate, so it leaves only after the
 * state it announces was written; every snapshot is the receiving seat's own projection.
 */
export class RoomMessaging {
  private readonly sharedSounds = new SharedSoundsTracker();

  constructor(
    private readonly state: RoomState,
    private readonly host: Party.Room,
    private readonly gate: CommitGate,
    private readonly tournament: TournamentMatchController
  ) {}

  protocolOf(connectionId: string): number {
    return this.state.connectionProtocols.get(connectionId) ?? LEGACY_PROTOCOL_VERSION;
  }

  currentSharedSounds(): SharedCustomSound[] {
    return getSharedCustomSounds(this.state.game, this.state.playerSoundPreferences);
  }

  private gameStateFor(connectionId: string, playerId: string, now: number, sounds?: SharedCustomSound[]) {
    return gameStateMessage({
      game: this.state.game,
      playerId,
      roomSettings: this.state.roomSettings,
      stateVersion: this.state.stateVersion,
      protocolVersion: this.protocolOf(connectionId),
      sharedSounds: () => sounds ?? this.currentSharedSounds(),
      tournamentMatch: this.tournament.roomState(),
      now,
    });
  }

  /** The current snapshot for one joined connection (answers repeat the current version). */
  sendGameState(conn: Party.Connection): void {
    const playerId = this.state.playerOf(conn.id);
    if (!playerId) return;
    this.sendToConnection(conn, this.gameStateFor(conn.id, playerId, Date.now()));
  }

  /**
   * Every joined connection gets its own projection under a new state version. The version is
   * persisted with the state it labels, so a client never sees a version go backwards.
   */
  broadcastPersonalizedState(): void {
    this.state.game.syncTurnTimerState();
    // The match lock follows every change of the game (countdown, takeovers, result).
    this.tournament.sync();
    this.state.stateVersion += 1;
    this.gate.requestSave();

    const now = Date.now();
    const sounds = this.currentSharedSounds();
    const soundsChanged = this.sharedSounds.update(sounds);
    for (const [connectionId, conn] of this.state.activeConnections) {
      const playerId = this.state.playerOf(connectionId);
      if (!playerId) continue;
      this.sendToConnection(conn, this.gameStateFor(connectionId, playerId, now, sounds));
      if (soundsChanged && !isLegacyProtocol(this.protocolOf(connectionId))) {
        this.sendToConnection(conn, sharedSoundsMessage(sounds, now));
      }
    }
  }

  /** The shared sound set changed outside a game move (a player updated their sounds). */
  syncSharedSounds(): void {
    const sounds = this.currentSharedSounds();
    if (!this.sharedSounds.update(sounds)) return;

    const now = Date.now();
    for (const [connectionId, conn] of this.state.activeConnections) {
      const playerId = this.state.playerOf(connectionId);
      if (!playerId) continue;
      // Legacy clients read the shared sounds from snapshots; newer ones get just the sounds.
      this.sendToConnection(conn, isLegacyProtocol(this.protocolOf(connectionId))
        ? this.gameStateFor(connectionId, playerId, now, sounds)
        : sharedSoundsMessage(sounds, now));
    }
  }

  /** The shared sounds a joining protocol-2 connection gets once. */
  sendSharedSounds(conn: Party.Connection): void {
    this.sendToConnection(conn, sharedSoundsMessage(this.currentSharedSounds(), Date.now()));
  }

  /** To every joined connection. Only events without private data type-check (BroadcastEvent). */
  broadcast(event: BroadcastEvent): void {
    const details = traceDetails(event);
    if (details) {
      console.log(JSON.stringify({
        level: 'info',
        msg: 'game_event_broadcast',
        roomId: this.state.game.id,
        phase: this.state.game.phase,
        paused: this.state.game.isPaused(),
        currentRound: this.state.game.currentRound,
        serverBroadcastAt: Date.now(),
        ...details,
      }));
    }

    // Who is in the room is decided now, not when the transaction commits.
    const excludedConnectionIds = Array.from(this.host.getConnections(), (connection) => connection.id)
      .filter((connectionId) => !this.state.connectionToPlayer.has(connectionId));
    const message = JSON.stringify(event);
    this.gate.deliver(() => this.host.broadcast(message, excludedConnectionIds));
  }

  sendToConnection(conn: Party.Connection, event: GameEvent): void {
    const message = JSON.stringify(event);
    this.gate.deliver(() => conn.send(message));
  }

  /** Closes after the messages already queued for the connection (e.g. the reason it is closed). */
  closeConnection(conn: Party.Connection, code: ConnectionCloseCode, reason: ConnectionCloseReason): void {
    this.gate.deliver(() => {
      if (typeof conn.close === 'function') conn.close(code, reason);
    });
  }
}
