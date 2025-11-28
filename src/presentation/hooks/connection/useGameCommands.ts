import { useCallback } from 'react';
import { Suit, ClientCommandType } from '@shared/domain';

/**
 * Hook providing game command functions
 */
export function useGameCommands(
  sendCommand: (command: object) => void
) {
  const startGame = useCallback(() => {
    sendCommand({ type: ClientCommandType.START_GAME });
  }, [sendCommand]);

  const selectTrump = useCallback((suit: Suit) => {
    sendCommand({ type: ClientCommandType.SELECT_TRUMP, suit });
  }, [sendCommand]);

  const placeBid = useCallback((bid: number) => {
    sendCommand({ type: ClientCommandType.PLACE_BID, bid });
  }, [sendCommand]);

  const playCard = useCallback((cardId: string) => {
    sendCommand({ type: ClientCommandType.PLAY_CARD, cardId });
  }, [sendCommand]);

  const nextRound = useCallback(() => {
    sendCommand({ type: ClientCommandType.NEXT_ROUND });
  }, [sendCommand]);

  const requestRematch = useCallback(() => {
    sendCommand({ type: ClientCommandType.REQUEST_REMATCH });
  }, [sendCommand]);

  const requestState = useCallback(() => {
    sendCommand({ type: ClientCommandType.REQUEST_STATE });
  }, [sendCommand]);

  const leaveGame = useCallback(() => {
    sendCommand({ type: ClientCommandType.LEAVE_GAME });
  }, [sendCommand]);

  return {
    startGame,
    selectTrump,
    placeBid,
    playCard,
    nextRound,
    requestRematch,
    requestState,
    leaveGame,
  };
}
