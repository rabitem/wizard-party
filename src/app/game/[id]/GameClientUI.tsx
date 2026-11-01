'use client';

import { useCallback, useMemo, useState } from 'react';
import { isGamePaused } from '@shared/domain';
import dynamic from 'next/dynamic';

// Overlays
import { ConnectionStatusOverlay, TableLoadingOverlay } from '@/presentation/components/overlays';
import { ErrorToast } from '@/presentation/components/hud';

// Game Phase UIs
import { RoundEndUI } from '@/presentation/components/RoundEndUI';
import { SettingsPanel } from '@/presentation/components/SettingsPanel';
import { StatsPanel } from '@/presentation/components/StatsPanel';
import { GamePausedOverlay } from '@/presentation/components/GamePausedOverlay';
import { SeasonalCorner } from '@/presentation/components/seasonal';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SheetProvider } from '@/presentation/components/ui';
import { getHudCssVariables, useLayoutPolicy } from '@/presentation/hooks/layout';
import { useDisplayStandings } from '@/presentation/hooks/useDisplayStandings';

import type { useGameClientState } from './useGameClientState';
import { GameHud } from './GameHud';
import { SpecialCardLayer } from './SpecialCardLayer';
import { useGameHudSettings } from './useGameHudSettings';
import { calcDerivedState, shouldShowLoadingOverlay } from './game-client-view';

// Dynamically import 3D components to avoid SSR issues
const Game3DCanvas = dynamic(
  () => import('./Game3DCanvas').then((mod) => mod.Game3DCanvas),
  { ssr: false, loading: () => null }
);

type GameClientState = ReturnType<typeof useGameClientState>;

interface GameClientUIProps {
  state: GameClientState;
  roomId: string;
}

/** Leave game confirmation modal */
function LeaveConfirmationModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative border border-amber-700/40 rounded-xl p-6 max-w-sm mx-4 shadow-2xl" style={{ background: THEME_SURFACE.MODAL_BG }}>
        <SeasonalCorner position="top-right" size={32} />
        <SeasonalCorner position="bottom-left" size={32} />
        <h3 className="text-amber-100 text-lg font-semibold mb-3" style={{ fontFamily: 'Georgia, serif' }}>Leave Game?</h3>
        <p className="text-amber-200/70 text-sm mb-6" style={{ fontFamily: 'Georgia, serif' }}>Are you sure you want to leave? The game will be paused for other players.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-amber-600/30 text-amber-200/80 hover:bg-amber-900/20 transition-colors" style={{ fontFamily: 'Georgia, serif' }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg bg-red-900/60 border border-red-700/50 text-red-100 hover:bg-red-800/70 transition-colors" style={{ fontFamily: 'Georgia, serif' }}>Leave</button>
        </div>
      </div>
    </div>
  );
}

interface RoundEndProps { gameState: NonNullable<GameClientState['gameState']>; playerId: string; showRoundEndUI: boolean; onNextRound: () => void; isConnected: boolean; sendEmote: (id: string) => void; sendChat: (msg: string) => void; isMobile: boolean }

/** Round end phase UI */
function RoundEndSection({ gameState, playerId, showRoundEndUI, onNextRound, isConnected, sendEmote, sendChat, isMobile }: RoundEndProps) {
  if (!showRoundEndUI) return null;
  return (
    <RoundEndUI
      players={gameState.players}
      currentRound={gameState.currentRound}
      maxRounds={gameState.maxRounds}
      localPlayerId={playerId}
      hostId={gameState.hostId}
      onNextRound={onNextRound}
      isConnected={isConnected}
      onSendEmote={sendEmote}
      onSendChat={sendChat}
      isMobile={isMobile}
    />
  );
}

/** Panels section (Settings, Stats) */
function PanelsSection({ state }: { state: Pick<GameClientState, 'settingsOpen' | 'statsOpen' | 'setSettingsOpen' | 'setStatsOpen' | 'handleLeaveGame' | 'sharedCustomSounds'> }) {
  return (
    <>
      <SettingsPanel isOpen={state.settingsOpen} onClose={() => state.setSettingsOpen(false)} onLeaveGame={state.handleLeaveGame} showLeaveGame sharedCustomSounds={state.sharedCustomSounds} />
      <StatsPanel isOpen={state.statsOpen} onClose={() => state.setStatsOpen(false)} />
    </>
  );
}

/** Paused overlay */
function PausedOverlaySection({ gameState, playerId }: { gameState: NonNullable<GameClientState['gameState']>; playerId: string }) {
  // The pause sits beside the phase: the table stays mounted underneath the overlay.
  if (!isGamePaused(gameState)) return null;
  return <GamePausedOverlay pauseState={gameState.pauseState ?? null} localPlayerId={playerId} />;
}

/** Error toast wrapper */
function ErrorSection({ error, clearError }: { error: string | null; clearError: () => void }) {
  if (!error) return null;
  return <ErrorToast message={error} onDismiss={clearError} />;
}

/** Leave confirmation wrapper */
function LeaveConfirmationSection({ show, onCancel, onConfirm }: { show: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!show) return null;
  return <LeaveConfirmationModal onCancel={onCancel} onConfirm={onConfirm} />;
}

export function GameClientUI({ state, roomId }: GameClientUIProps) {
  const {
    isConnected, connectionStatus, takeOverSeat, retryConnection, sessionLoaded, gameState, playerId, error, clearError,
    selectedCardId, isDraggingCard, setIsDraggingCard, settingsOpen, showLeaveConfirmation,
    isCorrectRoom, isGamePhase, localPlayer,
    playableCardIds, handAnimation, trickResult, pendingTrickResult, isTrickAnimating,
    confirmLeaveGame, cancelLeaveGame, handleCardSelect, handleCardPlay, handleHandAnimationProgress, handleCardLand,
    nextRound, sendEmote, sendChat,
    clearTrickResult, activateTrickResult,
    getOrderedCards, getCardPhysicsState, shouldShowPlayedCard, shouldAnimatePlayedCard, handlePlayedCardAnimationComplete,
  } = state;

  const hudSettings = useGameHudSettings(settingsOpen);
  // One responsive policy for every HUD, sheet and camera-preset decision (docs/client/hud-layout.md)
  const policy = useLayoutPolicy();
  const hudCssVariables = useMemo(() => getHudCssVariables(policy), [policy]);
  const standings = useDisplayStandings(gameState?.players, gameState?.currentPlayerIndex, pendingTrickResult !== null);
  // Stable props for the memoized 3D canvas: it re-renders only when what it shows changes.
  const handleDragStart = useCallback(() => setIsDraggingCard(true), [setIsDraggingCard]);
  const handleDragEnd = useCallback(() => setIsDraggingCard(false), [setIsDraggingCard]);
  const hand = localPlayer?.hand;
  const orderedCards = useMemo(() => getOrderedCards(hand ?? []), [getOrderedCards, hand]);

  // One loader for the whole page: it covers the wait for the game state and then for the 3D
  // table (bundle, renderer, textures), and is never remounted in between, so it cannot flash.
  const [tableReady, setTableReady] = useState(false);
  const handleTableReady = useCallback(() => setTableReady(true), []);
  const showGame = sessionLoaded && !shouldShowLoadingOverlay({ gameState, playerId, isCorrectRoom, isGamePhase });
  // The table unmounts with the game view and has to draw again before the loader lifts
  if (!showGame && tableReady) setTableReady(false);

  const renderGame = (validGameState: NonNullable<GameClientState['gameState']>, validPlayerId: string) => {
    const { showRoundEndUI, interactionsDisabled } = calcDerivedState({ phase: validGameState.phase, isConnected, isTrickAnimating, hasTrickResult: trickResult !== null, hasPendingTrickResult: pendingTrickResult !== null });

    return (
      <SheetProvider>
        {/* game-viewport: 100dvh (100vh fallback); the HUD CSS variables size regions and tap targets */}
        <div className="game-viewport w-full relative overflow-hidden bg-[#030308]" style={hudCssVariables} data-layout={policy.layoutClass}>
          {/* Settings & Stats Panels */}
          <PanelsSection state={state} />

          {/* 3D Game Canvas */}
          <Game3DCanvas
            gameState={validGameState}
            playerId={validPlayerId}
            selectedCardId={selectedCardId}
            playableCardIds={playableCardIds}
            onCardSelect={handleCardSelect}
            onCardPlay={handleCardPlay}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isDraggingCard={isDraggingCard}
            isMobile={policy.cameraPreset === 'mobile'}
            orderedCards={orderedCards}
            handAnimation={handAnimation}
            trickResult={trickResult}
            onCardLand={handleCardLand}
            onTrickCollectComplete={clearTrickResult}
            onAllCardsLanded={activateTrickResult}
            onHandAnimationProgress={handleHandAnimationProgress}
            isWaitingForCardsToLand={!!pendingTrickResult}
            getCardPhysicsState={getCardPhysicsState}
            shouldShowPlayedCard={shouldShowPlayedCard}
            shouldAnimatePlayedCard={shouldAnimatePlayedCard}
            onPlayedCardAnimationComplete={handlePlayedCardAnimationComplete}
            collectionAnimationMode={hudSettings.collectionAnimation}
            disableInteractions={interactionsDisabled}
            onTableReady={handleTableReady}
          />

          {/* HUD regions: status, top bar, prompts, bidding, standings, social and controls */}
          <GameHud
            state={state}
            gameState={validGameState}
            playerId={validPlayerId}
            policy={policy}
            settings={hudSettings}
            standings={standings}
            showRoundEndUI={showRoundEndUI}
            interactionsDisabled={interactionsDisabled}
          />

          {/* Trump selection and expansion special-card prompts */}
          <SpecialCardLayer gameState={validGameState} playerId={validPlayerId} isMobile={policy.compactHud} state={state} />

          {/* Round End UI */}
          <RoundEndSection gameState={validGameState} playerId={validPlayerId} showRoundEndUI={showRoundEndUI} onNextRound={nextRound} isConnected={isConnected} sendEmote={sendEmote} sendChat={sendChat} isMobile={policy.compactHud} />

          {/* Error popup */}
          <ErrorSection error={error} clearError={clearError} />

          {/* Game Paused Overlay */}
          <PausedOverlaySection gameState={validGameState} playerId={validPlayerId} />

          {/* Seat opened elsewhere, or the retries ran out: the player decides */}
          <ConnectionStatusOverlay status={connectionStatus} onTakeOver={takeOverSeat} onRetry={retryConnection} onLeave={confirmLeaveGame} />

          {/* Leave Game Confirmation Modal */}
          <LeaveConfirmationSection show={showLeaveConfirmation} onCancel={cancelLeaveGame} onConfirm={confirmLeaveGame} />
        </div>
      </SheetProvider>
    );
  };

  return (
    <>
      {showGame && gameState && playerId ? renderGame(gameState, playerId) : null}
      <TableLoadingOverlay ready={showGame && tableReady} />
    </>
  );
}
