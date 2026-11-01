'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CheckCheck, Inbox } from 'lucide-react';

import { socialApi } from '@/lib/social/social-api';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { InboxEntry } from './InboxEntry';

const CLOCK_TICK_MS = 30_000;

/** The generic inbox: every notification kind, newest first, with paging and "mark all read". */
export function InboxTab() {
  const { inbox, unread, refresh } = useSocial();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const markAllRead = async () => {
    const at = Date.now();
    for (const item of inbox.items) if (item.readAt === null) inbox.patch(item.id, { readAt: at });
    await socialApi.markRead({ all: true }).catch(() => inbox.reload());
    refresh();
  };

  if (inbox.items.length === 0) {
    return (
      <div className="mt-10 text-center px-4">
        <Inbox className="w-10 h-10 mx-auto text-amber-700/50" />
        <p className="mt-3 text-sm text-amber-200/60 font-serif">Your inbox is empty</p>
        <p className="mt-1 text-xs text-amber-200/40">Friend requests and game invites land here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button type="button" disabled={unread === 0} onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs text-amber-300/70 hover:text-amber-100 hover:bg-amber-900/25 cursor-pointer disabled:opacity-40 disabled:cursor-default">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {inbox.items.map((item) => <InboxEntry key={item.id} item={item} now={now} />)}
        </AnimatePresence>
      </ul>
      {inbox.hasMore ? (
        <button type="button" onClick={() => void inbox.loadMore()} className="mt-3 w-full h-10 rounded-xl border border-amber-900/40 text-xs text-amber-200/60 hover:text-amber-100 cursor-pointer font-serif">
          Load older
        </button>
      ) : null}
    </div>
  );
}
