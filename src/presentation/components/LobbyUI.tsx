'use client';

import { useState } from 'react';
import { IPlayer } from '@shared/domain';
import { Share2, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { AVATAR_PRESETS, loadGameSettings, saveGameSettings } from './SettingsPanel';
import { StyledEmoji } from './EmoteBar';
import {
  ShareModal,
  PlayerListItem,
  EmptyPlayerSlot,
  AddBotButton,
  AvatarPicker,
  GameRules,
} from './lobby';

interface LobbyUIProps {
  players: IPlayer[];
  localPlayerId: string;
  hostId: string;
  canStart: boolean;
  onStartGame: () => void;
  onLeaveLobby?: () => void;
  roomId?: string;
  onAddBot?: () => void;
  onRemoveBot?: (botId: string) => void;
}

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;

export function LobbyUI({
  players,
  localPlayerId,
  hostId,
  canStart,
  onStartGame,
  onLeaveLobby,
  roomId,
  onAddBot,
  onRemoveBot,
}: LobbyUIProps) {
  const isHost = localPlayerId === hostId;
  const [showShare, setShowShare] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(() => loadGameSettings().avatar);
  const canAddBot = isHost && players.length < MAX_PLAYERS;

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    const settings = loadGameSettings();
    saveGameSettings({ ...settings, avatar: avatarId });
    setShowAvatarPicker(false);
  };

  const currentAvatar = AVATAR_PRESETS.find((a) => a.id === selectedAvatar) || AVATAR_PRESETS[0];

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      {/* Share Modal */}
      {showShare && roomId && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />}

      {/* Backdrop - solid dark background */}
      <div className="absolute inset-0 bg-[#050508]" />

      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4">
        <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent rounded-3xl blur-xl" />

        <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-amber-500/10 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-light text-amber-100 tracking-wide">Game Lobby</h1>
                <p className="text-amber-200/50 text-sm mt-0.5">
                  {roomId ? (
                    <span className="font-mono text-amber-400">{roomId}</span>
                  ) : (
                    'Waiting for players to join'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Avatar picker button */}
                <div className="relative">
                  <StyledEmoji
                    emoji={currentAvatar.emoji}
                    size="md"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  />
                  {/* Avatar picker dropdown */}
                  {showAvatarPicker && (
                    <AvatarPicker selectedAvatar={selectedAvatar} onSelect={handleAvatarSelect} />
                  )}
                </div>
                {/* Share button */}
                {roomId && (
                  <button
                    onClick={() => setShowShare(true)}
                    className="w-9 h-9 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title="Invite players"
                  >
                    <Share2 className="w-5 h-5 text-amber-300" />
                  </button>
                )}
                {/* Player count */}
                <div className="flex items-center gap-2 px-3 h-9 bg-[#15152a] border border-amber-500/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-sm text-amber-200">
                    {players.length}/{MAX_PLAYERS}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Players list */}
          <div className="p-6">
            <div className="space-y-2">
              {players.map((player, index) => (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  isLocal={player.id === localPlayerId}
                  isPlayerHost={player.id === hostId}
                  currentAvatar={currentAvatar}
                  playerIndex={index}
                  canRemoveBot={isHost && !!player.isBot}
                  onRemoveBot={onRemoveBot ? () => onRemoveBot(player.id) : undefined}
                />
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, MIN_PLAYERS - players.length) }).map((_, i) => (
                <EmptyPlayerSlot key={`empty-${i}`} />
              ))}

              {/* Add Bot button */}
              {canAddBot && onAddBot && <AddBotButton onAddBot={onAddBot} />}
            </div>

            {/* Minimum players warning */}
            {players.length < MIN_PLAYERS && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Need at least {MIN_PLAYERS} players to start</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <div className="flex gap-3">
              {/* Leave Lobby button */}
              {onLeaveLobby && (
                <button
                  onClick={onLeaveLobby}
                  className="py-3 px-4 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-300 font-medium rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
                  title="Leave lobby"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              {/* Start Game / Waiting indicator */}
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={!canStart}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white font-semibold rounded-xl transition-all hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-amber-500 disabled:active:scale-100 cursor-pointer shadow-lg shadow-amber-500/25"
                >
                  {canStart ? 'Start Game' : 'Waiting for players...'}
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#15152a] border border-amber-500/20 rounded-xl text-amber-200/60 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Waiting for host to start...
                </div>
              )}
            </div>
          </div>

          {/* Rules section */}
          <GameRules />
        </div>
      </div>
    </div>
  );
}
