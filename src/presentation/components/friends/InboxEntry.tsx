'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2, Trash2 } from 'lucide-react';

import { INBOX_KINDS, inboxItemState, type InboxItem } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useJoinRoom } from '@/presentation/hooks/social/useJoinRoom';
import { useSocial, useSocialPanel } from '@/presentation/providers/SocialProvider';

import { PlayerAvatar } from '../account/PlayerAvatar';
import { SERIF, errorMessage } from '../account/ui';
import { rendererFor } from './inbox-renderers';
import { timeAgo } from './social-format';

const RESOLUTION_LABEL = { accept: 'Accepted', decline: 'Declined', cancelled: 'Withdrawn' } as const;

/**
 * Runs an inbox action. Accepting an invite moves the player to that lobby (leaving the current
 * room properly); while a game is running it first asks to confirm, via `confirming`.
 */
export function useInboxAction(onDone?: () => void) {
  const router = useRouter();
  const { inbox, refresh } = useSocial();
  const { close } = useSocialPanel();
  const { joinRoom, leaveRoom, needsConfirmation } = useJoinRoom();
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (item: InboxItem, action: 'accept' | 'decline', confirmed = false) => {
    const joins = item.kind === 'game_invite' && action === 'accept';
    // Taking a tournament seat also leaves the room the player is in.
    const leavesRoom = joins || (item.kind === 'tournament_table_ready' && action === 'accept');
    if (leavesRoom && needsConfirmation && !confirmed) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setPending(action);
    setError(null);
    try {
      const result = await socialApi.act(item.id, action);
      inbox.patch(item.id, { resolvedAt: Date.now(), resolution: action, readAt: item.readAt ?? Date.now() });
      refresh();
      onDone?.();
      if (joins) {
        close();
        await joinRoom(item.payload.roomCode);
      } else if (result.navigateTo) {
        // The panel covers the whole screen on phones: close it before any navigation.
        close();
        if (leavesRoom) await leaveRoom();
        router.push(result.navigateTo);
      }
    } catch (cause) {
      setError(errorMessage(cause));
      void inbox.reload();
    } finally {
      setPending(null);
    }
  };
  return { act, pending, error, confirming, cancelConfirm: () => setConfirming(false) };
}

/** Accept / decline buttons, with a "leave your game?" step when a game is running. */
export function InboxActions({ item, action, renderer }: { item: InboxItem; action: ReturnType<typeof useInboxAction>; renderer: ReturnType<typeof rendererFor> }) {
  const { act, pending, confirming, cancelConfirm } = action;
  const primary = `inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-amber-500/60 bg-amber-800/50 text-xs text-amber-50 hover:bg-amber-700/60 cursor-pointer disabled:opacity-50`;
  const secondary = 'h-8 px-3 rounded-lg border border-amber-900/50 text-xs text-amber-200/70 hover:text-amber-100 cursor-pointer disabled:opacity-50';
  if (confirming) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-amber-200/70">Leave your running game?</span>
        <button type="button" onClick={() => void act(item, 'accept', true)} className={primary} style={SERIF}>Leave &amp; join</button>
        <button type="button" onClick={cancelConfirm} className={secondary} style={SERIF}>Stay</button>
      </div>
    );
  }
  // Each kind declares its actions (a table call can only be answered by joining).
  const { actions } = INBOX_KINDS[item.kind];
  return (
    <div className="mt-2 flex gap-2">
      {actions.includes('accept') ? (
        <button type="button" disabled={pending !== null} onClick={() => void act(item, 'accept')} className={primary} style={SERIF}>
          {pending === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {renderer.acceptLabel ?? 'Accept'}
        </button>
      ) : null}
      {actions.includes('decline') ? (
        <button type="button" disabled={pending !== null} onClick={() => void act(item, 'decline')} className={secondary} style={SERIF}>
          {renderer.declineLabel ?? 'Decline'}
        </button>
      ) : null}
    </div>
  );
}

/** One inbox item: actor avatar, text, age and, while actionable, its actions. */
export function InboxEntry({ item, now }: { item: InboxItem; now: number }) {
  const { inbox } = useSocial();
  const action = useInboxAction();
  const renderer = rendererFor(item);
  const state = inboxItemState(item, now);
  const unread = item.readAt === null && state !== 'expired';
  const live = renderer.live?.(item, state === 'actionable');

  const dismiss = () => {
    inbox.patch(item.id, null);
    void socialApi.dismiss(item.id).catch(() => inbox.reload());
  };

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={`group relative rounded-xl border px-3 py-3 ${unread ? 'border-amber-600/40' : 'border-amber-900/30'}`} style={{ background: unread ? 'color-mix(in srgb, var(--color-amber-900) 30%, transparent)' : 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}>
      {unread ? <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_color-mix(in_srgb,_var(--color-amber-500)_80%,_transparent)]" aria-label="Unread" /> : null}
      <div className="flex items-start gap-3 pl-1.5">
        {item.actor ? <PlayerAvatar avatarId={item.actor.avatar ?? 'wizard'} level={item.actor.level} size="sm" /> : <span className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-amber-900/30 text-amber-400">{renderer.icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-amber-100 leading-snug" style={SERIF}>
            <span className="inline-flex align-[-2px] mr-1.5 text-amber-500/80">{renderer.icon}</span>
            {renderer.title(item)}
          </p>
          <p className="mt-0.5 text-xs text-amber-200/40">
            {renderer.detail ? `${renderer.detail(item)} · ` : ''}
            {timeAgo(item.createdAt, now)}
            {state === 'expired' ? ' · expired' : ''}
            {state === 'resolved' && item.resolution ? ` · ${RESOLUTION_LABEL[item.resolution]}` : ''}
          </p>
          {live ? <p className="mt-0.5 text-xs">{live}</p> : null}
          {state === 'actionable' ? <InboxActions item={item} action={action} renderer={renderer} /> : null}
          {action.error ? <p className="mt-1.5 text-xs text-red-300/90">{action.error}</p> : null}
        </div>
        <button type="button" onClick={dismiss} aria-label="Remove notification" className="opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 inline-flex items-center justify-center rounded-lg text-amber-300/60 hover:text-red-300 hover:bg-red-950/30 transition-opacity cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.li>
  );
}
