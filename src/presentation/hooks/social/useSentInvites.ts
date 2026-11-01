'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SentInviteDto } from '@/app/api/types/social-invites.types';
import { socialApi } from '@/lib/social/social-api';
import { useAccount } from '@/presentation/providers/AccountProvider';

/** How often a visible lobby looks at its sent invites again, so answers show up live. */
const POLL_MS = 10_000;
const NO_INVITES: SentInviteDto[] = [];

/** Window event fired after an invite was sent, so lists of sent invites refresh right away. */
export const INVITE_SENT_EVENT = 'wizard-party:invite-sent';

export interface InviteSentDetail {
  roomCode: string;
}

/** Tells every mounted `useSentInvites` of this room that an invite was just sent. */
export function notifyInviteSent(roomCode: string): void {
  window.dispatchEvent(new CustomEvent<InviteSentDetail>(INVITE_SENT_EVENT, { detail: { roomCode } }));
}

export interface SentInvitesState {
  invites: SentInviteDto[];
  /** True until the first answer for this room arrived; background polls don't set it. */
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Removes the invite at once; puts it back (and sets `error`) when the server refuses. */
  revoke: (id: string) => Promise<void>;
}

const messageOf = (cause: unknown) => (cause instanceof Error && cause.message ? cause.message : 'Something went wrong.');

/**
 * The invites the signed-in player sent to `roomCode`, with their answers. Polls while the tab is
 * visible and right after an invite is sent. Guests and a null room get an empty list, no fetch.
 */
export function useSentInvites(roomCode: string | null): SentInvitesState {
  const { status } = useAccount();
  const room = status === 'signed-in' ? roomCode : null;
  const [loaded, setLoaded] = useState<{ roomCode: string; invites: SentInviteDto[] } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ roomCode: string; message: string } | null>(null);
  // Revoked here: hidden from later answers too, so a poll racing the revoke can't bring them back.
  const revoked = useRef(new Set<string>());
  const roomRef = useRef(room);
  const loadedRef = useRef(loaded);

  useEffect(() => {
    loadedRef.current = loaded;
  });

  useEffect(() => {
    roomRef.current = room;
    revoked.current.clear();
  }, [room]);

  const refresh = useCallback(async () => {
    if (!room) return;
    setLoading(room);
    try {
      const { invites } = await socialApi.sentInvites(room);
      if (roomRef.current !== room) return;
      setLoaded({ roomCode: room, invites: invites.filter((invite) => !revoked.current.has(invite.id)) });
      setFailure(null);
    } catch (cause) {
      if (roomRef.current === room) setFailure({ roomCode: room, message: messageOf(cause) });
    } finally {
      setLoading((current) => (current === room ? null : current));
    }
  }, [room]);

  useEffect(() => {
    if (!room) return;
    const load = () => {
      if (document.visibilityState !== 'hidden') void refresh();
    };
    const onSent = (event: Event) => {
      const detail = (event as CustomEvent<InviteSentDetail | undefined>).detail;
      if (!detail || detail.roomCode === room) void refresh();
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    window.addEventListener(INVITE_SENT_EVENT, onSent);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener(INVITE_SENT_EVENT, onSent);
    };
  }, [room, refresh]);

  const revoke = useCallback(
    async (id: string) => {
      if (!room) return;
      const current = loadedRef.current?.roomCode === room ? loadedRef.current.invites : NO_INVITES;
      const index = current.findIndex((invite) => invite.id === id);
      const removed = index >= 0 ? current[index] : null;
      revoked.current.add(id);
      setFailure(null);
      setLoaded((previous) => (previous && previous.roomCode === room ? { ...previous, invites: previous.invites.filter((invite) => invite.id !== id) } : previous));
      try {
        await socialApi.revokeInvite(id);
      } catch (cause) {
        revoked.current.delete(id);
        if (roomRef.current !== room) return;
        setFailure({ roomCode: room, message: messageOf(cause) });
        if (!removed) return;
        setLoaded((previous) => {
          if (!previous || previous.roomCode !== room || previous.invites.some((invite) => invite.id === id)) return previous;
          const invites = [...previous.invites];
          invites.splice(Math.min(index, invites.length), 0, removed);
          return { ...previous, invites };
        });
      }
    },
    [room]
  );

  const hasLoaded = room !== null && loaded?.roomCode === room;
  const invites = hasLoaded && loaded ? loaded.invites : NO_INVITES;
  // Only the first load counts: background polls don't flicker a spinner.
  const isLoading = room !== null && loading === room && !hasLoaded;
  const error = room !== null && failure?.roomCode === room ? failure.message : null;
  return useMemo(() => ({ invites, isLoading, error, refresh, revoke }), [invites, isLoading, error, refresh, revoke]);
}
