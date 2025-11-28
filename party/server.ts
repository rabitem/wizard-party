import type * as Party from "partykit/server";

// Import from shared domain and application layers
import {
  Game,
  Player,
  Card,
  Trick,
  GamePhase,
  GameEventType,
  ClientCommandType,
  CardType,
  Suit,
  type IGameState,
  type IRoomSettings,
  type IPlayer,
  type IPauseState,
  type ClientCommand,
  type JoinGameCommand,
  type SelectTrumpCommand,
  type PlaceBidCommand,
  type PlayCardCommand,
  type SetRoomSettingsCommand,
  type SendEmoteCommand,
  type SendChatCommand,
  type RemoveBotCommand,
  type RespondUndoCommand,
  type GameEvent,
  GameError,
} from "../shared/domain";

import {
  createUseCaseRegistry,
  type IUseCaseRegistry,
  type UndoRequestState,
  type LastPlayedCard,
} from "../shared/application";

// ============================================================================
// Persisted State Interface
// ============================================================================

interface PersistedState {
  gameState: IGameState | null;
  persistentIdToPlayerId: [string, string][];
  roomSettings: IRoomSettings;
  botCounter: number;
  players: IPlayer[];
  hostId: string;
  pauseState: IPauseState | null;
}

// ============================================================================
// PartyKit Server (Thin Adapter)
// ============================================================================

export default class WizardServer implements Party.Server {
  // Game state
  private game: Game;

  // Connection mappings
  private persistentIdToPlayerId: Map<string, string> = new Map();
  private connectionToPlayer: Map<string, string> = new Map();
  private activeConnections: Map<string, Party.Connection> = new Map();

  // Room settings
  private roomSettings: IRoomSettings = {
    name: '',
    isPublic: true,
    maxPlayers: 6,
  };

  // Bot counter
  private botCounter: number = 0;

  // Undo state
  private undoRequest: UndoRequestState | null = null;
  private lastPlayedCard: LastPlayedCard | null = null;

  // State tracking
  private stateLoaded: boolean = false;

  // Use cases (injected via registry)
  private readonly useCases: IUseCaseRegistry;

  constructor(readonly room: Party.Room, useCases?: IUseCaseRegistry) {
    this.useCases = useCases ?? createUseCaseRegistry();
    this.game = new Game(room.id, '');
    this.roomSettings.name = room.id;
  }

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  async onStart() {
    await this.loadState();
    this.stateLoaded = true;
  }

  onConnect(conn: Party.Connection) {
    this.activeConnections.set(conn.id, conn);
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const command: ClientCommand = JSON.parse(message);
      console.log('[Server] Received command:', command.type);
      this.handleCommand(command, sender);
    } catch (error) {
      console.error('[Server] Error handling command:', error);
      const message = error instanceof GameError ? error.message : 'Unknown error';
      this.sendError(sender, message);
    }
  }

  onClose(conn: Party.Connection) {
    this.activeConnections.delete(conn.id);

    const playerId = this.connectionToPlayer.get(conn.id);
    if (!playerId) return;

    this.connectionToPlayer.delete(conn.id);

    // Check if player has reconnected via another connection
    const hasOtherConnection = Array.from(this.connectionToPlayer.values()).includes(playerId);
    if (hasOtherConnection) return;

    // Handle the player leaving (disconnection, not intentional)
    this.handlePlayerLeave(playerId, false);
  }

  /**
   * Handle alarm for pause timeout
   */
  async onAlarm() {
    console.log('[Server] Pause timeout alarm triggered');

    if (this.game.phase !== GamePhase.PAUSED || !this.game.pauseState) {
      console.log('[Server] Not in paused state, ignoring alarm');
      return;
    }

    // Replace disconnected player with bot and resume
    const result = this.useCases.resumeGame.executeOnTimeout({
      game: this.game,
      botCounter: this.botCounter,
    });

    if (result.wasResumed) {
      if (result.newBotCounter !== undefined) {
        this.botCounter = result.newBotCounter;
      }

      if (result.gameResumedEvent) {
        this.broadcast(result.gameResumedEvent);
      }

      this.broadcastPersonalizedState();
      this.saveState();
      this.scheduleBotAction();
    }
  }

  // ============================================================================
  // Command Handler
  // ============================================================================

  private handleCommand(command: ClientCommand, sender: Party.Connection) {
    switch (command.type) {
      case ClientCommandType.JOIN_GAME: {
        const cmd = command as JoinGameCommand;
        this.handleJoinGame(
          cmd.playerName ?? 'Player',
          cmd.persistentId ?? sender.id,
          sender,
          cmd.roomSettings
        );
        break;
      }

      case ClientCommandType.START_GAME:
        this.handleStartGame(sender);
        break;

      case ClientCommandType.SELECT_TRUMP: {
        const cmd = command as SelectTrumpCommand;
        this.handleSelectTrump(cmd.suit, sender);
        break;
      }

      case ClientCommandType.PLACE_BID: {
        const cmd = command as PlaceBidCommand;
        this.handlePlaceBid(cmd.bid, sender);
        break;
      }

      case ClientCommandType.PLAY_CARD: {
        const cmd = command as PlayCardCommand;
        this.handlePlayCard(cmd.cardId, sender);
        break;
      }

      case ClientCommandType.NEXT_ROUND:
        this.handleNextRound(sender);
        break;

      case ClientCommandType.REQUEST_STATE:
        this.sendGameState(sender);
        break;

      case ClientCommandType.SET_ROOM_SETTINGS: {
        const cmd = command as SetRoomSettingsCommand;
        this.handleSetRoomSettings(cmd.roomSettings, sender);
        break;
      }

      case ClientCommandType.SEND_EMOTE: {
        const cmd = command as SendEmoteCommand;
        this.handleSendEmote(cmd.emoteId, sender);
        break;
      }

      case ClientCommandType.SEND_CHAT: {
        const cmd = command as SendChatCommand;
        this.handleSendChat(cmd.message, sender);
        break;
      }

      case ClientCommandType.REQUEST_REMATCH:
        this.handleRequestRematch(sender);
        break;

      case ClientCommandType.ADD_BOT:
        this.handleAddBot(sender);
        break;

      case ClientCommandType.REMOVE_BOT: {
        const cmd = command as RemoveBotCommand;
        this.handleRemoveBot(cmd.botId, sender);
        break;
      }

      case ClientCommandType.REQUEST_UNDO:
        this.handleRequestUndo(sender);
        break;

      case ClientCommandType.RESPOND_UNDO: {
        const cmd = command as RespondUndoCommand;
        this.handleRespondUndo(cmd.approved, sender);
        break;
      }

      case ClientCommandType.LEAVE_GAME:
        this.handleLeaveGame(sender, true);
        break;
    }
  }

  // ============================================================================
  // Command Handlers (Thin - delegate to use cases)
  // ============================================================================

  private handleJoinGame(
    playerName: string,
    persistentId: string,
    sender: Party.Connection,
    roomSettings?: IRoomSettings
  ) {
    if (!this.activeConnections.has(sender.id)) {
      this.activeConnections.set(sender.id, sender);
    }

    const existingPlayerId = this.persistentIdToPlayerId.get(persistentId);

    const result = this.useCases.joinGame.execute({
      game: this.game,
      playerId: persistentId,
      playerName,
      persistentId,
      roomSettings,
      maxPlayers: this.roomSettings.maxPlayers,
      existingPlayerId,
    });

    // Update mappings
    this.persistentIdToPlayerId.set(persistentId, result.playerId);
    this.connectionToPlayer.set(sender.id, result.playerId);

    // Apply room settings if first player
    if (result.isHost && result.isNewPlayer && roomSettings) {
      this.roomSettings = { ...this.roomSettings, ...roomSettings };
    }

    this.broadcast(result.playerJoinedEvent);

    // Check if this reconnection should resume a paused game
    if (this.game.phase === GamePhase.PAUSED &&
        this.game.pauseState?.pausedForPlayerId === result.playerId) {
      // Player we were waiting for has reconnected - resume the game
      const resumeResult = this.useCases.resumeGame.executeOnReconnect({
        game: this.game,
        reconnectedPlayerId: result.playerId,
      });

      if (resumeResult.wasResumed) {
        // Cancel the timeout alarm
        this.room.storage.deleteAlarm();
        console.log('[Server] Cancelled pause timeout - player reconnected');

        if (resumeResult.gameResumedEvent) {
          this.broadcast(resumeResult.gameResumedEvent);
        }

        // Schedule bot action in case it's a bot's turn
        this.scheduleBotAction();
      }
    }

    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleStartGame(sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.startGame.execute({
      game: this.game,
      playerId,
    });

    this.broadcast(result.gameStartedEvent);
    this.broadcast(result.trumpRevealedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
    this.scheduleBotAction();
  }

  private handleSelectTrump(suit: Suit, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.selectTrump.execute({
      game: this.game,
      playerId,
      suit,
    });

    this.broadcast(result.trumpSelectedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
    this.scheduleBotAction();
  }

  private handlePlaceBid(bid: number, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.placeBid.execute({
      game: this.game,
      playerId,
      bid,
    });

    this.broadcast(result.bidPlacedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
    this.scheduleBotAction();
  }

  private handlePlayCard(cardId: string, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.playCard.execute({
      game: this.game,
      playerId,
      cardId,
    });

    // Track for undo (only if trick isn't complete)
    if (!result.trickCompleteEvent) {
      this.lastPlayedCard = {
        playerId,
        card: Card.fromJSON(result.card),
        previousPlayerIndex: result.previousPlayerIndex,
      };
    } else {
      this.lastPlayedCard = null;
      this.clearUndoRequest();
    }

    this.broadcast(result.cardPlayedEvent);

    if (result.trickCompleteEvent) {
      this.broadcast(result.trickCompleteEvent);
    }

    if (result.roundCompleteEvent) {
      this.broadcast(result.roundCompleteEvent);
    }

    if (result.gameCompleteEvent) {
      this.broadcast(result.gameCompleteEvent);
    }

    this.broadcastPersonalizedState();
    this.saveState();
    this.scheduleBotAction();
  }

  private handleNextRound(sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.nextRound.execute({
      game: this.game,
      playerId,
    });

    this.broadcast(result.trumpRevealedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
    this.scheduleBotAction();
  }

  private handleSetRoomSettings(settings: IRoomSettings, sender: Party.Connection) {
    const playerId = this.connectionToPlayer.get(sender.id);

    if (playerId !== this.game.hostId) {
      throw new Error('Only host can change room settings');
    }

    if (this.game.phase !== GamePhase.LOBBY) {
      throw new Error('Cannot change room settings after game started');
    }

    this.roomSettings = { ...this.roomSettings, ...settings };
    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleSendEmote(emoteId: string, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.sendEmote.execute({
      game: this.game,
      playerId,
      emoteId,
    });

    this.broadcast(result.emoteEvent);
  }

  private handleSendChat(message: string, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.sendChat.execute({
      game: this.game,
      playerId,
      message,
    });

    this.broadcast(result.chatMessageEvent);
  }

  private handleRequestRematch(sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.requestRematch.execute({
      game: this.game,
      playerId,
    });

    // Replace game instance
    this.game = result.newGame;

    this.broadcast(result.rematchStartedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleAddBot(sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.addBot.execute({
      game: this.game,
      playerId,
      maxPlayers: this.roomSettings.maxPlayers,
      botCounter: this.botCounter,
    });

    this.botCounter = result.newBotCounter;

    this.broadcast(result.playerJoinedEvent);
    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleRemoveBot(botId: string, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.removeBot.execute({
      game: this.game,
      playerId,
      botId,
    });

    this.broadcast(result.playerLeftEvent);
    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleLeaveGame(sender: Party.Connection, isIntentional: boolean) {
    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId) return;

    // Remove connection mapping
    this.connectionToPlayer.delete(sender.id);

    // Handle the leave
    this.handlePlayerLeave(playerId, isIntentional);
  }

  /**
   * Common handler for player leaving (intentional or disconnect)
   */
  private handlePlayerLeave(playerId: string, isIntentional: boolean) {
    const result = this.useCases.leaveGame.execute({
      game: this.game,
      playerId,
      isIntentional,
    });

    // Broadcast player left event
    this.broadcast(result.playerLeftEvent);

    // If game should pause, broadcast pause event and schedule alarm
    if (result.shouldPause && result.gamePausedEvent) {
      this.broadcast(result.gamePausedEvent);

      // Schedule alarm for pause timeout
      const timeoutMs = result.gamePausedEvent.timeoutDuration;
      this.room.storage.setAlarm(Date.now() + timeoutMs);
      console.log(`[Server] Scheduled pause timeout alarm for ${timeoutMs}ms`);
    }

    this.broadcastPersonalizedState();
    this.saveState();
  }

  private handleRequestUndo(sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.requestUndo.execute({
      game: this.game,
      playerId,
      lastPlayedCard: this.lastPlayedCard,
      currentUndoRequest: this.undoRequest,
    });

    this.undoRequest = result.undoRequestState;

    // Set timeout to auto-cancel
    this.undoRequest.timeoutId = setTimeout(() => {
      this.cancelUndoRequest('Request timed out');
    }, 15000);

    this.broadcast(result.undoRequestedEvent);

    // Broadcast bot auto-approvals
    for (const approval of result.botAutoApprovals) {
      this.broadcast({
        type: GameEventType.UNDO_RESPONSE,
        responderId: approval.playerId,
        responderName: approval.playerName,
        approved: approval.approved,
        timestamp: Date.now(),
      });
    }

    this.checkUndoApprovals();
  }

  private handleRespondUndo(approved: boolean, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);

    const result = this.useCases.respondUndo.execute({
      game: this.game,
      playerId,
      approved,
      undoRequest: this.undoRequest,
    });

    this.undoRequest = result.updatedUndoRequest;
    this.broadcast(result.undoResponseEvent);
    this.checkUndoApprovals();
  }

  // ============================================================================
  // Undo Helpers
  // ============================================================================

  private checkUndoApprovals() {
    if (!this.undoRequest) return;

    if (this.useCases.applyUndo.shouldApplyUndo(this.undoRequest)) {
      this.applyUndo();
      return;
    }

    if (this.useCases.applyUndo.shouldCancelUndo(this.undoRequest, this.game)) {
      this.cancelUndoRequest('Request denied');
    }
  }

  private applyUndo() {
    if (!this.undoRequest) return;

    if (this.undoRequest.timeoutId) {
      clearTimeout(this.undoRequest.timeoutId);
    }

    const result = this.useCases.applyUndo.execute({
      game: this.game,
      undoRequest: this.undoRequest,
    });

    this.broadcast(result.undoAppliedEvent);
    this.undoRequest = null;
    this.lastPlayedCard = null;
    this.broadcastPersonalizedState();
    this.saveState();
  }

  private cancelUndoRequest(reason: string) {
    if (!this.undoRequest) return;

    if (this.undoRequest.timeoutId) {
      clearTimeout(this.undoRequest.timeoutId);
    }

    this.broadcast({
      type: GameEventType.UNDO_CANCELLED,
      reason,
      timestamp: Date.now(),
    });

    this.undoRequest = null;
  }

  private clearUndoRequest() {
    if (this.undoRequest?.timeoutId) {
      clearTimeout(this.undoRequest.timeoutId);
    }
    this.undoRequest = null;
    this.lastPlayedCard = null;
  }

  // ============================================================================
  // Bot AI
  // ============================================================================

  private scheduleBotAction() {
    setTimeout(() => this.processBotTurn(), 800);
  }

  private processBotTurn() {
    const action = this.useCases.botTurn.execute({ game: this.game });

    if (action.type === 'NONE') return;

    try {
      switch (action.type) {
        case 'SELECT_TRUMP': {
          const result = this.useCases.selectTrump.execute({
            game: this.game,
            playerId: this.game.getDealer().id,
            suit: action.suit,
          });
          this.broadcast(result.trumpSelectedEvent);
          break;
        }

        case 'PLACE_BID': {
          const currentPlayer = this.game.getCurrentPlayer();
          const result = this.useCases.placeBid.execute({
            game: this.game,
            playerId: currentPlayer.id,
            bid: action.bid,
          });
          this.broadcast(result.bidPlacedEvent);
          break;
        }

        case 'PLAY_CARD': {
          const currentPlayer = this.game.getCurrentPlayer();
          const result = this.useCases.playCard.execute({
            game: this.game,
            playerId: currentPlayer.id,
            cardId: action.cardId,
          });
          this.broadcast(result.cardPlayedEvent);
          if (result.trickCompleteEvent) this.broadcast(result.trickCompleteEvent);
          if (result.roundCompleteEvent) this.broadcast(result.roundCompleteEvent);
          if (result.gameCompleteEvent) this.broadcast(result.gameCompleteEvent);
          break;
        }
      }

      this.broadcastPersonalizedState();
      this.saveState();
      this.scheduleBotAction();
    } catch (error) {
      console.error('Bot action error:', error);
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  private getPlayerId(sender: Party.Connection): string {
    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId) throw new Error('Player not found - please rejoin');
    return playerId;
  }

  private sendGameState(conn: Party.Connection) {
    const playerId = this.connectionToPlayer.get(conn.id);
    if (!playerId) return;
    this.sendGameStateToConnection(conn, playerId);
  }

  private sendGameStateToConnection(conn: Party.Connection, playerId: string) {
    const state = this.createPersonalizedState(playerId);
    this.sendToConnection(conn, {
      type: GameEventType.GAME_STATE,
      state,
      yourPlayerId: playerId,
      timestamp: Date.now(),
    });
  }

  private broadcastPersonalizedState() {
    Array.from(this.activeConnections.entries()).forEach(([connId, conn]) => {
      const playerId = this.connectionToPlayer.get(connId);
      if (playerId) {
        this.sendGameStateToConnection(conn, playerId);
      }
    });
  }

  private createPersonalizedState(playerId: string): IGameState {
    const baseState = this.game.toJSON();

    // Hide other players' hands
    baseState.players = baseState.players.map((p) => {
      if (p.id === playerId) return p;
      return {
        ...p,
        hand: p.hand.map(() => ({ id: 'hidden', type: CardType.NUMBER, suit: null, value: null })),
      };
    });

    // Include room settings (without password)
    baseState.roomSettings = {
      name: this.roomSettings.name,
      isPublic: this.roomSettings.isPublic,
      maxPlayers: this.roomSettings.maxPlayers,
    };

    return baseState;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private async loadState() {
    try {
      const stored = await this.room.storage.get<PersistedState>('gameState');
      if (!stored) return;

      console.log('[Server] Restoring persisted state');

      this.persistentIdToPlayerId = new Map(stored.persistentIdToPlayerId);
      this.roomSettings = stored.roomSettings;
      this.botCounter = stored.botCounter;

      if (stored.gameState && stored.players.length > 0) {
        this.game = new Game(this.room.id, stored.hostId);

        // Restore players
        for (const playerData of stored.players) {
          const player = new Player(playerData.id, playerData.name, playerData.isBot);
          player.score = playerData.score;
          player.bid = playerData.bid;
          player.tricksWon = playerData.tricksWon;
          player.isConnected = false;
          player.roundHistory = playerData.roundHistory;

          for (const cardData of playerData.hand) {
            player.hand.push(Card.fromJSON(cardData));
          }

          this.game.players.push(player);
        }

        // Restore game properties
        this.game.phase = stored.gameState.phase;
        this.game.currentRound = stored.gameState.currentRound;
        this.game.maxRounds = stored.gameState.maxRounds;
        this.game.trumpSuit = stored.gameState.trumpSuit;
        this.game.trumpCard = stored.gameState.trumpCard ? Card.fromJSON(stored.gameState.trumpCard) : null;
        this.game.currentPlayerIndex = stored.gameState.currentPlayerIndex;
        this.game.dealerIndex = stored.gameState.dealerIndex;
        this.game.hostId = stored.hostId;

        // Restore tricks
        if (stored.gameState.currentTrick) {
          this.game.currentTrick = new Trick(this.game.trumpSuit);
          this.game.currentTrick.cards = stored.gameState.currentTrick.cards;
          this.game.currentTrick.leadSuit = stored.gameState.currentTrick.leadSuit;
          this.game.currentTrick.winnerId = stored.gameState.currentTrick.winnerId;
        }

        this.game.completedTricks = stored.gameState.completedTricks.map((t) => {
          const trick = new Trick(this.game.trumpSuit);
          trick.cards = t.cards;
          trick.leadSuit = t.leadSuit;
          trick.winnerId = t.winnerId;
          return trick;
        });

        // Restore pause state
        this.game.pauseState = stored.pauseState ?? null;
      }

      console.log('[Server] State restored:', {
        players: this.game.players.length,
        phase: this.game.phase,
        paused: this.game.phase === GamePhase.PAUSED,
      });
    } catch (error) {
      console.error('[Server] Failed to restore state:', error);
    }
  }

  private async saveState() {
    try {
      const state: PersistedState = {
        gameState: this.game.toJSON(),
        persistentIdToPlayerId: Array.from(this.persistentIdToPlayerId.entries()),
        roomSettings: this.roomSettings,
        botCounter: this.botCounter,
        players: this.game.players.map((p) => p.toJSON()),
        hostId: this.game.hostId,
        pauseState: this.game.pauseState,
      };
      await this.room.storage.put('gameState', state);
    } catch (error) {
      console.error('[Server] Failed to save state:', error);
    }
  }

  // ============================================================================
  // Communication
  // ============================================================================

  private broadcast(event: GameEvent | object) {
    this.room.broadcast(JSON.stringify(event));
  }

  private sendToConnection(conn: Party.Connection, event: object) {
    conn.send(JSON.stringify(event));
  }

  private sendError(conn: Party.Connection, message: string) {
    this.sendToConnection(conn, {
      type: GameEventType.ERROR,
      message,
      timestamp: Date.now(),
    });
  }

  // ============================================================================
  // HTTP Handler
  // ============================================================================

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        roomId: this.room.id,
        playerCount: this.game.players.length,
        phase: this.game.phase,
        isAvailable: this.game.players.length === 0,
        maxPlayers: this.roomSettings.maxPlayers,
        roomName: this.roomSettings.name,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
