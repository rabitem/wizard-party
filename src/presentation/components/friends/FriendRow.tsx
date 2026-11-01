'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Ban, DoorOpen, Loader2, MoreHorizontal, Pin, PinOff, Send, UserMinus, UserRound } from 'lucide-react';

import type { Friend } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useJoinRoom } from '@/presentation/hooks/social/useJoinRoom';
import { useSocial, useSocialPanel } from '@/presentation/providers/SocialProvider';

import { PresenceAvatar } from './PresenceAvatar';
import { presenceLabel, STATUS_COLORS } from './social-format';
import type { useSocialActions } from './useSocialActions';

const ICON_BUTTON = 'inline-flex items-center justify-center w-9 h-9 rounded-lg text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/30 transition-colors cursor-pointer disabled:opacity-40';

interface FriendRowProps {
  friend: Friend;
  actions: ReturnType<typeof useSocialActions>;
}

export function FriendRow({ friend, actions }: FriendRowProps) {
  const { activity } = useSocial();
  const { close } = useSocialPanel();
  const { joinRoom, needsConfirmation } = useJoinRoom();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);
  const { presence } = friend;
  const myRoom = activity.kind === 'menu' ? null : activity.roomCode;
  const canJoin = presence.joinableRoomCode !== null && presence.joinableRoomCode !== myRoom;
  const inviteKey = `invite:${friend.userId}`;

  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }} className="rounded-xl border border-amber-900/30 hover:border-amber-700/40 transition-colors" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <PresenceAvatar avatarId={friend.avatar} level={friend.level} status={presence.status} playing={presence.activity === 'lobby' || presence.activity === 'game'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {friend.pinnedAt !== null ? <Pin className="w-3 h-3 text-amber-400/70 shrink-0" aria-label="Pinned" /> : null}
            <span className="truncate text-sm text-amber-100 font-serif">{friend.displayName}</span>
            <span className="text-[10px] text-amber-500/60 shrink-0">Lv {friend.level}</span>
          </div>
          <span className="block text-xs truncate" style={{ color: presence.status === 'offline' ? 'color-mix(in srgb, var(--color-amber-300) 35%, transparent)' : STATUS_COLORS[presence.status] }}>
            {presenceLabel(presence)}
          </span>
        </div>
        {canJoin ? (
          <button
            type="button"
            className={`${ICON_BUTTON} ${confirmJoin ? 'w-auto px-2 text-xs bg-amber-800/40' : ''}`}
            title={`Join ${friend.displayName}`}
            onClick={() => {
              if (needsConfirmation && !confirmJoin) return setConfirmJoin(true);
              close();
              void joinRoom(presence.joinableRoomCode as string);
            }}
          >
            {confirmJoin ? 'Leave game & join' : <DoorOpen className="w-4 h-4" />}
          </button>
        ) : null}
        {myRoom ? (
          <button type="button" className={ICON_BUTTON} title={presence.status === 'offline' ? 'Invite (they get an email)' : 'Invite to your table'} disabled={actions.busy === inviteKey} onClick={() => void actions.invite(friend.userId, myRoom, friend.displayName)}>
            {actions.busy === inviteKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        ) : null}
        <button type="button" className={ICON_BUTTON} aria-expanded={menuOpen} aria-label={`More for ${friend.displayName}`} onClick={() => setMenuOpen((open) => !open)}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              <MenuButton icon={friend.pinnedAt ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />} label={friend.pinnedAt ? 'Unpin' : 'Pin to top'} onClick={() => void actions.run(`pin:${friend.userId}`, () => socialApi.setPinned(friend.userId, friend.pinnedAt === null))} />
              {friend.hasPublicProfile ? (
                <Link href={`/u/${friend.username}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-amber-800/40 text-xs text-amber-200/80 hover:text-amber-100">
                  <UserRound className="w-3.5 h-3.5" /> Profile
                </Link>
              ) : null}
              <MenuButton icon={<UserMinus className="w-3.5 h-3.5" />} label="Remove" onClick={() => void actions.run(`remove:${friend.userId}`, () => socialApi.removeFriend(friend.userId), `${friend.displayName} was removed.`)} />
              <MenuButton danger icon={<Ban className="w-3.5 h-3.5" />} label="Block" onClick={() => void actions.run(`block:${friend.userId}`, () => socialApi.block(friend.userId), `${friend.displayName} is blocked.`)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}

function MenuButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs cursor-pointer ${danger ? 'border-red-900/50 text-red-300/90 hover:bg-red-950/40' : 'border-amber-800/40 text-amber-200/80 hover:text-amber-100 hover:bg-amber-900/25'}`}>
      {icon}
      {label}
    </button>
  );
}
