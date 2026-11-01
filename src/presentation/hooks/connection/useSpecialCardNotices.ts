'use client';

import type { SpecialCardNotice } from '@/presentation/components/special-cards/special-card-notices';
import { useStoreSelector } from '@/presentation/state/external-store';

import type { NoticeFeedHandlers, TableFeeds, TableFeedsState } from './table-feeds';

export interface UseSpecialCardNoticesReturn extends NoticeFeedHandlers {
  specialCardNotices: SpecialCardNotice[];
}

const selectSpecialCardNotices = (state: TableFeedsState) => state.specialCardNotices;

/**
 * Short-lived announcements of special-card effects (Bomb, Juggler, Cloud, Witch, Werewolf), as
 * React state (a view of the table feeds). Notices expire on their own.
 */
export function useSpecialCardNotices(feeds: TableFeeds): UseSpecialCardNoticesReturn {
  const specialCardNotices = useStoreSelector(feeds.store, selectSpecialCardNotices);
  return { specialCardNotices, ...feeds.notices };
}
