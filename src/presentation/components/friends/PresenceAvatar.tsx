'use client';

import { motion, useReducedMotion } from 'motion/react';

import type { PresenceStatus } from '@shared/domain/social';

import { PlayerAvatar, type PlayerAvatarSize } from '../account/PlayerAvatar';
import { STATUS_COLORS } from './social-format';

const DOT: Record<PlayerAvatarSize, string> = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-4 h-4', xl: 'w-5 h-5' };

interface PresenceAvatarProps {
  avatarId: string | null | undefined;
  level: number;
  status: PresenceStatus;
  size?: PlayerAvatarSize;
  /** In a lobby or game: a slow orbiting spark around the frame. */
  playing?: boolean;
}

/**
 * A player's avatar with live presence: a breathing halo while online, an orbiting spark while
 * in a lobby or game, a status dot that pops when it changes, and a desaturated face when offline.
 * All motion stops under prefers-reduced-motion.
 */
export function PresenceAvatar({ avatarId, level, status, size = 'md', playing = false }: PresenceAvatarProps) {
  const reduceMotion = useReducedMotion();
  const color = STATUS_COLORS[status];
  const live = status !== 'offline';

  return (
    <span className="relative inline-flex shrink-0">
      {live && !reduceMotion ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${color}55, 0 0 14px ${color}66` }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.15, 0.55] }}
          transition={{ duration: status === 'online' ? 2.4 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
      {playing && live && !reduceMotion ? (
        <motion.span aria-hidden className="absolute -inset-1 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
          <span className="absolute left-1/2 -top-0.5 w-1.5 h-1.5 -ml-[3px] rounded-full bg-amber-200 shadow-[0_0_8px_2px_color-mix(in_srgb,_var(--color-amber-300)_80%,_transparent)]" />
        </motion.span>
      ) : null}
      <span className={`relative inline-flex rounded-full transition-[filter,opacity] duration-500 ${live ? '' : 'grayscale opacity-60'}`}>
        <PlayerAvatar avatarId={avatarId ?? 'wizard'} level={level} size={size} />
      </span>
      <motion.span
        key={status}
        aria-hidden
        className={`absolute -bottom-0.5 -right-0.5 ${DOT[size]} rounded-full border-2 border-[color-mix(in_srgb,_var(--surface),_black_5%)]`}
        style={{ background: color }}
        initial={reduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      />
    </span>
  );
}
