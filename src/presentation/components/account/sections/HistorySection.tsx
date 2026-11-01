'use client';

import { Pin, RefreshCw, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ACCOUNT_LIMITS } from '@shared/domain/account';

import { accountApi, type AccountGameDto } from '@/lib/account/account-api';

import { OwnPublicProfileLink } from '../public/PublicProfileLink';
import { Button, Notice, Panel, SectionHeading, errorMessage } from '../ui';
import { GameRow, type PinControl } from './GameHistoryRow';
import { pinOverrides } from './pin-overrides';
import { useGamePins } from './useGamePins';

type LoadState = 'loading' | 'ready' | 'loading-more' | 'error';

const LIMIT_HINT = `Pin limit reached (${ACCOUNT_LIMITS.MAX_PINNED_GAMES}). Unpin a game to pin another.`;

function mergeById(existing: readonly AccountGameDto[], incoming: readonly AccountGameDto[]): AccountGameDto[] {
  const seen = new Set(existing.map((game) => game.clientGameId));
  return [...existing, ...incoming.filter((game) => !seen.has(game.clientGameId))];
}

/** Keyset-paginated history: first page on mount, "Load more" for older games. */
function useGameHistory() {
  const [games, setGames] = useState<AccountGameDto[]>([]);
  const [pinned, setPinned] = useState<AccountGameDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const checkpoint = pinOverrides.checkpoint();
    accountApi
      .gameHistory()
      .then((page) => {
        if (cancelled) return;
        // Fresh server pins replace older changes from this tab (e.g. unpinned on another device).
        pinOverrides.reconcile([...page.games, ...(page.pinned ?? [])].map((game) => game.clientGameId), checkpoint);
        setGames(page.games);
        setPinned(page.pinned ?? []);
        setCursor(page.nextCursor);
        setState('ready');
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(errorMessage(cause));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setState('loading');
    setAttempt((n) => n + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || state !== 'ready') return;
    setState('loading-more');
    setError(null);
    try {
      const checkpoint = pinOverrides.checkpoint();
      const page = await accountApi.gameHistory({ cursor });
      pinOverrides.reconcile(page.games.map((game) => game.clientGameId), checkpoint);
      setGames((current) => mergeById(current, page.games));
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setState('ready');
    }
  }, [cursor, state]);

  return { games, pinned, hasMore: cursor !== null, state, error, retry, loadMore };
}

function useExpandedRows() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  return { isExpanded: (key: string) => expanded.has(key), toggle };
}

interface GameListProps {
  games: readonly AccountGameDto[];
  /** Distinguishes expansion state when a game appears in two lists. */
  group: string;
  empty: string;
  rows: ReturnType<typeof useExpandedRows>;
  pinControl: (game: AccountGameDto) => PinControl;
}

function GameList({ games, group, empty, rows, pinControl }: GameListProps) {
  if (games.length === 0) {
    return <p className="text-sm text-amber-200/45 italic font-serif">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-amber-800/20">
      {games.map((game) => (
        <GameRow
          key={game.clientGameId}
          game={game}
          expanded={rows.isExpanded(`${group}:${game.clientGameId}`)}
          onToggleExpanded={() => rows.toggle(`${group}:${game.clientGameId}`)}
          pin={pinControl(game)}
        />
      ))}
    </ul>
  );
}

function HistoryFooter({ history }: { history: ReturnType<typeof useGameHistory> }) {
  if (history.hasMore) {
    return (
      <Button block className="mt-4" loading={history.state === 'loading-more'} onClick={() => void history.loadMore()}>
        Load more
      </Button>
    );
  }
  if (history.games.length === 0) return null;
  return (
    <p className="mt-4 text-center text-[11px] uppercase tracking-wider text-amber-600/45 font-serif">
      The beginning of your chronicle
    </p>
  );
}

function HistoryStatus({ history }: { history: ReturnType<typeof useGameHistory> }) {
  const loading = history.state === 'loading';
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-3" aria-busy={loading}>
        <SectionHeading icon={<ScrollText className="w-4 h-4" />} title="Game history" />
        {loading ? (
          [0, 1, 2, 3].map((n) => <div key={n} className="h-12 rounded-lg bg-amber-900/10 animate-pulse" />)
        ) : (
          <>
            <Notice tone="error">{history.error}</Notice>
            <Button icon={<RefreshCw className="w-4 h-4" />} onClick={history.retry}>Try again</Button>
          </>
        )}
      </div>
    </Panel>
  );
}

/** Pinned games of the loaded data plus pins changed in this tab, most recently pinned first. */
function collectPinned(history: ReturnType<typeof useGameHistory>, pinnedAt: (game: AccountGameDto) => number | null): AccountGameDto[] {
  const known = new Map<string, AccountGameDto>();
  for (const game of [...history.pinned, ...history.games]) known.set(game.clientGameId, game);
  return [...known.values()]
    .filter((game) => pinnedAt(game) !== null)
    .sort((a, b) => (pinnedAt(b) ?? 0) - (pinnedAt(a) ?? 0));
}

export function HistorySection() {
  const history = useGameHistory();
  const pins = useGamePins();
  const rows = useExpandedRows();

  if (history.state === 'loading' || (history.state === 'error' && history.games.length === 0)) {
    return <HistoryStatus history={history} />;
  }

  // Computed every render: pins.pinnedAt reads the shared pin store, and useGamePins re-renders on change.
  const pinnedGames = collectPinned(history, pins.pinnedAt);
  const limitReached = pinnedGames.length >= ACCOUNT_LIMITS.MAX_PINNED_GAMES;
  const pinControl = (game: AccountGameDto): PinControl => {
    const pinned = pins.pinnedAt(game) !== null;
    return {
      pinned,
      busy: pins.isBusy(game.clientGameId),
      disabled: !pinned && limitReached,
      hint: LIMIT_HINT,
      onToggle: () => void pins.toggle(game),
    };
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {pins.error ? <Notice tone="error">{pins.error}</Notice> : null}

      <Panel accent={false}>
        <div className="p-4 sm:p-5">
          <SectionHeading
            icon={<Pin className="w-4 h-4" />}
            title="Pinned"
            description={`Your finest games, shown on your public profile. ${pinnedGames.length}/${ACCOUNT_LIMITS.MAX_PINNED_GAMES} pinned.`}
          />
          <GameList
            games={pinnedGames}
            group="pinned"
            empty="Nothing pinned yet. Tap the pin on any game below to keep it here."
            rows={rows}
            pinControl={pinControl}
          />
          {limitReached ? <p className="mt-3 text-xs text-amber-200/50">{LIMIT_HINT}</p> : null}
          <OwnPublicProfileLink className="mt-2" />
        </div>
      </Panel>

      <Panel accent={false}>
        <div className="p-4 sm:p-5">
          <SectionHeading
            icon={<ScrollText className="w-4 h-4" />}
            title="All battles"
            description="Every game recorded while signed in, newest first. Tap a game to see each round."
          />
          <GameList
            games={history.games}
            group="all"
            empty="No battles recorded yet. Finish a game while signed in to begin your chronicle."
            rows={rows}
            pinControl={pinControl}
          />
          {history.error ? <Notice tone="error" className="mt-3">{history.error}</Notice> : null}
          <HistoryFooter history={history} />
        </div>
      </Panel>
    </div>
  );
}
