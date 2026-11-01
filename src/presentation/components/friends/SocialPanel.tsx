'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Inbox, Search, Users, X } from 'lucide-react';

import { socialApi } from '@/lib/social/social-api';
import { useSocial, useSocialPanel, type SocialPanelTab } from '@/presentation/providers/SocialProvider';

import { SERIF } from '../account/ui';
import { FindTab } from './FindTab';
import { FriendsTab } from './FriendsTab';
import { InboxTab } from './InboxTab';
import { StatusPicker } from './StatusPicker';

const TABS: { id: SocialPanelTab; label: string; icon: React.ReactNode }[] = [
  { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { id: 'find', label: 'Find', icon: <Search className="w-4 h-4" /> },
];

/** Slide-over social hub: own status, friends, inbox and player search. */
export function SocialPanel() {
  const { isOpen, tab, open, close } = useSocialPanel();
  const { friends, incoming, unread, inbox, refresh } = useSocial();
  const dialog = useRef<HTMLDivElement>(null);
  const online = friends.filter((friend) => friend.presence.status !== 'offline').length;

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    // Capture phase: the panel owns the keyboard while open, game shortcuts never see these keys.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (dialog.current?.contains(event.target as Node) || event.key === 'Escape') event.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      opener?.focus();
    };
  }, [isOpen, close, refresh]);

  // Opening the inbox reads what is on screen.
  useEffect(() => {
    if (!isOpen || tab !== 'inbox') return;
    const ids = inbox.items.filter((item) => item.readAt === null).map((item) => item.id).slice(0, 30);
    if (ids.length === 0) return;
    const timer = setTimeout(() => void socialApi.markRead({ ids }).then(refresh, () => undefined), 1200);
    return () => clearTimeout(timer);
  }, [isOpen, tab, inbox.items, refresh]);

  const badges: Record<SocialPanelTab, number> = { friends: incoming.length, inbox: unread, find: 0 };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            key="panel"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label="Social"
            tabIndex={-1}
            className="fixed z-[71] top-0 right-0 h-dvh w-full sm:w-[420px] flex flex-col border-l border-amber-700/30 shadow-2xl outline-none"
            style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 99%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 99%, transparent) 100%)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="flex items-start gap-2 px-4 pt-4 pb-3 border-b border-amber-800/25">
              <div className="flex-1 min-w-0"><StatusPicker /></div>
              <button type="button" onClick={close} aria-label="Close" className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-amber-300/70 hover:text-amber-100 hover:bg-amber-900/30 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-5 pt-2 text-[11px] uppercase tracking-wider text-amber-500/50" style={SERIF}>{online} of {friends.length} friends online</p>
            <div role="tablist" className="flex gap-1 px-3 pt-2">
              {TABS.map((item) => {
                const active = item.id === tab;
                const count = badges[item.id];
                return (
                  <button key={item.id} role="tab" aria-selected={active} onClick={() => open(item.id)} className={`relative flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm cursor-pointer transition-colors ${active ? 'text-amber-50' : 'text-amber-200/55 hover:text-amber-100'}`} style={SERIF}>
                    {item.icon}
                    {item.label}
                    {count > 0 ? (
                      <motion.span key={count} initial={{ scale: 0.3 }} animate={{ scale: 1 }} className="min-w-5 h-5 px-1 rounded-full bg-red-600 text-[10px] leading-5 text-white text-center font-sans">
                        {count > 99 ? '99+' : count}
                      </motion.span>
                    ) : null}
                    {active ? <motion.span layoutId="social-tab-underline" className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-amber-400" /> : null}
                  </button>
                );
              })}
            </div>
            <div role="tabpanel" className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {tab === 'friends' ? <FriendsTab /> : null}
              {tab === 'inbox' ? <InboxTab /> : null}
              {tab === 'find' ? <FindTab /> : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
