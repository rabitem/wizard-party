'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GamePhase } from '@shared/domain';
import { useGameConnection } from '../hooks/useGameConnection';
import { useMobile } from '../hooks/useMobile';
import { useSound } from '@/lib/sounds';
import { useSession } from '../hooks/useSession';
import { useCardOrder } from '../hooks/useCardOrder';
import { useGameEffects, useKeyboardShortcuts } from '../hooks/useGameEffects';

// Overlays
import { LoadingOverlay, ReconnectingOverlay, WebGLRecoveryOverlay } from '../components/overlays';

// HUD Components
import {
  GameStatusBar,
  TurnIndicator,
  ReactionsFeed,
  HandControls,
  TopBarButtons,
  ErrorToast,
} from '../components/hud';

// 3D Components
import { Game3DScene } from '../components/three';
import { WebGLContextHandler, useWebGLContext } from '../components/WebGLContextHandler';

// Game Phase UIs
import { LobbyUI } from '../components/LobbyUI';
import { TrumpSelectionUI } from '../components/TrumpSelectionUI';
import { BiddingUI } from '../components/BiddingUI';
import { RoundEndUI } from '../components/RoundEndUI';
import { GameEndUI } from '../components/GameEndUI';
import { RoomBrowser } from '../components/RoomBrowser';
import { EmoteBar, QuickChat } from '../components/EmoteBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { StatsPanel } from '../components/StatsPanel';
import { UndoRequestUI } from '../components/UndoRequestUI';

export function GameScene() {
  const {
    gameState,
    playerId,
    isConnected,
    error,
    emotes,
    chatMessages,
    undoRequest,
    canRequestUndo,
    trickResult,
    isTrickAnimating,
    clearTrickResult,
    connect,
    disconnect,
    startGame,
    selectTrump,
    placeBid,
    playCard,
    nextRound,
    getPlayableCards,
    sendEmote,
    sendChat,
    requestRematch,
    requestUndo,
    respondUndo,
    addBot,
    removeBot,
  } = useGameConnection();

  const sound = useSound();
  const { isMobile } = useMobile();
  const { contextLost, contextKey, handleContextLost, handleContextRestored, forceRecover } = useWebGLContext();

  // Session management
  const session = useSession();

  // Card ordering
  const { handAnimation, shuffleCards, sortCards, getOrderedCards } = useCardOrder();

  // UI state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Game effects (sounds, notifications, stats)
  useGameEffects({
    gameState,
    playerId,
    emotes,
    playSound: (s) => sound.play(s),
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    gameState,
    playerId,
    selectedCardId,
    setSelectedCardId,
    setSettingsOpen,
    getPlayableCards,
  });

  // Auto-reconnect effect
  useEffect(() => {
    if (!isConnected && !session.urlRoomId) {
      session.startReconnect(connect);
    }
  }, [session.savedSession, session.sessionLoaded, isConnected, connect, session.urlRoomId, session]);

  // Clear reconnect on connection
  useEffect(() => {
    if (isConnected) {
      session.onConnected();
    }
  }, [isConnected, session]);

  // Handle error during reconnect
  useEffect(() => {
    if (error && session.isReconnecting) {
      session.onError();
    }
  }, [error, session]);

  // Convert emotes to display format
  const displayEmotes = useMemo(() => {
    return emotes.map((e) => ({
      id: e.id,
      emoteId: e.emoteId,
      playerId: e.playerId,
      playerName: e.playerName,
    }));
  }, [emotes]);

  // Convert chat messages to display format
  // Note: Filtering is now handled by the ChatDisplay component itself
  const displayChatMessages = useMemo(() => {
    return chatMessages.map((m) => ({
      id: m.id,
      playerId: m.playerId,
      playerName: m.playerName,
      message: m.message,
      timestamp: m.timestamp,
    }));
  }, [chatMessages]);

  const handleConnect = useCallback((host: string, room: string, name: string, roomSettings?: { name: string; isPublic: boolean; maxPlayers: number; password?: string }) => {
    session.saveSession(host, room, name);
    session.clearUrlParams();
    connect(host, room, name, roomSettings);
  }, [connect, session]);

  const handleLeaveLobby = useCallback(() => {
    session.clearSession();
    disconnect();
  }, [disconnect, session]);

  // Block card interactions while showing trick result
  const isWaitingForTrickResult = trickResult !== null;

  const playableCardIds = useMemo(() => {
    if (isWaitingForTrickResult) return [];
    return getPlayableCards().map((c) => c.id);
  }, [getPlayableCards, isWaitingForTrickResult]);

  const handleCardSelect = useCallback((cardId: string) => {
    if (isWaitingForTrickResult) return;
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  }, [isWaitingForTrickResult]);

  const handleCardPlay = useCallback((cardId: string) => {
    if (isWaitingForTrickResult) return;
    playCard(cardId);
    sound.play('cardPlay');
    setSelectedCardId(null);
  }, [isWaitingForTrickResult, playCard, sound]);

  // Get local player
  const localPlayer = gameState?.players.find((p) => p.id === playerId) ?? null;

  // Shuffle/sort handlers
  const handleShuffle = useCallback(() => {
    if (localPlayer) {
      shuffleCards(localPlayer.hand, () => sound.play('cardShuffle'));
    }
  }, [localPlayer, shuffleCards, sound]);

  const handleSort = useCallback(() => {
    if (localPlayer) {
      sortCards(localPlayer.hand, () => sound.play('cardSort'));
    }
  }, [localPlayer, sortCards, sound]);

  // Determine which view to show
  const showLoading = !session.sessionLoaded;
  const showReconnecting = session.savedSession && session.isReconnecting && !isConnected;
  const showRoomBrowser = !showLoading && !showReconnecting && (!isConnected || !gameState || !playerId);
  const showGame = isConnected && gameState && playerId;

  const isDealer = showGame ? gameState.dealerIndex === gameState.players.findIndex((p) => p.id === playerId) : false;
  const canStart = showGame ? gameState.players.length >= 3 && gameState.players.length <= 6 : false;

  return (
    <div className="w-full h-screen relative overflow-hidden bg-[#030308]">
      {/* Loading overlay */}
      {showLoading && <LoadingOverlay />}

      {/* Reconnecting overlay */}
      {showReconnecting && session.savedSession && (
        <ReconnectingOverlay
          playerName={session.savedSession.name}
          roomId={session.savedSession.room}
          onCancel={session.clearSession}
        />
      )}

      {/* Room browser overlay */}
      {showRoomBrowser && (
        <div className="absolute inset-0 z-50">
          <RoomBrowser
            onJoin={handleConnect}
            initialRoomId={session.urlRoomId}
            initialHost={session.urlHost}
          />
        </div>
      )}

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <StatsPanel isOpen={statsOpen} onClose={() => setStatsOpen(false)} />

      {/* Top-right buttons */}
      <TopBarButtons
        onStatsOpen={() => setStatsOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* Error toast */}
      {error && <ErrorToast message={error} />}

      {/* Game status bar (round/trump) */}
      {showGame && gameState.phase !== GamePhase.LOBBY && (
        <GameStatusBar
          currentRound={gameState.currentRound}
          maxRounds={gameState.maxRounds}
          trumpSuit={gameState.trumpSuit}
        />
      )}

      {/* 3D Game Canvas */}
      {showGame && gameState && playerId && !contextLost && (
        <Canvas
          key={`game-canvas-${contextKey}`}
          shadows={false}
          className="touch-none"
          dpr={[1, 1.5]}
          gl={{
            antialias: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
            alpha: false,
            preserveDrawingBuffer: true,
          }}
          onCreated={({ gl }) => {
            gl.getContext().canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
          }}
        >
          <WebGLContextHandler
            onContextLost={handleContextLost}
            onContextRestored={handleContextRestored}
          />
          <Game3DScene
            gameState={gameState}
            playerId={playerId}
            selectedCardId={selectedCardId}
            playableCardIds={playableCardIds}
            onCardSelect={handleCardSelect}
            onCardPlay={handleCardPlay}
            onDragStart={() => setIsDraggingCard(true)}
            onDragEnd={() => setIsDraggingCard(false)}
            isDraggingCard={isDraggingCard}
            isMobile={isMobile}
            displayEmotes={displayEmotes}
            displayChatMessages={displayChatMessages}
            orderedCards={getOrderedCards(localPlayer?.hand ?? [])}
            handAnimation={handAnimation}
            trickResult={trickResult}
          />
        </Canvas>
      )}

      {/* WebGL Context Lost Overlay */}
      {contextLost && showGame && (
        <WebGLRecoveryOverlay onForceRecover={forceRecover} />
      )}

      {/* Lobby UI */}
      {showGame && gameState.phase === GamePhase.LOBBY && (
        <LobbyUI
          players={gameState.players}
          localPlayerId={playerId}
          hostId={gameState.hostId}
          canStart={canStart}
          onStartGame={startGame}
          onLeaveLobby={handleLeaveLobby}
          roomId={gameState.id}
          onAddBot={addBot}
          onRemoveBot={removeBot}
        />
      )}

      {/* Trump Selection UI */}
      {showGame && gameState.phase === GamePhase.TRUMP_SELECTION && (
        <TrumpSelectionUI isDealer={isDealer} onSelectTrump={selectTrump} />
      )}

      {/* Bidding UI */}
      {showGame && gameState.phase === GamePhase.BIDDING && localPlayer && (
        <BiddingUI
          players={gameState.players}
          localPlayerId={playerId}
          currentPlayerIndex={gameState.currentPlayerIndex}
          maxBid={gameState.currentRound}
          trumpSuit={gameState.trumpSuit}
          forbiddenBid={gameState.forbiddenBid}
          onPlaceBid={placeBid}
        />
      )}

      {/* Round End UI - wait for trick animation to complete before showing */}
      {showGame && gameState.phase === GamePhase.ROUND_END && !isTrickAnimating && (
        <RoundEndUI
          players={gameState.players}
          currentRound={gameState.currentRound}
          maxRounds={gameState.maxRounds}
          localPlayerId={playerId}
          hostId={gameState.hostId}
          onNextRound={nextRound}
        />
      )}

      {/* Game End UI - wait for trick animation to complete before showing */}
      {showGame && gameState.phase === GamePhase.GAME_END && !isTrickAnimating && (
        <GameEndUI
          players={gameState.players}
          localPlayerId={playerId}
          onPlayAgain={requestRematch}
        />
      )}

      {/* Turn Indicator */}
      {showGame && (gameState.phase === GamePhase.PLAYING || trickResult) && (
        <TurnIndicator
          trickResult={trickResult}
          currentPlayerName={gameState.players[gameState.currentPlayerIndex]?.name ?? ''}
          isMyTurn={gameState.players[gameState.currentPlayerIndex]?.id === playerId}
          localPlayerId={playerId}
          isMobile={isMobile}
          onTrickComplete={clearTrickResult}
        />
      )}

      {/* Emote bar and quick chat */}
      {showGame && gameState.phase !== GamePhase.LOBBY && (
        <div className={`absolute flex items-center gap-2 z-20 ${isMobile ? 'bottom-3 right-4' : 'bottom-6 left-4'}`}>
          <EmoteBar onSendEmote={sendEmote} />
          {!isMobile && <QuickChat onSendMessage={sendChat} />}
        </div>
      )}

      {/* Reactions feed + Hand controls */}
      {showGame && (
        gameState.phase === GamePhase.BIDDING ||
        gameState.phase === GamePhase.TRUMP_SELECTION ||
        gameState.phase === GamePhase.PLAYING
      ) && (
        <div className={`absolute flex flex-col items-end gap-2 z-20 ${isMobile ? 'bottom-16 right-4' : 'bottom-6 right-4'}`}>
          <ReactionsFeed emotes={displayEmotes} chatMessages={displayChatMessages} />
          <HandControls onShuffle={handleShuffle} onSort={handleSort} />
        </div>
      )}

      {/* Undo Request UI */}
      {showGame && gameState.phase === GamePhase.PLAYING && (
        <UndoRequestUI
          undoRequest={undoRequest}
          localPlayerId={playerId}
          onRequestUndo={requestUndo}
          onRespondUndo={respondUndo}
          canRequestUndo={canRequestUndo}
        />
      )}
    </div>
  );
}
