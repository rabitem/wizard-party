'use client';

import { AVATAR_PRESETS } from '../settings';

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
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-amber-700/40 animate-in fade-in slide-in-from-right-2 duration-200"
            style={{
              background: 'var(--surface)',
            }}
          >
            <i className={`ra ${emojiData?.icon || 'ra-help'} text-lg leading-none text-amber-400`} />
            <span
              className="text-amber-400/90 text-xs truncate"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {emote.playerName}
            </span>
          </div>
        );
      })}
      {chatMessages.map((chat) => (
        <div
          key={chat.id}
          className="flex flex-col px-3 py-1.5 rounded border border-amber-700/40 animate-in fade-in slide-in-from-right-2 duration-200"
          style={{
            background: 'var(--surface)',
          }}
        >
          <span
            className="text-amber-400/90 text-xs"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {chat.playerName}
          </span>
          <span
            className="text-amber-200/80 text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {chat.message}
          </span>
        </div>
      ))}
    </div>
  );
}
