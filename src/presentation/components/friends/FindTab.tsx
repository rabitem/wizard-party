'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Loader2, Search } from 'lucide-react';

import { SOCIAL_LIMITS, type PlayerSearchResult } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';

import { PlayerAvatar } from '../account/PlayerAvatar';
import { Notice, errorMessage } from '../account/ui';
import { RelationshipButton } from './RelationshipButton';

const DEBOUNCE_MS = 300;

/** Player search by name, with one-tap add. */
export function FindTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();
  const searchable = trimmed.replace(/^@/, '').length >= SOCIAL_LIMITS.SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      socialApi.search(trimmed, controller.signal).then(
        ({ players }) => {
          setResults(players);
          setError(null);
          setLoading(false);
        },
        (cause: unknown) => {
          if (controller.signal.aborted) return;
          setError(errorMessage(cause));
          setLoading(false);
        }
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searchable]);

  const shown = searchable ? results : null;

  return (
    <div>
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/60" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={SOCIAL_LIMITS.SEARCH_MAX_LENGTH}
          placeholder="Search by name"
          aria-label="Search players"
          className="wp-field w-full h-11 pl-9 pr-9 rounded-xl border border-amber-700/25 text-sm focus:outline-none focus:border-amber-500/60"
          style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)', color: 'color-mix(in srgb, var(--color-amber-100) 95%, transparent)' }}
        />
        {searchable && loading ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-500/60" /> : null}
      </label>
      {error ? <Notice tone="error" className="mt-3">{error}</Notice> : null}
      {shown && shown.length === 0 && !(searchable && loading) ? <p className="mt-6 text-center text-sm text-amber-200/45 font-serif">No players found</p> : null}
      {!searchable ? <p className="mt-6 text-center text-xs text-amber-200/40">Type at least {SOCIAL_LIMITS.SEARCH_MIN_LENGTH} characters. Private profiles are only found by their exact name.</p> : null}
      <ul className="mt-3 space-y-2">
        {(shown ?? []).map((player, index) => (
          <motion.li key={player.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center gap-3 rounded-xl border border-amber-900/30 px-3 py-2.5" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}>
            <PlayerAvatar appearance={player.appearance} label={player.displayName} level={player.level} size="md" />
            <div className="min-w-0 flex-1">
              {player.hasPublicProfile ? (
                <Link href={`/u/${player.username}`} className="block truncate text-sm text-amber-100 hover:underline font-serif">{player.displayName}</Link>
              ) : (
                <span className="block truncate text-sm text-amber-100 font-serif">{player.displayName}</span>
              )}
              <span className="block truncate text-xs text-amber-200/40">Level {player.level}</span>
            </div>
            <RelationshipButton player={player} relationship={player.relationship} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
