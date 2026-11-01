'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { FriendsOverview, RoomPlayerAccount } from '@shared/application/use-cases/friends';
import { OFFLINE_PRESENCE, compareFriends, presenceRank, type Friend, type InboxItem, type PresenceActivity, type PresenceMode } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { getOrCreatePlayerId } from '@/presentation/hooks/connection/utils';
import { loadSeatToken } from '@/presentation/hooks/connection/seat-session-store';
import { useCurrentActivity } from '@/presentation/hooks/social/useCurrentActivity';
import { useInboxFeed } from '@/presentation/hooks/social/useInboxFeed';
import { useRoomAccounts } from '@/presentation/hooks/social/useRoomAccounts';
import { useSocialPulse } from '@/presentation/hooks/social/useSocialPulse';

import { useAccount } from './AccountProvider';
import { useGame } from './GameProvider';

export type SocialPanelTab = 'friends' | 'inbox' | 'find';

/** Social data, kept fresh by the heartbeat. Split from the panel UI state so toggles don't re-render lists. */
export interface SocialState {
  enabled: boolean;
  mode: PresenceMode;
  activity: PresenceActivity;
  /** Friends with the freshest presence, pinned first. */
  friends: Friend[];
  incoming: FriendsOverview['incoming'];
  outgoing: FriendsOverview['outgoing'];
  unread: number;
  inbox: ReturnType<typeof useInboxFeed>;
  /** Accounts at the current table by game seat. */
  roomAccounts: ReadonlyMap<string, RoomPlayerAccount>;
  /** Re-reads friends, room accounts and presence after a change. */
  refresh: () => void;
}

/** UI state of the social overlays (panel and toasts), rendered by <SocialOverlays />. */
export interface SocialPanelControls {
  isOpen: boolean;
  tab: SocialPanelTab;
  open: (tab?: SocialPanelTab) => void;
  close: () => void;
  toasts: InboxItem[];
  dismissToast: (id: string) => void;
}

const SocialStateContext = createContext<SocialState | null>(null);
const SocialPanelContext = createContext<SocialPanelControls | null>(null);

const EMPTY: FriendsOverview = { friends: [], incoming: [], outgoing: [] };
const MAX_TOASTS = 4;

function mergeToasts(queue: InboxItem[], arrived: InboxItem[]): InboxItem[] {
  const queued = new Set(queue.map((item) => item.id));
  return [...arrived.filter((item) => !queued.has(item.id)), ...queue].slice(0, MAX_TOASTS);
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAccount();
  const userId = status === 'signed-in' ? user?.id ?? null : null;
  const enabled = userId !== null;
  const activity = useCurrentActivity();
  const { gameState } = useGame();
  // The seat's session token proves the seat; browsers that never got one fall back to their id.
  const seatProof = useCallback(
    () => (activity.kind === 'menu' ? undefined : loadSeatToken(activity.roomCode)) ?? getOrCreatePlayerId(),
    [activity]
  );
  const { pulse, pulseNow } = useSocialPulse(userId, activity, seatProof);
  const [loadedOverview, setOverview] = useState<{ userId: string; overview: FriendsOverview } | null>(null);
  const [toasts, setToasts] = useState<InboxItem[]>([]);
  const [panel, setPanel] = useState<{ isOpen: boolean; tab: SocialPanelTab }>({ isOpen: false, tab: 'friends' });
  // A different account (or signed out): drop everything that belonged to the previous one.
  const [scopedTo, setScopedTo] = useState(userId);
  if (scopedTo !== userId) {
    setScopedTo(userId);
    setToasts([]);
    setPanel({ isOpen: false, tab: 'friends' });
  }
  const overview = loadedOverview && loadedOverview.userId === userId ? loadedOverview.overview : EMPTY;

  const mode = pulse?.mode ?? 'online';
  const onArrived = useCallback(
    (items: InboxItem[]) => {
      // Do not disturb: the inbox still fills, but nothing pops up.
      if (mode !== 'busy') setToasts((queue) => mergeToasts(queue, items));
    },
    [mode]
  );
  const inbox = useInboxFeed(userId, pulse?.inbox.latestAt ?? null, onArrived);

  const roomCode = activity.kind === 'menu' ? null : activity.roomCode;
  // Only once the server accepted the room (seat attested): before that the roster answers empty.
  const acceptedRoom = roomCode !== null && pulse?.roomCode === roomCode ? roomCode : null;
  const seatKey = (gameState?.players ?? []).map((player) => player.id).sort().join(',');
  const { seats: roomAccounts, reload: reloadRoom } = useRoomAccounts(enabled, acceptedRoom, seatKey);

  const loadFriends = useCallback(() => {
    if (!userId) return;
    socialApi.friends().then((next) => setOverview({ userId, overview: next }), () => undefined);
  }, [userId]);

  // Friends change when someone accepts (a new inbox item) and on sign-in.
  const latestAt = pulse?.inbox.latestAt ?? null;
  useEffect(() => {
    if (enabled) loadFriends();
  }, [enabled, latestAt, loadFriends]);

  const refresh = useCallback(() => {
    loadFriends();
    reloadRoom();
    pulseNow();
  }, [loadFriends, reloadRoom, pulseNow]);

  const friends = useMemo(() => {
    const live = pulse?.presence;
    if (!live) return overview.friends;
    return overview.friends
      .map((friend) => ({ ...friend, presence: live[friend.userId] ?? OFFLINE_PRESENCE }))
      .sort(compareFriends((friend) => presenceRank(friend.presence)));
  }, [overview.friends, pulse]);

  const state = useMemo<SocialState>(
    () => ({
      enabled,
      mode,
      activity,
      friends,
      incoming: overview.incoming,
      outgoing: overview.outgoing,
      unread: pulse?.inbox.unread ?? 0,
      inbox,
      roomAccounts,
      refresh,
    }),
    [enabled, mode, activity, friends, overview, pulse, inbox, roomAccounts, refresh]
  );

  const open = useCallback((tab: SocialPanelTab = 'friends') => setPanel({ isOpen: true, tab }), []);
  useSocialDeepLink(enabled, open);
  const close = useCallback(() => setPanel((current) => ({ ...current, isOpen: false })), []);
  const dismissToast = useCallback((id: string) => setToasts((queue) => queue.filter((item) => item.id !== id)), []);
  const controls = useMemo<SocialPanelControls>(() => ({ ...panel, open, close, toasts, dismissToast }), [panel, open, close, toasts, dismissToast]);

  return (
    <SocialStateContext.Provider value={state}>
      <SocialPanelContext.Provider value={controls}>
        {children}
      </SocialPanelContext.Provider>
    </SocialStateContext.Provider>
  );
}

const PANEL_TABS: readonly SocialPanelTab[] = ['friends', 'inbox', 'find'];

/** Links in emails (`?social=inbox`) open the panel once the account is known, then drop the param. */
function useSocialDeepLink(enabled: boolean, open: (tab: SocialPanelTab) => void) {
  useEffect(() => {
    if (!enabled) return;
    const url = new URL(window.location.href);
    const tab = url.searchParams.get('social') as SocialPanelTab | null;
    if (!tab || !PANEL_TABS.includes(tab)) return;
    url.searchParams.delete('social');
    window.history.replaceState(window.history.state, '', url.toString());
    open(tab);
  }, [enabled, open]);
}

export function useSocial(): SocialState {
  const context = useContext(SocialStateContext);
  if (!context) throw new Error('useSocial must be used inside SocialProvider');
  return context;
}

export function useSocialPanel(): SocialPanelControls {
  const context = useContext(SocialPanelContext);
  if (!context) throw new Error('useSocialPanel must be used inside SocialProvider');
  return context;
}
