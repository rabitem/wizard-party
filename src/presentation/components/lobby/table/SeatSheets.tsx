'use client';

import { useState } from 'react';
import { Bot, Crown, Link2, UserMinus, UserPlus, VolumeX, Volume2 } from 'lucide-react';
import { LobbySheet } from './LobbySheet';
import { LobbyAddBotDecor } from '../skins/LobbyDecor';
import { LobbyIcon } from '../skins/LobbySkinText';
import { CHIP_CLASS, GOLD_BUTTON_STYLE } from './lobby-styles';
import type { BotDifficulty, LobbySeatView } from './lobby-view.types';

const BOT_LEVELS: { value: BotDifficulty; label: string }[] = [
  { value: 1, label: 'Easy' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hard' },
  { value: 4, label: 'Expert' },
  { value: 5, label: 'Master' },
];

function SheetAction({ icon, label, hint, tone = 'default', onClick }: { icon: React.ReactNode; label: string; hint?: string; tone?: 'default' | 'danger'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer ${tone === 'danger' ? 'hover:bg-red-900/25' : 'hover:bg-amber-900/25'}`}
    >
      <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${tone === 'danger' ? 'border-red-500/40 text-red-300' : 'border-amber-700/50 text-amber-300'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`font-serif block text-[15px] ${tone === 'danger' ? 'text-red-200' : 'text-amber-100'}`}>{label}</span>
        {hint ? <span className="block text-xs text-amber-500/80 font-serif">{hint}</span> : null}
      </span>
    </button>
  );
}

interface SeatActionSheetProps {
  seat: LobbySeatView;
  isHost: boolean;
  isMuted?: boolean;
  friendAction?: React.ReactNode;
  onClose: () => void;
  onKick: () => void;
  onMakeHost: () => void;
  onRemoveBot: () => void;
  /** Omit to hide muting (e.g. when chat is off). */
  onToggleMute?: () => void;
}

function seatSubtitle(seat: LobbySeatView): string {
  if (seat.isBot) return `${seat.botLabel} bot`;
  if (seat.isHost) return 'Host of this table';
  if (!seat.isConnected) return 'Reconnecting';
  return seat.isReady ? 'Ready' : 'Not ready yet';
}

function KickAction({ name, onKick }: { name: string; onKick: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <SheetAction icon={<UserMinus className="w-4 h-4" />} label="Remove from table" tone="danger" onClick={() => setConfirming(true)} />;
  }
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3">
      <p className="text-sm text-red-100 font-serif">Remove {name}? They can&apos;t rejoin this table.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="flex-1 h-10 rounded-lg border border-amber-700/40 text-amber-200 text-sm cursor-pointer font-serif">Keep</button>
        <button type="button" onClick={onKick} className="flex-1 h-10 rounded-lg bg-red-600/80 hover:bg-red-600 text-red-50 text-sm cursor-pointer font-serif">Remove</button>
      </div>
    </div>
  );
}

/** What you can do with another seated player: host tools, mute, friend request. */
export function SeatActionSheet({ seat, isHost, isMuted, friendAction, onClose, onKick, onMakeHost, onRemoveBot, onToggleMute }: SeatActionSheetProps) {
  const title = seat.isLocal ? 'Your seat' : seat.name;
  const isOtherHuman = !seat.isLocal && !seat.isBot;

  return (
    <LobbySheet title={title} subtitle={seatSubtitle(seat)} onClose={onClose}>
      <div className="space-y-1">
        {isOtherHuman && friendAction ? <div className="px-3 py-2">{friendAction}</div> : null}
        {isOtherHuman && onToggleMute ? (
          <SheetAction icon={isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} label={isMuted ? 'Unmute chat and emotes' : 'Mute chat and emotes'} onClick={onToggleMute} />
        ) : null}
        {isHost && isOtherHuman && seat.isConnected ? (
          <SheetAction icon={<Crown className="w-4 h-4" />} label="Make host" hint="They choose the rules and start the game" onClick={onMakeHost} />
        ) : null}
        {isHost && seat.isBot ? <SheetAction icon={<Bot className="w-4 h-4" />} label="Remove bot" tone="danger" onClick={onRemoveBot} /> : null}
        {isHost && isOtherHuman ? <KickAction name={seat.name} onKick={onKick} /> : null}
      </div>
    </LobbySheet>
  );
}

interface OpenSeatSheetProps {
  seatNumber: number;
  isHost: boolean;
  canInviteFriends: boolean;
  onClose: () => void;
  onInviteFriends: () => void;
  onCopyLink: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
}

/** Filling an open seat: invite a friend, share the link or (host) seat a bot. */
export function OpenSeatSheet({ seatNumber, isHost, canInviteFriends, onClose, onInviteFriends, onCopyLink, onAddBot }: OpenSeatSheetProps) {
  const [difficulty, setDifficulty] = useState<BotDifficulty>(3);
  return (
    <LobbySheet title={`Fill seat ${seatNumber}`} onClose={onClose}>
      <div className="space-y-1">
        {canInviteFriends ? <SheetAction icon={<UserPlus className="w-4 h-4" />} label="Invite friends" hint="They get a notification, offline friends an email" onClick={onInviteFriends} /> : null}
        <SheetAction icon={<Link2 className="w-4 h-4" />} label="Copy invite link" hint="Anyone with the link can sit down" onClick={onCopyLink} />
      </div>
      {isHost ? (
        <div className="relative isolate mt-4 pt-4 border-t border-amber-800/30">
          <LobbyAddBotDecor />
          <p className="relative text-sm text-amber-100 mb-2 flex items-center gap-2 font-serif">
            <LobbyIcon id="addBot" className="w-4 h-4 text-amber-400"><Bot className="w-4 h-4 text-amber-400" /></LobbyIcon>Seat a bot
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup" aria-label="Bot difficulty">
            {BOT_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                role="radio"
                aria-checked={difficulty === level.value}
                onClick={() => setDifficulty(level.value)}
                className={`font-serif ${CHIP_CLASS} cursor-pointer ${difficulty === level.value ? 'border-amber-400/80 bg-amber-600/30 text-amber-50' : 'border-amber-800/60 text-amber-400/90 hover:border-amber-600/60'}`}
              >
                {level.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onAddBot(difficulty)} className="w-full h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]" style={GOLD_BUTTON_STYLE}>
            <Bot className="w-4 h-4" />Add {BOT_LEVELS.find((level) => level.value === difficulty)?.label} bot
          </button>
        </div>
      ) : null}
    </LobbySheet>
  );
}
