'use client';

import { createContext, useContext, useMemo } from 'react';

import type { IGameState } from '@shared/domain';
import type { GameClientHandles } from '../hooks/useGameConnection';
import type { GameClientState } from '../hooks/connection/game-client-state';
import type { TrickPresentationView } from '../hooks/connection/trick-presentation';
import { selectDisplayState } from '../hooks/connection/display-state';
import type { TableFeed } from '../hooks/connection/types';
import { useStoreSelector } from '../state/external-store';
import type { ConnectionStatus } from '../types';

/**
 * Focused views of the game client. Each hook subscribes to its own slice, so a connection status
 * change does not re-render the table and an emote does not re-render the HUD. `useGame()` (in
 * GameProvider) composes them for screens that want everything.
 */
export const GameClientContext = createContext<GameClientHandles | null>(null);

const EMPTY_FEED: TableFeed = { emotes: [], chatMessages: [], bidEvents: [], specialCardNotices: [], lobbyActivity: [] };

export const TableFeedContext = createContext<TableFeed>(EMPTY_FEED);

export function useGameClient(): GameClientHandles {
  const client = useContext(GameClientContext);
  if (!client) throw new Error('useGameClient must be used within a GameProvider');
  return client;
}

const selectStatus = (state: GameClientState) => state.status;
const selectError = (state: GameClientState) => state.error;
const selectServerState = (state: GameClientState) => state.serverState;
const selectPlayerId = (state: GameClientState) => state.playerId;
const selectLegalCardIds = (state: GameClientState) => state.legalCardIds;
const selectSharedSounds = (state: GameClientState) => state.sharedCustomSounds;
const selectTimeoutSounds = (state: GameClientState) => state.timeoutSoundEvents;
const selectPendingPlay = (state: GameClientState) => state.pendingPlay;
const selectFrozenTrick = (view: TrickPresentationView) => view.frozenTrick;

export interface ConnectionView {
  status: ConnectionStatus;
  /** The socket is open (the table is live). */
  isConnected: boolean;
  error: string | null;
}

export function useConnectionView(): ConnectionView {
  const { store } = useGameClient();
  const status = useStoreSelector(store, selectStatus);
  const error = useStoreSelector(store, selectError);
  return useMemo(() => ({ status, isConnected: status === 'connected', error }), [status, error]);
}

/** The game as the table shows it (see selectDisplayState) and the local player's options. */
export interface GameSnapshotView {
  gameState: IGameState | null;
  playerId: string | null;
  /** Cards the local player may play now (empty while a play is in flight). */
  legalCardIds: readonly string[];
  hasPendingPlay: boolean;
  sharedCustomSounds: GameClientState['sharedCustomSounds'];
  timeoutSoundEvents: GameClientState['timeoutSoundEvents'];
}

const NO_CARDS: readonly string[] = [];

export function useGameSnapshot(): GameSnapshotView {
  const { store, trick } = useGameClient();
  const serverState = useStoreSelector(store, selectServerState);
  const playerId = useStoreSelector(store, selectPlayerId);
  const legalCardIds = useStoreSelector(store, selectLegalCardIds);
  const pendingPlay = useStoreSelector(store, selectPendingPlay);
  const sharedCustomSounds = useStoreSelector(store, selectSharedSounds);
  const timeoutSoundEvents = useStoreSelector(store, selectTimeoutSounds);
  const frozenTrick = useStoreSelector(trick, selectFrozenTrick);
  const gameState = useMemo(
    () => selectDisplayState({ serverState, playerId, frozenTrick, pendingPlay }),
    [serverState, playerId, frozenTrick, pendingPlay]
  );
  return useMemo(() => ({
    gameState,
    playerId,
    legalCardIds: pendingPlay ? NO_CARDS : legalCardIds,
    hasPendingPlay: pendingPlay !== null,
    sharedCustomSounds,
    timeoutSoundEvents,
  }), [gameState, playerId, legalCardIds, pendingPlay, sharedCustomSounds, timeoutSoundEvents]);
}

/** The trick lifecycle as the table presents it, with stable helpers bound to the presentation. */
export interface TrickPresentationState extends TrickPresentationView {
  clearTrickResult: () => void;
  activateTrickResult: () => void;
  getCardSoundChoice: (cardId: string) => string | null;
  getCardCustomAudio: (cardId: string) => ReturnType<GameClientHandles['trick']['getCardCustomAudio']>;
  getCardPhysicsState: (cardId: string) => ReturnType<GameClientHandles['trick']['getCardPhysicsState']>;
  /** Changes identity only when the set of visible played cards changes. */
  shouldShowPlayedCard: (cardId: string) => boolean;
  shouldAnimatePlayedCard: (cardId: string) => boolean;
  handlePlayedCardAnimationComplete: (cardId: string) => void;
}

const selectView = (view: TrickPresentationView) => view;

export function useTrickPresentation(): TrickPresentationState {
  const { trick } = useGameClient();
  const view = useStoreSelector(trick, selectView);
  const helpers = useMemo(() => ({
    clearTrickResult: () => trick.trickCollected(),
    activateTrickResult: () => trick.allCardsLanded(),
    getCardSoundChoice: (cardId: string) => trick.getCardSoundChoice(cardId),
    getCardCustomAudio: (cardId: string) => trick.getCardCustomAudio(cardId),
    getCardPhysicsState: (cardId: string) => trick.getCardPhysicsState(cardId),
    handlePlayedCardAnimationComplete: (cardId: string) => trick.playedCardLanded(cardId),
  }), [trick]);
  const visible = view.visiblePlayedCardIds;
  const visibility = useMemo(() => ({
    shouldShowPlayedCard: (cardId: string) => visible.has(cardId),
    shouldAnimatePlayedCard: (cardId: string) => visible.has(cardId) && trick.isAnimatedCard(cardId),
  }), [visible, trick]);
  return useMemo(() => ({ ...view, ...helpers, ...visibility }), [view, helpers, visibility]);
}

export function useTableFeed(): TableFeed {
  return useContext(TableFeedContext);
}
