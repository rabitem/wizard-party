import type * as Party from "../runtime";
import {
  ConnectionCloseCode,
  ConnectionCloseReason,
  GameError,
  GameEventType,
  LEGACY_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  type IRoomSettings,
  type PlayerGraceRestoredEvent,
  type SessionEvent,
} from "../../shared/domain";
import { claimSeat, usesSessionTokens } from "../../shared/application";
import type { ServerContext } from "../utils/types";
import { pauseForDisconnectedHuman } from "../utils/reconnect-recovery";
import { issueSessionToken, seatSessionStore } from "../session/seat-sessions";
import { applyRoomSettings } from "./settings-handlers";
import { broadcastHostChanged } from "./player-handlers";

/**
 * Deduplication window for join requests (milliseconds). It stays below the server's disconnect
 * debounce (SERVER_DISCONNECT_DEBOUNCE_MS), so a seat that joined this recently can be neither in
 * a lobby grace nor the player a pause waits for.
 */
const JOIN_DEDUP_WINDOW_MS = 2000;

/** Cleanup threshold for stale join entries (1 minute) */
const JOIN_CLEANUP_THRESHOLD_MS = 60000;

/** What a JOIN_GAME carries besides the player's name and persistent id. */
export interface JoinOptions {
  /** Settings for a room this join creates (first player only). */
  roomSettings?: IRoomSettings;
  /** The seat's secret from an earlier SESSION message. */
  sessionToken?: string;
  /** Absent: the legacy protocol 1 (seat id = persistent id, no token). */
  protocolVersion?: number;
  /** A seat the caller already proved this join holds (a verified tournament ticket). */
  attestedPlayerId?: string;
}

function cleanupStaleJoins(ctx: ServerContext): void {
  const now = Date.now();
  for (const [persistentId, timestamp] of ctx.recentJoins) {
    if (now - timestamp > JOIN_CLEANUP_THRESHOLD_MS) {
      ctx.recentJoins.delete(persistentId);
    }
  }
}

/** Binds the connection to the seat and closes any other connection of the same seat. */
function claimConnectionForPlayer(
  ctx: ServerContext,
  sender: Party.Connection,
  playerId: string
): void {
  if (!ctx.activeConnections.has(sender.id)) {
    ctx.activeConnections.set(sender.id, sender);
  }

  for (const [connectionId, mappedPlayerId] of ctx.connectionToPlayer) {
    if (mappedPlayerId === playerId && connectionId !== sender.id) {
      const supersededConnection = ctx.activeConnections.get(connectionId);
      if (supersededConnection) {
        ctx.closeConnection(supersededConnection, ConnectionCloseCode.SUPERSEDED, ConnectionCloseReason.SUPERSEDED);
      }
      ctx.connectionToPlayer.delete(connectionId);
      ctx.activeConnections.delete(connectionId);
    }
  }

  ctx.connectionToPlayer.set(sender.id, playerId);
}

function cancelPendingDisconnect(ctx: ServerContext, playerId: string): void {
  if (ctx.cancelPendingDisconnect(playerId)) {
    console.log(`[Server] Cancelled pending disconnect for ${playerId} (player rejoined)`);
  }
}

/** Tells a protocol-2 client which seat it holds and the secret that resumes it. */
function sendSession(ctx: ServerContext, sender: Party.Connection, playerId: string, protocolVersion: number): void {
  if (!usesSessionTokens(protocolVersion)) return;
  const event: SessionEvent = {
    type: GameEventType.SESSION,
    playerId,
    sessionToken: issueSessionToken(ctx, playerId),
    protocolVersion: PROTOCOL_VERSION,
    timestamp: Date.now(),
  };
  ctx.sendToConnection(sender, event);
}

function handleGraceRestore(
  ctx: ServerContext,
  playerId: string,
  playerName: string
): boolean {
  const graceResult = ctx.game.restoreGracedPlayer(playerId);
  if (!graceResult.restored) return false;

  const graceRestoredEvent: PlayerGraceRestoredEvent = {
    type: GameEventType.PLAYER_GRACE_RESTORED,
    playerId,
    playerName,
    isHost: graceResult.shouldRestoreHost,
    timestamp: Date.now(),
  };
  ctx.telemetry.capture([graceRestoredEvent], ctx.game);
  ctx.broadcast(graceRestoredEvent);
  return true;
}

function handlePausedGameResume(ctx: ServerContext, playerId: string): void {
  if (ctx.game.pauseState?.pausedForPlayerId !== playerId) return;

  const timeoutDuration = ctx.game.pauseState.timeoutDuration;
  const resumeResult = ctx.useCases.resumeGame.executeOnReconnect({
    game: ctx.game,
    reconnectedPlayerId: playerId,
  });

  if (resumeResult.wasResumed) {
    const nextPauseEvent = pauseForDisconnectedHuman(ctx, { timeoutDuration });
    if (nextPauseEvent) {
      console.log(
        `[Server] Game remains paused for disconnected player ${nextPauseEvent.pausedForPlayerId}`
      );
      return;
    }

    console.log('[Server] Resumed - the awaited player reconnected');
    if (resumeResult.gameResumedEvent) ctx.broadcast(resumeResult.gameResumedEvent);
  }
}

/**
 * A seat that joined moments ago joins again (a reconnect race, a double-sent JOIN): move it to
 * this connection without running the join use case again.
 */
function rejoinRecentSeat(
  ctx: ServerContext,
  persistentId: string,
  playerId: string,
  sender: Party.Connection,
  protocolVersion: number
): boolean {
  const lastJoinTime = ctx.recentJoins.get(persistentId);
  if (!lastJoinTime || Date.now() - lastJoinTime >= JOIN_DEDUP_WINDOW_MS) return false;

  const player = ctx.game.getPlayer(playerId);
  // A seat a bot took over meanwhile (a deliberate leave) is reclaimed by the full join.
  if (!player || player.isBot) return false;

  console.log(`[Server] Recent join detected for ${playerId}, sending current state`);
  claimConnectionForPlayer(ctx, sender, playerId);
  cancelPendingDisconnect(ctx, playerId);
  sendSession(ctx, sender, playerId, protocolVersion);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
  return true;
}

function joinSeat(
  ctx: ServerContext,
  playerName: string,
  persistentId: string,
  sender: Party.Connection,
  options: JoinOptions
): void {
  const protocolVersion = options.protocolVersion ?? LEGACY_PROTOCOL_VERSION;
  const claim = claimSeat(
    { persistentId, sessionToken: options.sessionToken, protocolVersion, attestedPlayerId: options.attestedPlayerId },
    seatSessionStore(ctx)
  );
  const existingPlayerId = claim.kind === 'resume' ? claim.playerId : undefined;
  if (existingPlayerId && rejoinRecentSeat(ctx, persistentId, existingPlayerId, sender, protocolVersion)) return;

  if (!ctx.activeConnections.has(sender.id)) {
    ctx.activeConnections.set(sender.id, sender);
  }

  if (existingPlayerId) cancelPendingDisconnect(ctx, existingPlayerId);

  // A protocol-2 seat gets an opaque id; a legacy seat is still named by its persistent id.
  const newSeatId = usesSessionTokens(protocolVersion) ? ctx.sessionCredentials.createSeatId() : persistentId;

  if (ctx.game.players.length === 0 && options.roomSettings) {
    applyRoomSettings(ctx, options.roomSettings, existingPlayerId ?? newSeatId);
  }

  const result = ctx.useCases.joinGame.execute({
    game: ctx.game,
    playerId: newSeatId,
    playerName,
    persistentId,
    roomSettings: options.roomSettings,
    maxPlayers: ctx.roomSettings.maxPlayers,
    existingPlayerId,
  });

  ctx.persistentIdToPlayerId.set(persistentId, result.playerId);
  claimConnectionForPlayer(ctx, sender, result.playerId);
  ctx.recentJoins.set(persistentId, Date.now());
  sendSession(ctx, sender, result.playerId, protocolVersion);

  const wasGraced = ctx.game.isPlayerGraced(result.playerId);
  if (wasGraced) {
    if (!handleGraceRestore(ctx, result.playerId, result.playerJoinedEvent.playerName)) {
      ctx.broadcast(result.playerJoinedEvent);
    }
  } else if (result.isNewPlayer) {
    ctx.broadcast(result.playerJoinedEvent);
  }
  if (result.newHostId) broadcastHostChanged(ctx, result.newHostId);

  handlePausedGameResume(ctx, result.playerId);

  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

/**
 * Handle JOIN_GAME: take a new seat or resume one (see claimSeat for who may resume which seat).
 */
export function handleJoinGame(
  ctx: ServerContext,
  playerName: string,
  persistentId: string,
  sender: Party.Connection,
  options: JoinOptions = {}
): void {
  cleanupStaleJoins(ctx);

  if (ctx.processingJoins.has(persistentId)) {
    console.log(`[Server] Duplicate join in progress for ${persistentId}, ignoring`);
    return;
  }

  ctx.processingJoins.add(persistentId);
  try {
    joinSeat(ctx, playerName, persistentId, sender, options);
  } catch (error) {
    if (error instanceof GameError) {
      console.log(`[Server] Join failed: ${error.code} - ${error.message}`);
      ctx.sendError(sender, error.message, error.code, error);
    } else {
      console.error(`[Server] Unexpected error joining game:`, error);
      ctx.sendError(sender, 'Failed to join game', undefined, error);
    }
  } finally {
    ctx.processingJoins.delete(persistentId);
  }
}
