import { useCallback } from 'react';
import { ClientCommandType } from '@shared/domain';

/**
 * Hook providing social/emote command functions
 */
export function useSocialCommands(
  sendCommand: (command: object) => void
) {
  const sendEmote = useCallback((emoteId: string) => {
    sendCommand({ type: ClientCommandType.SEND_EMOTE, emoteId });
  }, [sendCommand]);

  const sendChat = useCallback((message: string) => {
    sendCommand({ type: ClientCommandType.SEND_CHAT, message });
  }, [sendCommand]);

  const requestUndo = useCallback(() => {
    sendCommand({ type: ClientCommandType.REQUEST_UNDO });
  }, [sendCommand]);

  const respondUndo = useCallback((approved: boolean) => {
    sendCommand({ type: ClientCommandType.RESPOND_UNDO, approved });
  }, [sendCommand]);

  const addBot = useCallback(() => {
    console.log('[Client] Adding bot, sending command');
    sendCommand({ type: ClientCommandType.ADD_BOT });
  }, [sendCommand]);

  const removeBot = useCallback((botId: string) => {
    sendCommand({ type: ClientCommandType.REMOVE_BOT, botId });
  }, [sendCommand]);

  return {
    sendEmote,
    sendChat,
    requestUndo,
    respondUndo,
    addBot,
    removeBot,
  };
}
