'use client';

import { useCallback, useState } from 'react';

import { socialApi } from '@/lib/social/social-api';
import { notifyInviteSent } from '@/presentation/hooks/social/useSentInvites';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { errorMessage } from '../account/ui';

/**
 * Runs social commands with a per-key busy flag and one shared error/notice line, then refreshes
 * the social state. Components stay declarative: `run('pin:<id>', () => socialApi.setPinned(...))`.
 */
export function useSocialActions() {
  const { refresh } = useSocial();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(key: string, task: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(key);
      setError(null);
      setNotice(null);
      try {
        const result = await task();
        if (success) setNotice(success);
        refresh();
        return result;
      } catch (cause) {
        setError(errorMessage(cause));
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const invite = useCallback(
    (userId: string, roomCode: string, name: string) =>
      run(
        `invite:${userId}`,
        async () => {
          await socialApi.invite(userId, roomCode);
          notifyInviteSent(roomCode);
        },
        `Invite sent to ${name}.`
      ),
    [run]
  );

  const addFriend = useCallback(
    async (userId: string, name: string) => {
      const result = await run(`add:${userId}`, () => socialApi.sendFriendRequest({ userId }));
      if (result) setNotice(result.outcome === 'accepted' ? `You and ${name} are now friends!` : `Friend request sent to ${name}.`);
      return result;
    },
    [run]
  );

  return { run, busy, error, notice, invite, addFriend, clearMessages: () => (setError(null), setNotice(null)) };
}
