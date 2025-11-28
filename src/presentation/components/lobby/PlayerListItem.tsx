'use client';

import { IPlayer } from '@shared/domain';
import { Check, Crown, Bot, X } from 'lucide-react';
import { AVATAR_PRESETS, type AvatarPreset } from '../SettingsPanel';
import { StyledEmoji } from '../EmoteBar';

interface PlayerListItemProps {
  player: IPlayer;
  isLocal: boolean;
  isPlayerHost: boolean;
  currentAvatar: AvatarPreset;
  playerIndex: number;
  canRemoveBot: boolean;
  onRemoveBot?: () => void;
}

export function PlayerListItem({
  player,
  isLocal,
  isPlayerHost,
  currentAvatar,
  playerIndex,
  canRemoveBot,
  onRemoveBot,
}: PlayerListItemProps) {
  // Get avatar: local player uses their selection, others get assigned based on index
  const playerAvatar = isLocal ? currentAvatar : AVATAR_PRESETS[playerIndex % AVATAR_PRESETS.length];

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
        isLocal
          ? 'bg-amber-500/10 border-amber-500/30'
          : player.isBot
            ? 'bg-cyan-500/10 border-cyan-500/30'
            : 'bg-[#15152a]/50 border-amber-500/10 hover:border-amber-500/20'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {player.isBot ? (
          <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        ) : (
          <StyledEmoji emoji={playerAvatar.emoji} size="md" selected={isLocal} />
        )}

        {/* Name */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${isLocal ? 'text-amber-300' : player.isBot ? 'text-cyan-300' : 'text-amber-100'}`}
            >
              {player.name}
            </span>
            {isLocal && <span className="text-xs text-amber-400/50">(you)</span>}
            {player.isBot && <span className="text-xs text-cyan-500">(bot)</span>}
          </div>
          {isPlayerHost && (
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Crown className="w-3 h-3" />
              Host
            </div>
          )}
        </div>
      </div>

      {/* Ready indicator or Remove button for bots */}
      {player.isBot && canRemoveBot && onRemoveBot ? (
        <button
          onClick={onRemoveBot}
          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer group"
          title="Remove bot"
        >
          <X className="w-4 h-4 text-amber-400/50 group-hover:text-red-400" />
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Check className="w-4 h-4" />
          Ready
        </div>
      )}
    </div>
  );
}
