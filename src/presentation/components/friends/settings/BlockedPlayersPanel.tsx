'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban } from 'lucide-react';

import type { SocialPlayer } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';

import { PlayerAvatar } from '../../account/PlayerAvatar';
import { Notice, Panel, SERIF, SectionHeading, errorMessage } from '../../account/ui';

/** Blocked players can't add, invite or find you. Unblocking does not restore the friendship. */
export function BlockedPlayersPanel() {
  const [players, setPlayers] = useState<SocialPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => socialApi.blocked().then(({ players: list }) => setPlayers(list), (cause: unknown) => setError(errorMessage(cause))), []);
  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (userId: string) => {
    setPlayers((current) => current?.filter((player) => player.userId !== userId) ?? null);
    await socialApi.unblock(userId).catch((cause: unknown) => {
      setError(errorMessage(cause));
      void load();
    });
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading icon={<Ban className="w-4 h-4" />} title="Blocked players" description="They can't send you requests or invites and won't find you in search." />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {players && players.length === 0 ? <p className="text-sm text-amber-200/45" style={SERIF}>You haven&apos;t blocked anyone.</p> : null}
        <ul className="space-y-2">
          {(players ?? []).map((player) => (
            <li key={player.userId} className="flex items-center gap-3 rounded-xl border border-amber-900/30 px-3 py-2" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}>
              <PlayerAvatar appearance={player.appearance} label={player.displayName} level={player.level} size="sm" />
              <span className="flex-1 min-w-0 truncate text-sm text-amber-100" style={SERIF}>{player.displayName}</span>
              <button type="button" onClick={() => void unblock(player.userId)} className="h-9 px-3 rounded-lg border border-amber-800/40 text-xs text-amber-200/80 hover:text-amber-100 cursor-pointer">Unblock</button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
