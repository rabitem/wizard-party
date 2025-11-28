'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PartySocket from 'partysocket';
import {
  IGameState,
  GamePhase,
  GameEventType,
  ClientCommandType,
  ICard,
} from '@shared/domain';

import {
  RoomSettings,
  EmoteMessage,
  ChatMessage,
  UndoRequest,
  TrickResult,
  PreservedTrick,
  UseGameConnectionReturn,
  getOrCreatePlayerId,
  usePlayableCards,
  useGameCommands,
  useSocialCommands,
} from './connection';

// Re-export types for external use
export type {
  RoomSettings,
  EmoteMessage,
  ChatMessage,
  UndoRequest,
  TrickResult,
} from './connection';

interface GameEvent {
  type: GameEventType;
  timestamp: number;
  [key: string]: unknown;
}

export function useGameConnection(): UseGameConnectionReturn {
  // Core state
  const [gameState, setGameState] = useState<IGameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Social state
  const [emotes, setEmotes] = useState<EmoteMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [undoRequest, setUndoRequest] = useState<UndoRequest | null>(null);

  // Trick state
  const [lastPlayedCardId, setLastPlayedCardId] = useState<string | null>(null);
  const [trickResult, setTrickResult] = useState<TrickResult | null>(null);
  const [isTrickAnimating, setIsTrickAnimating] = useState(false);

  // Refs
  const socketRef = useRef<PartySocket | null>(null);
  const gameStateRef = useRef<IGameState | null>(null);
  const persistentPlayerId = useRef<string>('');
  const intentionalDisconnect = useRef(false);
  const trickResultRef = useRef<TrickResult | null>(null);
  const preservedTrickRef = useRef<PreservedTrick | null>(null);
  const shouldPreserveTrickRef = useRef<boolean>(false);

  // Send command to server
  const sendCommand = useCallback((command: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(command));
    } else {
      console.warn('[Client] Socket not open, cannot send command');
    }
  }, []);

  // Use extracted hooks
  const { getPlayableCards } = usePlayableCards(gameState, playerId);
  const gameCommands = useGameCommands(sendCommand);
  const socialCommands = useSocialCommands(sendCommand);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: GameEvent = JSON.parse(event.data);

      switch (data.type) {
        case GameEventType.GAME_STATE: {
          const newState = data.state as IGameState;

          // Preserve trick cards during animation
          if (shouldPreserveTrickRef.current && preservedTrickRef.current) {
            newState.currentTrick = preservedTrickRef.current;
          }

          setGameState(newState);
          gameStateRef.current = newState;
          setPlayerId(data.yourPlayerId as string);
          break;
        }

        case GameEventType.ERROR:
          setError(data.message as string);
          setTimeout(() => setError(null), 5000);
          break;

        case GameEventType.EMOTE:
          setEmotes((prev) => [
            ...prev,
            {
              id: `emote-${Date.now()}-${Math.random()}`,
              playerId: data.playerId as string,
              playerName: data.playerName as string,
              emoteId: data.emoteId as string,
              timestamp: data.timestamp,
            },
          ]);
          setTimeout(() => setEmotes((prev) => prev.slice(1)), 3000);
          break;

        case GameEventType.CHAT_MESSAGE:
          setChatMessages((prev) => [
            ...prev.slice(-49),
            {
              id: `chat-${Date.now()}-${Math.random()}`,
              playerId: data.playerId as string,
              playerName: data.playerName as string,
              message: data.message as string,
              timestamp: data.timestamp,
            },
          ]);
          setTimeout(() => setChatMessages((prev) => prev.slice(1)), 3000);
          break;

        case GameEventType.REMATCH_STARTED:
          setEmotes([]);
          setChatMessages([]);
          setUndoRequest(null);
          setLastPlayedCardId(null);
          // Clear trick animation state
          trickResultRef.current = null;
          preservedTrickRef.current = null;
          shouldPreserveTrickRef.current = false;
          setTrickResult(null);
          setIsTrickAnimating(false);
          break;

        case GameEventType.UNDO_REQUESTED:
          setUndoRequest({
            requesterId: data.requesterId as string,
            requesterName: data.requesterName as string,
            cardId: data.cardId as string,
            cardDescription: data.cardDescription as string,
            timestamp: data.timestamp,
            responses: new Map(),
            requiredApprovals: (data.requiredApprovals as number) || 1,
          });
          break;

        case GameEventType.UNDO_RESPONSE:
          setUndoRequest((prev) => {
            if (!prev) return null;
            const newResponses = new Map(prev.responses);
            newResponses.set(data.responderId as string, data.approved as boolean);
            return { ...prev, responses: newResponses };
          });
          break;

        case GameEventType.UNDO_APPLIED:
        case GameEventType.UNDO_CANCELLED:
          setUndoRequest(null);
          break;

        case GameEventType.CARD_PLAYED:
          setLastPlayedCardId(data.cardId as string);
          break;

        case GameEventType.TRICK_COMPLETE: {
          const winnerId = data.winnerId as string;
          const currentState = gameStateRef.current;
          const winner = currentState?.players.find(p => p.id === winnerId);

          const trickCards = data.trickCards as { playerId: string; card: ICard }[] | undefined;

          if (trickCards && trickCards.length > 0) {
            preservedTrickRef.current = {
              cards: [...trickCards],
              leadSuit: null,
              winnerId: winnerId,
            };
          } else if (currentState?.currentTrick && currentState.currentTrick.cards.length > 0) {
            preservedTrickRef.current = {
              cards: [...currentState.currentTrick.cards],
              leadSuit: currentState.currentTrick.leadSuit,
              winnerId: currentState.currentTrick.winnerId,
            };
          }

          // IMMEDIATELY set flags to preserve trick cards and block UI popups
          shouldPreserveTrickRef.current = true;
          setIsTrickAnimating(true);

          if (winner) {
            const result = {
              winnerId,
              winnerName: winner.name,
              timestamp: data.timestamp,
            };
            // Delay setting trickResult to allow the last card's "fly to table"
            // animation to complete before the collect animation starts.
            // AnimatedPlayedCard takes 0.4-0.6s, so we wait 700ms to be safe.
            setTimeout(() => {
              trickResultRef.current = result;
              setTrickResult(result);
            }, 700);
          }
          break;
        }

        // These are handled via state updates
        case GameEventType.PLAYER_JOINED:
        case GameEventType.PLAYER_LEFT:
        case GameEventType.GAME_STARTED:
        case GameEventType.TRUMP_REVEALED:
        case GameEventType.TRUMP_SELECTED:
        case GameEventType.BID_PLACED:
        case GameEventType.ROUND_COMPLETE:
        case GameEventType.GAME_COMPLETE:
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  }, []);

  // Connect to game server
  const connect = useCallback((host: string, roomId: string, playerName: string, roomSettings?: RoomSettings) => {
    if (socketRef.current) {
      intentionalDisconnect.current = true;
      socketRef.current.close();
      intentionalDisconnect.current = false;
    }

    persistentPlayerId.current = getOrCreatePlayerId();

    const socket = new PartySocket({
      host,
      room: roomId,
    });

    socket.addEventListener('open', () => {
      setIsConnected(true);
      setError(null);
      socket.send(JSON.stringify({
        type: ClientCommandType.JOIN_GAME,
        playerName,
        persistentId: persistentPlayerId.current,
        roomSettings,
      }));
    });

    socket.addEventListener('message', handleMessage);

    socket.addEventListener('close', () => {
      setIsConnected(false);
    });

    socket.addEventListener('error', () => {
      setError('Connection error');
      setIsConnected(false);
    });

    socketRef.current = socket;
  }, [handleMessage]);

  // Disconnect from server
  const disconnect = useCallback(() => {
    intentionalDisconnect.current = true;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setGameState(null);
    setPlayerId(null);
  }, []);

  // Clear trick result and request fresh state
  const clearTrickResult = useCallback(() => {
    trickResultRef.current = null;
    preservedTrickRef.current = null;
    shouldPreserveTrickRef.current = false;
    setTrickResult(null);
    setIsTrickAnimating(false);
    gameCommands.requestState();
  }, [gameCommands]);

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      intentionalDisconnect.current = true;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Can request undo if we just played a card and there's no pending request
  const canRequestUndo = Boolean(
    lastPlayedCardId &&
    !undoRequest &&
    gameState?.phase === GamePhase.PLAYING
  );

  return {
    // State
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

    // Connection
    connect,
    disconnect,
    clearTrickResult,

    // Game commands
    startGame: gameCommands.startGame,
    selectTrump: gameCommands.selectTrump,
    placeBid: gameCommands.placeBid,
    playCard: gameCommands.playCard,
    nextRound: gameCommands.nextRound,
    requestRematch: gameCommands.requestRematch,

    // Social commands
    sendEmote: socialCommands.sendEmote,
    sendChat: socialCommands.sendChat,
    requestUndo: socialCommands.requestUndo,
    respondUndo: socialCommands.respondUndo,
    addBot: socialCommands.addBot,
    removeBot: socialCommands.removeBot,

    // Utilities
    getPlayableCards,
  };
}
