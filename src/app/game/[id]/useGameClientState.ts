'use client';

import { useState, useMemo, useCallback } from 'react';

import { GamePhase, CardType, ICard, IGameState, type CustomSound, type ICardDeclaration } from '@shared/domain';
import { useGame } from '@/presentation/providers/GameProvider';
import { useTournamentTable } from '@/presentation/providers/TournamentTableProvider';
import { getRandomWizardSound, getRandomJesterSound } from '@/lib/sounds';
import { getRandomCustomSoundForRole, loadGameSettings, type CustomAudioRole } from '@/presentation/components/settings';
import { useCardOrder } from '@/presentation/hooks/useCardOrder';
import { createClientPhysicsState } from '@/presentation/utils/client-physics-state';
import { scheduleAfterInput } from '@/presentation/utils/interaction-scheduler';
import type { DropInfo } from '@/presentation/hooks/useDragToPlay';
import { useCardDeclarationFlow } from '@/presentation/hooks/useCardDeclarationFlow';
import {
  resolveCardLandingSound,
  useGameRedirect,
  useGameSoundEffects,
  useGameKeyboardShortcutsWrapper,
} from './useGameClientEffects';

interface UseGameClientStateProps {
  roomId: string;
  /** Route away when the session or phase no longer belongs on the game page (off in the sandbox). */
  redirect?: boolean;
}

/** Transform emotes to display format */
function transformEmotesToDisplay(emotes: Array<{ id: string; emoteId: string; playerId: string; playerName: string }>) {
  return emotes.map((e) => ({
    id: e.id,
    emoteId: e.emoteId,
    playerId: e.playerId,
    playerName: e.playerName,
  }));
}

/** Transform chat messages to display format */
function transformChatToDisplay(messages: Array<{ id: string; playerId: string; playerName: string; message: string; timestamp: number }>) {
  return messages.map((m) => ({
    id: m.id,
    playerId: m.playerId,
    playerName: m.playerName,
    message: m.message,
    timestamp: m.timestamp,
  }));
}

interface SpecialCardAudioChoice {
  soundChoice?: string;
  customAudio?: CustomSound;
}

function getSpecialCardRole(card: ICard | undefined): CustomAudioRole | null {
  if (!card) return null;
  if (card.type === CardType.WIZARD) return 'wizard';
  if (card.type === CardType.JESTER) return 'jester';
  return null;
}

/** Get synchronized audio choice for special cards (wizard/jester). */
function getSpecialCardAudioChoice(card: ICard | undefined): SpecialCardAudioChoice {
  const role = getSpecialCardRole(card);
  if (!role) return {};

  const settings = loadGameSettings();
  const customAudio = getRandomCustomSoundForRole(settings, role);
  if (customAudio) return { customAudio };

  if (role === 'wizard') {
    const pref = settings.wizardSound;
    return { soundChoice: pref === 'random' ? getRandomWizardSound() : pref };
  }

  const pref = settings.jesterSound;
  return { soundChoice: pref === 'random' ? getRandomJesterSound() : pref };
}

/** Send a card play with its synchronized landing audio and throw physics */
function useSendCardPlay(playCard: ReturnType<typeof useGame>['playCard']) {
  return useCallback((card: ICard, dropInfo: DropInfo | undefined, declaration?: ICardDeclaration) => {
    const { soundChoice, customAudio } = getSpecialCardAudioChoice(card);
    playCard(card.id, soundChoice, createClientPhysicsState(dropInfo), customAudio, declaration);
  }, [playCard]);
}

/** Check if game is in a renderable game phase */
function checkIsGamePhase(gameState: IGameState | null, isTrickAnimationPending: boolean): boolean {
  if (!gameState?.phase || gameState.phase === GamePhase.LOBBY) return false;
  if (gameState.phase === GamePhase.GAME_END) return isTrickAnimationPending;
  return true;
}

/** Check if the local player is the dealer */
function checkIsDealer(gameState: IGameState | null, playerId: string | null): boolean {
  if (!gameState || !playerId) return false;
  return gameState.dealerIndex === gameState.players.findIndex((p) => p.id === playerId);
}

function playCardLandingAudio(
  cardId: string,
  cardAudio: Pick<ReturnType<typeof useGame>, 'getCardCustomAudio' | 'getCardSoundChoice'>,
  sound: ReturnType<typeof useGameSoundEffects>
): void {
  const customAudio = cardAudio.getCardCustomAudio(cardId);
  if (customAudio) {
    sound.playCustomAudio(customAudio.dataUrl);
    return;
  }
  sound.play(resolveCardLandingSound(cardAudio.getCardSoundChoice(cardId)));
}

/** A trick is landing, showing its winner or being collected (TRICK_COMPLETE until collected). */
export function checkIsTrickAnimationPending(trick: {
  isTrickAnimating: boolean;
  trickResult: unknown;
  pendingTrickResult: unknown;
}): boolean {
  return trick.isTrickAnimating || trick.trickResult !== null || trick.pendingTrickResult !== null;
}

/**
 * Cards the player may play as the table shows it: none while a completed trick is presented or
 * while earlier cards of the trick are still waiting for their flight (the lead must be visible).
 */
export function resolvePlayableCardIds({
  legalCardIds,
  isWaitingForTrickResult,
  trickBacklog,
}: {
  legalCardIds: readonly string[];
  isWaitingForTrickResult: boolean;
  trickBacklog: number;
}): string[] {
  if (isWaitingForTrickResult || trickBacklog > 0) return [];
  return [...legalCardIds];
}

export function shouldSendCardPlay({
  cardId,
  playableCardIds,
  isWaitingForTrickResult,
}: {
  cardId: string;
  playableCardIds: string[];
  isWaitingForTrickResult: boolean;
}): boolean {
  return !isWaitingForTrickResult && playableCardIds.includes(cardId);
}

/** UI state hook for managing local component state */
function useUIState() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  return {
    selectedCardId, setSelectedCardId,
    isDraggingCard, setIsDraggingCard,
    settingsOpen, setSettingsOpen,
    statsOpen, setStatsOpen,
    leaderboardOpen, setLeaderboardOpen,
    showLeaveConfirmation, setShowLeaveConfirmation,
  };
}

interface LeaveHandlersParams {
  setShowLeaveConfirmation: (show: boolean) => void;
  leaveGame: () => void;
}

/** Create leave game handlers */
function useLeaveHandlers({ setShowLeaveConfirmation, leaveGame }: LeaveHandlersParams) {
  const [isLeaving, setIsLeaving] = useState(false);
  const handleLeaveGame = useCallback(() => {
    setShowLeaveConfirmation(true);
  }, [setShowLeaveConfirmation]);

  const confirmLeaveGame = useCallback(async () => {
    setShowLeaveConfirmation(false);
    setIsLeaving(true);
    await leaveGame();
  }, [leaveGame, setShowLeaveConfirmation]);

  const cancelLeaveGame = useCallback(() => {
    setShowLeaveConfirmation(false);
  }, [setShowLeaveConfirmation]);

  return { handleLeaveGame, confirmLeaveGame, cancelLeaveGame, isLeaving };
}

export function useGameClientState({ roomId, redirect = true }: UseGameClientStateProps) {
  const game = useGame();
  const { match: tournamentMatch } = useTournamentTable();
  const { handAnimation, shuffleCards, sortCards, handleHandAnimationProgress, getOrderedCards } = useCardOrder();
  const uiState = useUIState();

  const isCorrectRoom = game.gameState?.id === roomId;
  const isTrickAnimationPending = checkIsTrickAnimationPending(game);
  const isGamePhase = checkIsGamePhase(game.gameState, isTrickAnimationPending);

  const leaveHandlers = useLeaveHandlers({
    setShowLeaveConfirmation: uiState.setShowLeaveConfirmation,
    leaveGame: game.leaveGame,
  });

  useGameRedirect({
    enabled: redirect,
    roomId,
    sessionLoaded: game.sessionLoaded,
    status: game.connectionStatus,
    hasError: game.error !== null,
    gameState: game.gameState,
    playerId: game.playerId,
    isCorrectRoom,
    isTrickAnimationPending,
    isLeaving: leaveHandlers.isLeaving,
  });

  const sound = useGameSoundEffects({
    gameState: game.gameState,
    playerId: game.playerId,
    emotes: game.emotes,
    bidEvents: game.bidEvents,
    timeoutSoundEvents: game.timeoutSoundEvents,
    trickResult: game.trickResult,
    isTrickAnimationPending,
    isConnected: game.isConnected,
    updateSoundPreferences: game.updateSoundPreferences,
  });

  // Blocks plays from TRICK_COMPLETE until the trick is collected, not only once it is active:
  // a card played while the previous trick is still landing completes the next trick too early.
  const isWaitingForTrickResult = isTrickAnimationPending;
  const { legalCardIds, trickBacklog } = game;
  const playableCardIds = useMemo(
    () => resolvePlayableCardIds({ legalCardIds, isWaitingForTrickResult, trickBacklog }),
    [legalCardIds, isWaitingForTrickResult, trickBacklog]
  );
  const getPlayableCards = useCallback(() => playableCardIds.map((id) => ({ id })), [playableCardIds]);

  useGameKeyboardShortcutsWrapper({
    gameState: game.gameState,
    playerId: game.playerId,
    selectedCardId: uiState.selectedCardId,
    setSelectedCardId: uiState.setSelectedCardId,
    setSettingsOpen: uiState.setSettingsOpen,
    getPlayableCards,
  });

  const displayEmotes = useMemo(() => transformEmotesToDisplay(game.emotes), [game.emotes]);
  const displayChatMessages = useMemo(() => transformChatToDisplay(game.chatMessages), [game.chatMessages]);

  const localPlayer = game.gameState?.players.find((p) => p.id === game.playerId) ?? null;
  const isDealer = checkIsDealer(game.gameState, game.playerId);

  // Card callbacks go to the memoized 3D canvas: they depend on stable setters, not on uiState.
  const { setSelectedCardId } = uiState;
  const handleCardSelect = useCallback((cardId: string) => {
    if (isWaitingForTrickResult) return;
    setSelectedCardId((prev) => (prev === cardId ? null : cardId));
  }, [isWaitingForTrickResult, setSelectedCardId]);

  const { requestPlay, ...declarationState } = useCardDeclarationFlow(game.gameState, useSendCardPlay(game.playCard));

  const handleCardPlay = useCallback((cardId: string, dropInfo?: DropInfo) => {
    if (!shouldSendCardPlay({ cardId, playableCardIds, isWaitingForTrickResult })) return;
    const card = localPlayer?.hand.find((c) => c.id === cardId);
    if (card) requestPlay(card, dropInfo);
    setSelectedCardId(null);
  }, [isWaitingForTrickResult, playableCardIds, localPlayer, setSelectedCardId, requestPlay]);

  const handleShuffle = useCallback(() => {
    if (localPlayer) shuffleCards(localPlayer.hand, () => sound.play('cardShuffle'));
  }, [localPlayer, shuffleCards, sound]);

  const handleSort = useCallback(() => {
    if (localPlayer) sortCards(localPlayer.hand, () => sound.play('cardSort'));
  }, [localPlayer, sortCards, sound]);

  const { placeBid, getCardCustomAudio, getCardSoundChoice } = game;
  const handlePlaceBid = useCallback((bid: number) => {
    placeBid(bid);
    scheduleAfterInput(() => sound.play('bidPlace'));
  }, [placeBid, sound]);

  const handleCardLand = useCallback((card: { id: string }) => {
    playCardLandingAudio(card.id, { getCardCustomAudio, getCardSoundChoice }, sound);
  }, [getCardCustomAudio, getCardSoundChoice, sound]);

  return {
    isConnected: game.isConnected, connectionStatus: game.connectionStatus, sessionLoaded: game.sessionLoaded,
    takeOverSeat: game.takeOverSeat, retryConnection: game.retryConnection,
    gameState: game.gameState, playerId: game.playerId, sharedCustomSounds: game.sharedCustomSounds,
    tournamentMatch,
    error: game.error, clearError: game.clearError,
    selectedCardId: uiState.selectedCardId, isDraggingCard: uiState.isDraggingCard,
    setIsDraggingCard: uiState.setIsDraggingCard, settingsOpen: uiState.settingsOpen,
    setSettingsOpen: uiState.setSettingsOpen, statsOpen: uiState.statsOpen, setStatsOpen: uiState.setStatsOpen,
    leaderboardOpen: uiState.leaderboardOpen, setLeaderboardOpen: uiState.setLeaderboardOpen,
    showLeaveConfirmation: uiState.showLeaveConfirmation,
    isCorrectRoom, isGamePhase, isDealer, localPlayer,
    displayEmotes, displayChatMessages, playableCardIds, handAnimation,
    trickResult: game.trickResult, pendingTrickResult: game.pendingTrickResult, isTrickAnimating: game.isTrickAnimating,
    ...leaveHandlers, handleCardSelect, handleCardPlay, handleShuffle, handleSort, handleHandAnimationProgress, handlePlaceBid, handleCardLand,
    selectTrump: game.selectTrump, nextRound: game.nextRound, sendEmote: game.sendEmote, sendChat: game.sendChat,
    resolveEffect: game.resolveEffect, specialCardNotices: game.specialCardNotices, ...declarationState,
    playTimeoutSound: game.playTimeoutSound,
    clearTrickResult: game.clearTrickResult, activateTrickResult: game.activateTrickResult,
    getOrderedCards, getCardPhysicsState: game.getCardPhysicsState,
    shouldShowPlayedCard: game.shouldShowPlayedCard,
    shouldAnimatePlayedCard: game.shouldAnimatePlayedCard,
    handlePlayedCardAnimationComplete: game.handlePlayedCardAnimationComplete,
  };
}
