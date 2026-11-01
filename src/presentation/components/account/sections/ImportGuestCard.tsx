'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import { AccountApiError, accountApi } from '@/lib/account/account-api';
import { loadGuestImportPayload } from '@/lib/account/guest-progress';
import { resetPlayerStats } from '@/lib/player-stats';
import { safeLocalStorage } from '@/lib/storage';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { Button, Notice, Panel, SERIF, errorMessage } from '../ui';

const decisionKey = (userId: string) => `wizard-party-guest-import:${userId}`;

/** Offers to move this browser's guest stats into the account, once per account and browser. */
export function ImportGuestCard({ onImported }: { onImported: () => void }) {
  const { user } = useAccount();
  const [games, setGames] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      const decided = safeLocalStorage.getItem(decisionKey(user.id));
      setGames(decided ? 0 : (loadGuestImportPayload()?.stats.gamesPlayed ?? 0));
    });
  }, [user]);

  if (!user || games === 0) return null;

  const decide = () => {
    safeLocalStorage.setItem(decisionKey(user.id), new Date().toISOString());
    setGames(0);
  };

  const importNow = async () => {
    const payload = loadGuestImportPayload();
    if (!payload) return decide();
    setBusy(true);
    setError(null);
    try {
      await accountApi.importGuest(payload.stats, payload.history);
      // The progress moved into the account; keeping it here would invite a second import elsewhere.
      resetPlayerStats();
      decide();
      onImported();
    } catch (err) {
      if (err instanceof AccountApiError && err.code === 'already_imported') {
        setError('This account already contains guest progress from a browser. Only one import is possible.');
        decide();
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <span className="w-11 h-11 shrink-0 rounded-xl border border-amber-600/40 bg-amber-900/30 inline-flex items-center justify-center text-amber-300">
          <Download className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-amber-100" style={SERIF}>Bring your guest progress along</h3>
          <p className="text-sm text-amber-200/55 mt-0.5">
            This browser holds {games} {games === 1 ? 'game' : 'games'} you played as a guest. Add them to your account to keep the stats and earn the XP.
          </p>
          {error ? <Notice tone="error" className="mt-3">{error}</Notice> : null}
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button variant="primary" loading={busy} onClick={importNow} className="flex-1">Import</Button>
          <Button variant="ghost" onClick={decide} disabled={busy} className="flex-1">Not now</Button>
        </div>
      </div>
    </Panel>
  );
}
