'use client';

import { Check, ChevronDown, Crown, Pin } from 'lucide-react';
import { useId } from 'react';

import { countCorrectBids, type RoundResult } from '@shared/domain/account';

import type { AccountGameDto } from '@/lib/account/account-api';

import { SERIF } from '../ui';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };

function PlacementBadge({ placement }: { placement: number }) {
  const won = placement === 1;
  return (
    <span
      className={`w-9 h-9 shrink-0 rounded-lg border inline-flex items-center justify-center text-sm tabular-nums ${won ? 'border-amber-500/60 text-amber-300 bg-amber-900/30' : 'border-amber-800/40 text-amber-200/60'}`}
      style={SERIF}
      aria-hidden
    >
      {won ? <Crown className="w-4 h-4" /> : `#${placement}`}
    </span>
  );
}

export interface PinControl {
  pinned: boolean;
  busy: boolean;
  /** True when the pin limit is reached and this game is not pinned. */
  disabled: boolean;
  hint?: string;
  onToggle: () => void;
}

export function PinToggle({ pinned, busy, disabled, hint, onToggle }: PinControl) {
  const label = pinned ? 'Unpin game' : 'Pin game to profile';
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy || disabled}
      aria-pressed={pinned}
      aria-label={label}
      title={disabled && hint ? hint : label}
      className={`w-11 h-11 shrink-0 rounded-xl inline-flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
        pinned ? 'text-amber-300 hover:bg-amber-900/25' : 'text-amber-200/35 hover:text-amber-200/80 hover:bg-amber-900/20 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-amber-200/35'
      } ${busy ? 'animate-pulse' : ''}`}
    >
      <Pin className={`w-[18px] h-[18px] ${pinned ? 'rotate-45' : ''} transition-transform`} fill={pinned ? 'currentColor' : 'none'} />
    </button>
  );
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/** Per-round breakdown. Four narrow numeric columns, so it fits a 375px screen without scrolling. */
export function RoundTable({ id, rounds }: { id?: string; rounds: readonly RoundResult[] }) {
  const made = countCorrectBids({ rounds: [...rounds] });
  const total = rounds.reduce((sum, round) => sum + round.roundScore, 0);
  return (
    <div id={id} className="mt-1 mb-2 rounded-xl border border-amber-800/25 bg-black/20 overflow-hidden">
      <table className="w-full text-xs sm:text-sm tabular-nums" style={SERIF}>
        <caption className="sr-only">Rounds of this game</caption>
        <thead className="text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/70 bg-amber-950/20">
          <tr>
            <th scope="col" className="text-left font-normal px-3 py-2">Round</th>
            <th scope="col" className="text-right font-normal px-2 py-2">Bid</th>
            <th scope="col" className="text-right font-normal px-2 py-2">Won</th>
            <th scope="col" className="text-right font-normal px-3 py-2">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-900/20">
          {rounds.map((round, index) => {
            const hit = round.bid === round.tricksWon;
            return (
              // Rounds are positional and never reorder, so the round number is the identity.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index} className={hit ? 'text-amber-100' : 'text-amber-200/60'}>
                <td className="px-3 py-1.5 text-amber-200/45">{index + 1}</td>
                <td className="px-2 py-1.5 text-right">{round.bid}</td>
                <td className="px-2 py-1.5 text-right">
                  <span className={`inline-flex items-center gap-1 ${hit ? 'text-emerald-300/90' : ''}`}>
                    {hit ? <Check className="w-3 h-3" aria-hidden /> : null}
                    {round.tricksWon}
                    {hit ? <span className="sr-only">(bid made)</span> : null}
                  </span>
                </td>
                <td className={`px-3 py-1.5 text-right ${round.roundScore < 0 ? 'text-red-300/90' : ''}`}>{signed(round.roundScore)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-amber-800/30 text-amber-200/70">
          <tr>
            <th scope="row" className="text-left font-normal px-3 py-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-500/70">Total</th>
            <td colSpan={2} className="px-2 py-2 text-right text-[11px] text-amber-200/50">
              {made}/{rounds.length} bids made
            </td>
            <td className={`px-3 py-2 text-right ${total < 0 ? 'text-red-300' : 'text-amber-100'}`}>{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface GameRowProps {
  game: AccountGameDto;
  expanded: boolean;
  onToggleExpanded: () => void;
  pin?: PinControl;
}

/** One game: summary line that expands to the round table, plus an optional pin toggle. */
export function GameRow({ game, expanded, onToggleExpanded, pin }: GameRowProps) {
  const panelId = useId();
  return (
    <li className="py-1">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex-1 min-w-0 flex items-center gap-3 min-h-11 py-1.5 px-1.5 -mx-1.5 rounded-lg text-left cursor-pointer hover:bg-amber-900/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <PlacementBadge placement={game.placement} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-amber-100 truncate" style={SERIF}>
              {game.placement === 1 ? 'Victory' : `Placed ${game.placement} of ${game.playerCount}`}
            </div>
            <div className="text-[11px] text-amber-200/40 truncate">
              {new Date(game.playedAt).toLocaleString(undefined, DATE_FORMAT)} · {game.rounds.length} rounds
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-base tabular-nums ${game.score >= 0 ? 'text-amber-100' : 'text-red-300'}`} style={SERIF}>{game.score}</div>
            <div className="text-[11px] text-emerald-400/70 tabular-nums">+{game.xp} XP</div>
          </div>
          <ChevronDown className={`w-4 h-4 shrink-0 text-amber-500/60 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {pin ? <PinToggle {...pin} /> : null}
      </div>
      {expanded ? <RoundTable id={panelId} rounds={game.rounds} /> : null}
    </li>
  );
}
