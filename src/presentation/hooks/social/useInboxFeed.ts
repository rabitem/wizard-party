'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { inboxItemState, type InboxItem } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';

/** On first load, only very recent items pop up as toasts (an invite that arrived during load). */
const FRESH_ON_LOAD_MS = 2 * 60_000;
const NO_ITEMS: InboxItem[] = [];

function withoutKnown(current: InboxItem[], incoming: InboxItem[]): InboxItem[] {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !known.has(item.id))];
}

/**
 * The first inbox page, reloaded whenever the pulse reports a newer item. Items that are new since
 * the last load are handed to `onArrived` (toasts), so notifications appear without a push channel.
 */
export function useInboxFeed(userId: string | null, latestAt: number | null, onArrived: (items: InboxItem[]) => void) {
  const [loaded, setLoaded] = useState<{ userId: string; items: InboxItem[]; nextCursor: string | null } | null>(null);
  const current = loaded && loaded.userId === userId ? loaded : null;
  const items = current?.items ?? NO_ITEMS;
  const nextCursor = current?.nextCursor ?? null;
  const seenUntil = useRef<{ userId: string; at: number } | null>(null);
  const onArrivedRef = useRef(onArrived);

  useEffect(() => {
    onArrivedRef.current = onArrived;
  });

  const reload = useCallback(async () => {
    if (!userId) return;
    const page = await socialApi.inbox().catch(() => null);
    if (!page) return;
    setLoaded((previous) => (previous && previous.userId !== userId ? previous : { userId, items: page.items, nextCursor: page.nextCursor }));
    const now = Date.now();
    const seen = seenUntil.current?.userId === userId ? seenUntil.current.at : null;
    const since = seen ?? now - FRESH_ON_LOAD_MS;
    const arrived = page.items.filter((item) => item.createdAt > since && item.readAt === null && inboxItemState(item, now) !== 'expired');
    seenUntil.current = { userId, at: Math.max(since, ...page.items.map((item) => item.createdAt)) };
    if (arrived.length > 0) onArrivedRef.current(arrived);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const seen = seenUntil.current?.userId === userId ? seenUntil.current.at : null;
    if (latestAt !== null && seen !== null && latestAt <= seen) return;
    void reload();
  }, [userId, latestAt, reload]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !userId) return;
    const page = await socialApi.inbox(nextCursor);
    setLoaded((previous) => (previous && previous.userId === userId ? { userId, items: withoutKnown(previous.items, page.items), nextCursor: page.nextCursor } : previous));
  }, [nextCursor, userId]);

  /** Local, optimistic edit of one item (read, resolved, removed). */
  const patch = useCallback((id: string, change: Partial<InboxItem> | null) => {
    const apply = (list: InboxItem[]) => (change === null ? list.filter((item) => item.id !== id) : list.map((item) => (item.id === id ? ({ ...item, ...change } as InboxItem) : item)));
    setLoaded((previous) => previous && { ...previous, items: apply(previous.items) });
  }, []);

  const hasMore = nextCursor !== null;
  return useMemo(() => ({ items, hasMore, loadMore, reload, patch }), [items, hasMore, loadMore, reload, patch]);
}
