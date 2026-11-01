'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Users } from 'lucide-react';

import { useSocial, useSocialPanel, type SocialPanelTab } from '@/presentation/providers/SocialProvider';

import { PlayerAvatar } from '../account/PlayerAvatar';

const STACK = 3;

/**
 * Entry point to the social hub (friends, inbox, search): online friends as an overlapping avatar
 * stack plus a badge for unread inbox items and friend requests. Named for the hub, not for friends,
 * because the inbox carries other notification kinds too. Hidden for guests.
 */
export function SocialButton({ className = '', label = 'Social', tab }: { className?: string; label?: string; tab?: SocialPanelTab }) {
  const { enabled, friends, unread, incoming } = useSocial();
  const { open } = useSocialPanel();
  if (!enabled) return null;

  const online = friends.filter((friend) => friend.presence.status !== 'offline');
  const badge = unread + incoming.length;

  return (
    <motion.button
      type="button"
      onClick={() => open(tab ?? (unread > 0 ? 'inbox' : 'friends'))}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      aria-label={`${label}: ${online.length} online${badge ? `, ${badge} new` : ''}`}
      className={`font-serif relative inline-flex items-center gap-2 h-11 pl-2.5 pr-3 rounded-full hover:bg-amber-900/35 transition-colors cursor-pointer ${className}`}
    >
      {online.length > 0 ? (
        <span className="flex -space-x-2.5">
          <AnimatePresence initial={false}>
            {online.slice(0, STACK).map((friend, index) => (
              <motion.span key={friend.userId} initial={{ scale: 0, x: -8 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }} transition={{ delay: index * 0.05 }} className="rounded-full ring-2 ring-[color-mix(in_srgb,_var(--surface),_black_5%)]" style={{ zIndex: STACK - index }}>
                <PlayerAvatar appearance={friend.appearance} label={friend.displayName} level={friend.level} size="sm" />
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      ) : (
        <Users className="w-4 h-4 text-amber-300/90" />
      )}
      <span className="hidden sm:flex flex-col leading-tight text-left">
        <span className="text-sm text-amber-100">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-400/80">{online.length} online</span>
      </span>
      <AnimatePresence>
        {badge > 0 ? (
          <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: [1.4, 1] }} exit={{ scale: 0 }} className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-[10px] leading-5 text-white text-center font-sans shadow-[0_0_10px_color-mix(in_srgb,_var(--color-amber-700)_60%,_transparent)]">
            {badge > 99 ? '99+' : badge}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
