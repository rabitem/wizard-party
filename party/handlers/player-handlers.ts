import type * as Party from "../runtime";
import {
  ConnectionCloseCode,
  ConnectionCloseReason,
  GameEventType,
  type PlayerLeftEvent,
  type PlayerGraceExpiredEvent,
  type HostChangedEvent,
} from "../../shared/domain";
import type { ServerContext } from "../utils/types";
import { getPlayerId } from "../utils/helpers";
import { forgetSeatCredentials, persistentIdsOf } from "../session/seat-sessions";
import { ROOM_TIMING } from "../config/room-timing.config";

export function handleAddBot(
  ctx: ServerContext,
  sender: Party.Connection,
  difficulty?: 1 | 2 | 3 | 4 | 5
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.addBot.execute({
    game: ctx.game,
    playerId,
    maxPlayers: ctx.roomSettings.maxPlayers,
    botCounter: ctx.botCounter,
    difficulty,
  });

  ctx.setBotCounter(result.newBotCounter);

  ctx.broadcast(result.playerJoinedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleRemoveBot(
  ctx: ServerContext,
  botId: string,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.removeBot.execute({
    game: ctx.game,
    playerId,
    botId,
  });

  ctx.broadcast(result.playerLeftEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

/** Tells the table who hosts now (after a transfer or the host invariant moved it). */
export function broadcastHostChanged(ctx: Pick<ServerContext, 'broadcast'>, hostId: string): void {
  const event: HostChangedEvent = {
    type: GameEventType.HOST_CHANGED,
    hostId,
    timestamp: Date.now(),
  };
  ctx.broadcast(event);
}

export function handleSetReady(
  ctx: ServerContext,
  ready: unknown,
  sender: Party.Connection
): void {
  if (typeof ready !== 'boolean') {
    throw new Error('Ready must be true or false');
  }
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.setReady.execute({
    game: ctx.game,
    playerId,
    ready,
  });

  if (!result.changed) return;
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

/**
 * The host removes a player from the lobby. The kicked player is told (PLAYER_KICKED reaches them
 * too), then their connections are closed.
 */
export function handleKickPlayer(
  ctx: ServerContext,
  targetPlayerId: unknown,
  sender: Party.Connection
): void {
  if (typeof targetPlayerId !== 'string' || targetPlayerId.length === 0) {
    throw new Error('Player to remove is required');
  }
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.kickPlayer.execute({
    game: ctx.game,
    playerId,
    targetPlayerId,
    // The browser ids behind the seat: a kicked player must not come back under a new seat id.
    rejoinIdentities: persistentIdsOf(ctx, targetPlayerId),
  });

  const kickedConnections: Party.Connection[] = [];
  for (const [connectionId, mappedPlayerId] of ctx.connectionToPlayer) {
    if (mappedPlayerId !== targetPlayerId) continue;
    const connection = ctx.activeConnections.get(connectionId);
    if (connection) kickedConnections.push(connection);
  }

  ctx.cancelPendingDisconnect(targetPlayerId);

  // Broadcast while the kicked player is still mapped, so they learn why they are leaving.
  ctx.broadcast(result.playerKickedEvent);
  removePlayerSessionMappings(ctx, targetPlayerId);
  for (const connection of kickedConnections) {
    ctx.closeConnection(connection, ConnectionCloseCode.KICKED, ConnectionCloseReason.KICKED);
  }

  // The room re-arms its alarm from the state, dropping a grace expiry the kicked player had.
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleTransferHost(
  ctx: ServerContext,
  targetPlayerId: unknown,
  sender: Party.Connection
): void {
  if (typeof targetPlayerId !== 'string' || targetPlayerId.length === 0) {
    throw new Error('New host is required');
  }
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.transferHost.execute({
    game: ctx.game,
    playerId,
    targetPlayerId,
  });

  ctx.broadcast(result.hostChangedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

function removePlayerSessionMappings(ctx: ServerContext, playerId: string): void {
  for (const [connectionId, mappedPlayerId] of ctx.connectionToPlayer) {
    if (mappedPlayerId === playerId) {
      ctx.connectionToPlayer.delete(connectionId);
      ctx.activeConnections.delete(connectionId);
    }
  }

  for (const persistentId of forgetSeatCredentials(ctx, playerId)) {
    ctx.recentJoins.delete(persistentId);
    ctx.processingJoins.delete(persistentId);
  }
}

export function handleLeaveGame(
  ctx: ServerContext,
  sender: Party.Connection,
  isIntentional: boolean
): void {
  const playerId = ctx.connectionToPlayer.get(sender.id);
  if (!playerId) return;

  ctx.connectionToPlayer.delete(sender.id);
  handlePlayerLeave(ctx, playerId, isIntentional);
}

/**
 * Common handler for player leaving (intentional or disconnect). A deliberate leave from a running
 * game hands the seat to a bot at once (the player keeps the credential that takes it back); only a
 * dropped connection pauses the table. The room arms the grace and pause deadlines from the state.
 */
export function handlePlayerLeave(
  ctx: ServerContext,
  playerId: string,
  isIntentional: boolean
): void {
  const result = ctx.useCases.leaveGame.execute({
    game: ctx.game,
    playerId,
    isIntentional,
    pauseTimeoutDuration: ROOM_TIMING.RECONNECT_WINDOW_MS,
    graceTimeoutDuration: ROOM_TIMING.RECONNECT_WINDOW_MS,
  });

  if (result.playerLeftEvent) ctx.broadcast(result.playerLeftEvent);
  if (result.wasRemoved) removePlayerSessionMappings(ctx, playerId);
  if (result.newHostId) broadcastHostChanged(ctx, result.newHostId);
  if (result.shouldGrace && result.playerGracedEvent) ctx.broadcast(result.playerGracedEvent);
  if (result.shouldPause && result.gamePausedEvent) ctx.broadcast(result.gamePausedEvent);
  if (result.replacedWithBot) console.log(`[Server] A bot took over the seat of ${playerId}`);

  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

/** A graced player did not reconnect in time: the seat is removed. */
export function handleGraceTimeout(
  ctx: ServerContext,
  playerId: string
): void {
  const graceState = ctx.game.getGraceState(playerId);
  if (!graceState) {
    console.log(`[Server] Grace timeout for ${playerId} but no grace state found`);
    return;
  }

  const playerName = graceState.playerName;

  ctx.game.removeFromGrace(playerId);
  ctx.game.removePlayer(playerId);

  // The seat is gone: its persistent ids and session token open nothing any more.
  forgetSeatCredentials(ctx, playerId);

  const newHostId = ctx.game.ensureHost() ?? undefined;

  const graceExpiredEvent: PlayerGraceExpiredEvent = {
    type: GameEventType.PLAYER_GRACE_EXPIRED,
    playerId,
    playerName,
    newHostId,
    timestamp: Date.now(),
  };
  ctx.broadcast(graceExpiredEvent);

  // Also broadcast player left event for compatibility
  const playerLeftEvent: PlayerLeftEvent = {
    type: GameEventType.PLAYER_LEFT,
    playerId,
    timestamp: Date.now(),
  };
  ctx.telemetry.capture([graceExpiredEvent, playerLeftEvent], ctx.game);
  ctx.broadcast(playerLeftEvent);
  if (newHostId) broadcastHostChanged(ctx, newHostId);

  ctx.broadcastPersonalizedState();
  ctx.saveState();
}
