'use client';

import { useLayoutEffect, useMemo } from 'react';
import { GamePhase } from '@shared/domain';
import type { SandboxController, SandboxGameHandles } from '@/presentation/components/sandbox';
import { GameClientUI } from '../../game/[id]/GameClientUI';
import { useGameClientState } from '../../game/[id]/useGameClientState';

type GameClientState = ReturnType<typeof useGameClientState>;

/**
 * Wraps the lifecycle callbacks the 3D scene fires so the recorder sees them.
 * Each wrapper is recreated exactly when the wrapped callback is, so callback identity
 * (and with it every effect that depends on it) behaves as in production.
 */
function useInstrumentedState(state: GameClientState, controller: SandboxController): GameClientState {
  const { handleCardLand, activateTrickResult, clearTrickResult, handlePlayedCardAnimationComplete, handleHandAnimationProgress } = state;

  const instrumentedCardLand = useMemo(() => (card: { id: string }) => {
    controller.cardLanded(card.id);
    handleCardLand(card);
  }, [controller, handleCardLand]);

  const instrumentedActivate = useMemo(() => () => {
    controller.allCardsLanded();
    activateTrickResult();
  }, [controller, activateTrickResult]);

  const instrumentedClear = useMemo(() => () => {
    controller.trickCollectComplete();
    clearTrickResult();
  }, [controller, clearTrickResult]);

  const instrumentedPlayedComplete = useMemo(() => (cardId: string) => {
    controller.playedAnimationComplete(cardId);
    handlePlayedCardAnimationComplete(cardId);
  }, [controller, handlePlayedCardAnimationComplete]);

  const instrumentedHandProgress = useMemo(() => (progress: number) => {
    controller.handAnimationProgress(progress);
    handleHandAnimationProgress(progress);
  }, [controller, handleHandAnimationProgress]);

  return {
    ...state,
    handleCardLand: instrumentedCardLand,
    activateTrickResult: instrumentedActivate,
    clearTrickResult: instrumentedClear,
    handlePlayedCardAnimationComplete: instrumentedPlayedComplete,
    handleHandAnimationProgress: instrumentedHandProgress,
  };
}

function toHandles(state: GameClientState): SandboxGameHandles {
  const gameState = state.gameState;
  const actingIndex = gameState?.phase === GamePhase.TRUMP_SELECTION ? gameState.dealerIndex : gameState?.currentPlayerIndex;
  const actingPlayer = gameState && actingIndex !== undefined ? gameState.players[actingIndex] : undefined;

  return {
    isConnected: state.isConnected && state.isCorrectRoom,
    phase: gameState?.phase ?? null,
    localHand: state.localPlayer?.hand ?? [],
    playableCardIds: state.playableCardIds,
    isLocalTurn: !!actingPlayer && actingPlayer.id === state.playerId,
    forbiddenBid: gameState?.forbiddenBid ?? null,
    trickResult: state.trickResult !== null,
    pendingTrickResult: state.pendingTrickResult !== null,
    isTrickAnimating: state.isTrickAnimating,
    handAnimation: state.handAnimation,
    // A finished trick (winner decided; at ROUND_END the server keeps it as currentTrick) has no queued plays.
    queuedPlayedCards: gameState?.currentTrick && !gameState.currentTrick.winnerId
      ? gameState.currentTrick.cards.filter((played) => !state.shouldShowPlayedCard(played.card.id)).length
      : 0,
    opponents: gameState?.players.filter((player) => player.id !== state.playerId).map(({ id, name }) => ({ id, name })) ?? [],
    playCard: (cardId) => state.handleCardPlay(cardId),
    shuffle: state.handleShuffle,
    sort: state.handleSort,
    placeBid: state.handlePlaceBid,
    nextRound: state.nextRound,
    selectTrump: state.selectTrump,
    takeOverSeat: state.takeOverSeat,
  };
}

export function SandboxGameView({ roomId, controller }: { roomId: string; controller: SandboxController }) {
  const state = useGameClientState({ roomId, redirect: false });
  const instrumented = useInstrumentedState(state, controller);

  useLayoutEffect(() => {
    controller.attachHandles(toHandles(state));
  });
  useLayoutEffect(() => () => controller.attachHandles(null), [controller]);

  return <GameClientUI state={instrumented} roomId={roomId} />;
}
