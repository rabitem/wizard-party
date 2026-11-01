'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { inboxItemState, type InboxItem } from '@shared/domain/social';

import { useSocialPanel } from '@/presentation/providers/SocialProvider';

import { PlayerAvatar } from '../account/PlayerAvatar';
import { InboxActions, useInboxAction } from './InboxEntry';
import { rendererFor } from './inbox-renderers';

const TOAST_MS = 12_000;

function Toast({ item, onDismiss }: { item: InboxItem; onDismiss: (id: string) => void }) {
  const { open } = useSocialPanel();
  const action = useInboxAction(() => onDismiss(item.id));
  const renderer = rendererFor(item);
  const [shownAt] = useState(() => Date.now());
  const actionable = inboxItemState(item, shownAt) === 'actionable';

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-600/40 shadow-2xl"
      style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 98%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 15%) 98%, transparent) 100%)' }}
    >
      <motion.span aria-hidden className="absolute bottom-0 left-0 h-0.5 bg-amber-400/70" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: TOAST_MS / 1000, ease: 'linear' }} />
      <div className="flex items-start gap-3 p-3">
        <motion.span initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}>
          <PlayerAvatar avatarId={item.actor?.avatar ?? 'wizard'} level={item.actor?.level ?? 1} size="md" />
        </motion.span>
        <button type="button" className="min-w-0 flex-1 text-left cursor-pointer" onClick={() => open('inbox')}>
          <span className="block text-sm text-amber-50 leading-snug font-serif">{renderer.title(item)}</span>
          {renderer.detail ? <span className="block text-xs text-amber-200/45 mt-0.5">{renderer.detail(item)}</span> : null}
          {renderer.live ? <span className="block text-xs mt-0.5">{renderer.live(item, actionable)}</span> : null}
          {action.error ? <span className="block text-xs text-red-300 mt-1">{action.error}</span> : null}
        </button>
        <button type="button" aria-label="Dismiss" onClick={() => onDismiss(item.id)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-amber-300/60 hover:text-amber-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      {actionable ? (
        <div className="px-3 pb-3 pl-[4.25rem] -mt-2">
          <InboxActions item={item} action={action} renderer={renderer} />
        </div>
      ) : null}
    </motion.li>
  );
}

/** Pop-ups for new inbox items (bottom left, away from the game's controls). */
export function SocialToasts({ items, onDismiss }: { items: InboxItem[]; onDismiss: (id: string) => void }) {
  return (
    <ul aria-live="polite" className="pointer-events-none fixed z-[80] left-4 bottom-4 flex flex-col-reverse gap-2">
      <AnimatePresence initial={false}>
        {items.map((item) => <Toast key={item.id} item={item} onDismiss={onDismiss} />)}
      </AnimatePresence>
    </ul>
  );
}
