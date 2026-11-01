'use client';

import { useStoreSelector } from '@/presentation/state/external-store';

import type { SocialFeedHandlers, TableFeeds, TableFeedsState } from './table-feeds';
import type { ISocialState } from './types';

export type UseSocialStateReturn = ISocialState & SocialFeedHandlers;

const selectEmotes = (state: TableFeedsState) => state.emotes;
const selectChatMessages = (state: TableFeedsState) => state.chatMessages;
const selectBidEvents = (state: TableFeedsState) => state.bidEvents;

/** Reactions, chat and bid bubbles of the table, as React state (a view of the table feeds). */
export function useSocialState(feeds: TableFeeds): UseSocialStateReturn {
  const emotes = useStoreSelector(feeds.store, selectEmotes);
  const chatMessages = useStoreSelector(feeds.store, selectChatMessages);
  const bidEvents = useStoreSelector(feeds.store, selectBidEvents);
  return { emotes, chatMessages, bidEvents, ...feeds.social };
}
