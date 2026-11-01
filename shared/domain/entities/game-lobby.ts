/**
 * Game lobby layer: seats, rulesets, lobby grace periods, the host invariant, seat
 * takeover by bots and the pause while a player in a running game reconnects.
 */

import { GameCore } from './game-core';
import { Player } from './player';
import { ROOM_PLAYER_LIMITS } from './room-settings';
import type { IGraceState } from './game.types';
import { GamePhase } from '../value-objects/game-phase';
import { ensureRulesetConfig } from '../value-objects/ruleset-config';
import { PhaseManager } from '../services/phase-manager';
import { PlayerNameService } from '../services/player-name.service';
import {
  GameAlreadyStartedError,
  GamePausedError,
  InvalidPhaseError,
  MaxPlayersReachedError,
  PlayerAlreadyInGameError,
  PlayerNameTakenError,
  PlayerNotFoundError,
} from '../errors';

/** How long a disconnected player keeps their lobby seat or pauses a game (ms). */
export const DEFAULT_GRACE_DURATION_MS = 120000;

function isConnectedHuman(player: Player): boolean {
  return !player.isBot && player.isConnected;
}

export abstract class GameLobby extends GameCore {
  /**
   * Default grace period duration for lobby disconnects (120 seconds)
   */
  static readonly DEFAULT_GRACE_DURATION = DEFAULT_GRACE_DURATION_MS;

  // ==========================================================================
  // Seats
  // ==========================================================================

  /**
   * Add a player to the game (only in LOBBY phase)
   * Validates: phase, max players, unique ID, and unique name (case-insensitive)
   */
  addPlayer(player: Player): void {
    if (this.phase !== GamePhase.LOBBY) throw new GameAlreadyStartedError();
    if (this.players.length >= ROOM_PLAYER_LIMITS.MAX) throw new MaxPlayersReachedError(ROOM_PLAYER_LIMITS.MAX);
    if (this.players.some((p) => p.id === player.id)) throw new PlayerAlreadyInGameError(player.id);
    if (!PlayerNameService.isUniqueInGame(player.name, this.players)) {
      throw new PlayerNameTakenError(player.name);
    }
    this.players.push(player);
  }

  /**
   * Check if a player name is available in this game
   * @param excludePlayerId - Optional player ID to exclude (for reconnection)
   */
  isNameAvailable(name: string, excludePlayerId?: string): boolean {
    return PlayerNameService.isUniqueInGame(name, this.players, excludePlayerId);
  }

  removePlayer(playerId: string): void {
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index !== -1) this.players.splice(index, 1);
  }

  /**
   * Remove a player from the lobby and block them from rejoining it. `rejoinIdentities` are the
   * other identities the player could come back with (the browser ids behind the seat).
   */
  kickPlayer(playerId: string, rejoinIdentities: readonly string[] = []): void {
    this.graceStates.delete(playerId);
    this.removePlayer(playerId);
    this.kickedPlayerIds.add(playerId);
    for (const identity of rejoinIdentities) this.kickedPlayerIds.add(identity);
  }

  isPlayerKicked(playerId: string): boolean {
    return this.kickedPlayerIds.has(playerId);
  }

  transferHost(newHostId: string): void {
    if (!this.getPlayer(newHostId)) throw new PlayerNotFoundError(newHostId);
    this.hostId = newHostId;
  }

  getConnectedHumanCount(): number {
    return this.players.filter((p) => p.isConnected && !p.isBot).length;
  }

  // ==========================================================================
  // Starting conditions
  // ==========================================================================

  /**
   * Set the ruleset configuration (only allowed in LOBBY phase)
   */
  setRulesetConfig(config: unknown): void {
    if (this.phase !== GamePhase.LOBBY) throw new GameAlreadyStartedError();
    this.rulesetConfig = ensureRulesetConfig(config);
  }

  /**
   * Check if game can start (3-6 players, nobody reconnecting)
   */
  canStart(): boolean {
    return !this.hasDisconnectedHumanPlayers() &&
      this.players.length >= ROOM_PLAYER_LIMITS.MIN &&
      this.players.length <= ROOM_PLAYER_LIMITS.MAX;
  }

  /**
   * Count participants available to start. Bots do not need WebSocket connections.
   */
  getStartablePlayerCount(): number {
    return this.players.filter((player) => player.isBot || player.isConnected).length;
  }

  /**
   * Lobby games must not start while a human player is still in reconnect grace.
   */
  hasDisconnectedHumanPlayers(): boolean {
    return this.players.some((player) => !player.isBot && !player.isConnected);
  }

  // ==========================================================================
  // Pause / resume (a player dropped out of a running game)
  // ==========================================================================

  /**
   * Check if game is in an active (pausable) state
   */
  isActiveGame(): boolean {
    return PhaseManager.isActivePhase(this.phase);
  }

  /**
   * Wait for a disconnected player. The phase stays as it is (the table freezes, nothing is
   * taken off it); moves are refused and nobody is timed until the game resumes.
   */
  pause(playerId: string, playerName: string, timeoutDuration: number = DEFAULT_GRACE_DURATION_MS): void {
    if (!this.isActiveGame()) throw new InvalidPhaseError('an active game phase', this.phase);
    if (this.pauseState) throw new GamePausedError(this.pauseState.pausedForPlayerName);
    this.pauseState = {
      pausedForPlayerId: playerId,
      pausedForPlayerName: playerName,
      pausedAt: this.clock.now(),
      previousPhase: this.phase,
      timeoutDuration,
    };
    this.clearTurnTimer();
  }

  /** Continue where the table stopped; the current decision gets a fresh timer. */
  resume(): void {
    if (!this.pauseState) throw new InvalidPhaseError('a paused game', this.phase);
    this.pauseState = null;
    // The scores were on screen for the pause, not for the round-end wait: that starts over.
    if (this.phase === GamePhase.ROUND_END) this.roundEndedAt = this.clock.now();
    this.restartTurnTimerForCurrentTurn();
  }

  /** Remaining time before the pause times out (ms). */
  getPauseTimeRemaining(): number {
    if (!this.pauseState) return 0;
    const elapsed = this.clock.now() - this.pauseState.pausedAt;
    return Math.max(0, this.pauseState.timeoutDuration - elapsed);
  }

  /** True once the pause ran out (false when the game is not paused). */
  isPauseTimedOut(): boolean {
    return this.pauseState !== null && this.getPauseTimeRemaining() <= 0;
  }

  // ==========================================================================
  // Seat takeover and host
  // ==========================================================================

  /**
   * A bot takes over a human seat (the player left, or did not come back in time). The seat keeps
   * its hand, bid and score; its human can take it back by rejoining (Player.reclaimByHuman).
   */
  replaceWithBot(playerId: string): Player {
    const player = this.getPlayer(playerId);
    if (!player) throw new PlayerNotFoundError(playerId);
    player.handOverToBot();
    return player;
  }

  /**
   * Host invariant: the host is a connected human whenever one is seated; otherwise a human who
   * may still come back; otherwise the seat as it is (a table of bots needs no host, the room
   * advances it on its own). Call after every change of who is connected or who is a bot.
   * Returns the new host's id when the host changed.
   */
  ensureHost(): string | null {
    const current = this.getPlayer(this.hostId);
    if (current && isConnectedHuman(current)) return null;
    const next = this.players.find(isConnectedHuman) ??
      (current && !current.isBot ? current : this.players.find((p) => !p.isBot)) ??
      current ??
      this.players[0];
    if (!next || next.id === this.hostId) return null;
    this.hostId = next.id;
    return next.id;
  }

  // ==========================================================================
  // Lobby grace period
  // ==========================================================================

  /**
   * Put a player into grace period (lobby disconnect). The seat is kept, marked
   * disconnected, until the player rejoins or the grace expires.
   */
  gracePlayer(playerId: string, duration: number = DEFAULT_GRACE_DURATION_MS): void {
    if (this.phase !== GamePhase.LOBBY) throw new InvalidPhaseError(GamePhase.LOBBY, this.phase);
    const player = this.getPlayer(playerId);
    if (!player) throw new PlayerNotFoundError(playerId);

    this.graceStates.set(playerId, {
      playerId,
      playerName: player.name,
      gracedAt: this.clock.now(),
      graceDuration: duration,
      wasHost: this.hostId === playerId,
    });
    player.isConnected = false;
  }

  /** Remove a player from grace (reconnected or grace expired). */
  removeFromGrace(playerId: string): IGraceState | undefined {
    const graceState = this.graceStates.get(playerId);
    this.graceStates.delete(playerId);
    return graceState;
  }

  isPlayerGraced(playerId: string): boolean {
    return this.graceStates.has(playerId);
  }

  getGraceState(playerId: string): IGraceState | undefined {
    return this.graceStates.get(playerId);
  }

  /** Remaining grace time for a player (ms). */
  getGraceTimeRemaining(playerId: string): number {
    const graceState = this.graceStates.get(playerId);
    if (!graceState) return 0;
    const elapsed = this.clock.now() - graceState.gracedAt;
    return Math.max(0, graceState.graceDuration - elapsed);
  }

  isGraceExpired(playerId: string): boolean {
    return this.isPlayerGraced(playerId) && this.getGraceTimeRemaining(playerId) <= 0;
  }

  /**
   * Restore a graced player who reconnected in time. Host status comes back when
   * they were host and the seat was not handed to a connected player meanwhile.
   */
  restoreGracedPlayer(playerId: string): { restored: boolean; shouldRestoreHost: boolean } {
    const graceState = this.graceStates.get(playerId);
    if (!graceState) return { restored: false, shouldRestoreHost: false };

    const player = this.getPlayer(playerId);
    this.graceStates.delete(playerId);
    if (!player) return { restored: false, shouldRestoreHost: false };

    player.isConnected = true;
    const shouldRestoreHost = graceState.wasHost && (
      this.hostId === playerId ||
      !this.getPlayer(this.hostId)?.isConnected
    );
    return { restored: true, shouldRestoreHost };
  }
}
