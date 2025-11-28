'use client';

import { AVATAR_PRESETS } from '../SettingsPanel';

interface EmoteDisplayData {
  id: string;
  emoteId: string;
  playerId: string;
  playerName: string;
}

interface ChatDisplayData {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
}

interface ReactionsFeedProps {
  emotes: EmoteDisplayData[];
  chatMessages: ChatDisplayData[];
}

export function ReactionsFeed({ emotes, chatMessages }: ReactionsFeedProps) {
  if (emotes.length === 0 && chatMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 mb-1 max-w-[200px]">
      {emotes.map((emote) => {
        const emojiData = AVATAR_PRESETS.find(a => a.id === emote.emoteId);
        return (
          <div
            key={emote.id}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a15]/90 backdrop-blur-sm rounded-xl border border-amber-500/20 animate-in fade-in slide-in-from-right-2 duration-200"
          >
            <span className="text-lg">{emojiData?.emoji || '❓'}</span>
            <span className="text-amber-400 text-xs font-medium truncate">{emote.playerName}</span>
          </div>
        );
      })}
      {chatMessages.map((chat) => (
        <div
          key={chat.id}
          className="flex flex-col px-3 py-1.5 bg-[#0a0a15]/90 backdrop-blur-sm rounded-xl border border-amber-500/20 animate-in fade-in slide-in-from-right-2 duration-200"
        >
          <span className="text-amber-400 text-xs font-medium">{chat.playerName}</span>
          <span className="text-amber-100/90 text-sm">{chat.message}</span>
        </div>
      ))}
    </div>
  );
}
