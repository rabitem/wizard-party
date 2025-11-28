import { IGameState, ICard, Suit } from '@shared/domain';

export interface RoomSettings {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  password?: string;
}

export interface EmoteMessage {
  id: string;
  playerId: string;
  playerName: string;
  emoteId: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface UndoRequest {
  requesterId: string;
  requesterName: string;
  cardId: string;
  cardDescription: string;
  timestamp: number;
  responses: Map<string, boolean>;
  requiredApprovals: number;
}

export interface TrickResult {
  winnerId: string;
  winnerName: string;
  timestamp: number;
}

export interface PreservedTrick {
  cards: { playerId: string; card: ICard }[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

export interface GameConnectionState {
  gameState: IGameState | null;
  playerId: string | null;
  isConnected: boolean;
  error: string | null;
  emotes: EmoteMessage[];
  chatMessages: ChatMessage[];
  undoRequest: UndoRequest | null;
  lastPlayedCardId: string | null;
  trickResult: TrickResult | null;
}

export interface UseGameConnectionReturn {
  gameState: IGameState | null;
  playerId: string | null;
  isConnected: boolean;
  error: string | null;
  emotes: EmoteMessage[];
  chatMessages: ChatMessage[];
  undoRequest: UndoRequest | null;
  canRequestUndo: boolean;
  trickResult: TrickResult | null;
  isTrickAnimating: boolean;
  clearTrickResult: () => void;
  connect: (host: string, roomId: string, playerName: string, roomSettings?: RoomSettings) => void;
  disconnect: () => void;
  startGame: () => void;
  selectTrump: (suit: Suit) => void;
  placeBid: (bid: number) => void;
  playCard: (cardId: string) => void;
  nextRound: () => void;
  getPlayableCards: () => ICard[];
  sendEmote: (emoteId: string) => void;
  sendChat: (message: string) => void;
  requestRematch: () => void;
  requestUndo: () => void;
  respondUndo: (approved: boolean) => void;
  addBot: () => void;
  removeBot: (botId: string) => void;
}
