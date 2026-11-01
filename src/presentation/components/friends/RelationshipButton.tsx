'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Loader2, UserCheck, UserPlus } from 'lucide-react';

import type { Relationship, SocialPlayer } from '@shared/domain/social';

import { AccountApiError } from '@/lib/account/account-api';
import { socialApi } from '@/lib/social/social-api';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { errorMessage } from '../account/ui';

/** regular: icon + label; compact: icon + @name; icon: a bare icon (tight HUD rows). */
type Size = 'icon' | 'compact' | 'regular';

const LOOK: Record<Exclude<Relationship, 'self'>, { label: string; icon: React.ReactNode; actionable: boolean }> = {
  none: { label: 'Add friend', icon: <UserPlus className="w-3.5 h-3.5" />, actionable: true },
  request_received: { label: 'Accept', icon: <UserCheck className="w-3.5 h-3.5" />, actionable: true },
  request_sent: { label: 'Requested', icon: <Clock className="w-3.5 h-3.5" />, actionable: false },
  friend: { label: 'Friends', icon: <Check className="w-3.5 h-3.5" />, actionable: false },
  blocked: { label: 'Blocked', icon: null, actionable: false },
};

const SIZE_CLASS: Record<Size, string> = { icon: 'h-6 w-6 justify-center', compact: 'h-7 px-2 text-[11px]', regular: 'h-9 px-3 text-xs' };

function toneClass(state: Exclude<Relationship, 'self'>): string {
  if (LOOK[state].actionable) return 'border-amber-500/60 bg-amber-800/35 text-amber-50 hover:bg-amber-700/45';
  if (state === 'friend') return 'border-emerald-700/50 text-emerald-300/90';
  return 'border-amber-900/40 text-amber-200/50';
}

function caption(size: Size, actionable: boolean, label: string, who: string): string | null {
  if (size === 'icon') return null;
  return size === 'compact' && actionable ? who : label;
}

interface RelationshipButtonProps {
  player: Pick<SocialPlayer, 'userId' | 'displayName'>;
  relationship: Relationship;
  size?: Size;
}

/**
 * The one "add friend" control used everywhere (search, lobby, in-game scoreboard, game end,
 * public profiles). Optimistic, and it names the account (@name) it acts on, so a guest's table name
 * can never silently stand for someone else.
 */
export function RelationshipButton({ player, relationship, size = 'regular' }: RelationshipButtonProps) {
  const { refresh } = useSocial();
  const [state, setState] = useState<Relationship>(relationship);
  const [synced, setSynced] = useState(relationship);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the server's answer when it changes (e.g. the other player accepted meanwhile).
  if (relationship !== synced) {
    setSynced(relationship);
    setState(relationship);
  }

  if (state === 'self') return null;
  const look = LOOK[state];
  const who = `@${player.displayName}`;

  const act = async () => {
    setPending(true);
    setError(null);
    try {
      const { outcome } = await socialApi.sendFriendRequest({ userId: player.userId });
      setState(outcome === 'accepted' || outcome === 'already_friends' ? 'friend' : 'request_sent');
      refresh();
    } catch (cause) {
      setError(cause instanceof AccountApiError && cause.status === 429 ? 'Slow down a little.' : errorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="relative inline-flex flex-col items-end shrink-0">
      <motion.button
        type="button"
        disabled={!look.actionable || pending}
        onClick={() => void act()}
        whileTap={look.actionable ? { scale: 0.92 } : undefined}
        title={look.actionable ? `${look.label}: ${who}` : `${look.label} · ${who}`}
        aria-label={`${look.label} ${who}`}
        className={`font-serif inline-flex items-center gap-1.5 rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${SIZE_CLASS[size]} ${toneClass(state)}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={`${state}-${pending}`} initial={{ scale: 0.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} className="inline-flex">
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : look.icon}
          </motion.span>
        </AnimatePresence>
        {caption(size, look.actionable, look.label, who) ? <span className="max-w-[7rem] truncate">{caption(size, look.actionable, look.label, who)}</span> : null}
      </motion.button>
      {error ? <span role="alert" className="absolute top-full right-0 mt-1 w-max max-w-[14rem] rounded-md bg-red-950/90 border border-red-800/50 px-2 py-1 text-[11px] text-red-200 z-10">{error}</span> : null}
    </span>
  );
}
