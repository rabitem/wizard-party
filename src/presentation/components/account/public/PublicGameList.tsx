'use client';

import type { ReactNode } from 'react';
import { Crown, Medal } from 'lucide-react';

import type { PublicGameSummary } from '@shared/domain/account/public-profile';

import { INSET_BG } from '../account-surfaces';
import { Panel, SectionHeading } from '../ui';
import { formatDate, formatNumber, ordinal } from './public-profile-format';

const PLACEMENT_STYLES: Record<number, string> = {
  1: 'border-amber-400/70 text-amber-300 bg-amber-900/40',
  2: 'border-slate-400/60 text-slate-200 bg-slate-800/30',
  3: 'border-orange-700/60 text-orange-300 bg-orange-950/30',
};
const OTHER_PLACEMENT = 'border-amber-900/50 text-amber-200/60 bg-black/20';
const PODIUM = 3;

function PlacementGlyph({ game }: { game: PublicGameSummary }) {
  if (game.won) return <Crown className="w-5 h-5" />;
  if (game.placement <= PODIUM) return <Medal className="w-5 h-5" />;
  return (
    <span className="text-sm font-serif">
      {game.placement}
    </span>
  );
}

function GameRow({ game }: { game: PublicGameSummary }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-amber-800/25 p-3 min-w-0" style={{ background: INSET_BG }}>
      <span className={`w-11 h-11 shrink-0 rounded-xl border-2 inline-flex items-center justify-center ${PLACEMENT_STYLES[game.placement] ?? OTHER_PLACEMENT}`} aria-hidden>
        <PlacementGlyph game={game} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-amber-100 truncate font-serif">
          {game.won ? 'Victory' : `${ordinal(game.placement)} place`} <span className="text-amber-300/50">of {game.playerCount}</span>
        </div>
        <div className="text-[11px] text-amber-300/45 truncate">
          {formatDate(game.playedAt)} · {game.correctBids}/{game.roundsPlayed} bids met
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-base text-amber-50 tabular-nums font-serif">
          {formatNumber(game.score)}
        </div>
        <div className="text-[11px] text-amber-500/60 tabular-nums">+{formatNumber(game.xp)} XP</div>
      </div>
    </li>
  );
}

interface PublicGameListProps {
  icon: ReactNode;
  title: string;
  description?: string;
  games: PublicGameSummary[];
  /** Shown when there are no games; without it an empty list renders nothing. */
  empty?: string;
}

export function PublicGameList({ icon, title, description, games, empty }: PublicGameListProps) {
  if (games.length === 0 && !empty) return null;
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading icon={icon} title={title} description={description} />
        {games.length === 0 ? (
          <p className="text-sm text-amber-200/45 font-serif">
            {empty}
          </p>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {games.map((game) => (
              // Public games carry no id on purpose; time, score and placement identify one in practice.
              <GameRow key={`${game.playedAt}-${game.score}-${game.placement}`} game={game} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
