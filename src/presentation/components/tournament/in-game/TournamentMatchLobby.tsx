'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarX, Loader2, Timer } from 'lucide-react';

import type { IRulesetConfig } from '@shared/domain';
import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { summarizeRules } from '../../lobby/table';
import { MatchWaitingRoster } from './MatchWaitingRoster';
import { TournamentMatchBanner } from './TournamentMatchBanner';


interface TournamentMatchLobbyProps {
  match: TournamentMatchRoomState;
  rulesetConfig: IRulesetConfig;
  isConnected: boolean;
  /** Leaves the table (the seat stays reserved until the no-show deadline) and opens the tournament. */
  onBackToTournament: () => void;
}

/** The tournament's rules, read-only: the worker fixed them when it locked the table. */
function MatchRules({ rulesetConfig }: { rulesetConfig: IRulesetConfig }) {
  const chips = useMemo(() => summarizeRules(rulesetConfig), [rulesetConfig]);
  return (
    <section className="mb-4 sm:mb-6" aria-label="Table rules">
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li
            key={chip.id}
            className={`font-serif inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
              chip.isHouseRule ? 'border-amber-600/60 text-amber-200' : 'border-amber-800/50 text-amber-400/90'
            }`}
          >
            {chip.icon === 'timer' ? <Timer className="w-3 h-3" aria-hidden /> : null}
            {chip.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Lobby of a tournament table. The worker owns everything a host would do in a casual lobby
 * (seating, rules, bots, start), so there are no host controls, no invites and no room code:
 * only who is expected, the countdown, the tournament's rules and the way back.
 */
export function TournamentMatchLobby({ match, rulesetConfig, isConnected, onBackToTournament }: TournamentMatchLobbyProps) {
  return (
    <>
      <TournamentMatchBanner match={match} isConnected={isConnected} />
      {/* Stacked on phones and tablets; from lg the rules and the way back sit beside the roster. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-x-8 lg:items-start">
        <MatchWaitingRoster match={match} />
        <div>
          <MatchRules rulesetConfig={rulesetConfig} />
          <MatchLobbyActions match={match} onBackToTournament={onBackToTournament} />
        </div>
      </div>
    </>
  );
}

function MatchLobbyActions({ match, onBackToTournament }: Pick<TournamentMatchLobbyProps, 'match' | 'onBackToTournament'>) {
  return (
    <motion.section
      className="sticky bottom-0 lg:static -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-4 sm:py-5 lg:pt-0 bg-[linear-gradient(180deg,transparent_0%,var(--surface)_20%,var(--surface)_100%)] lg:bg-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBackToTournament}
          className="py-3 px-4 rounded-xl border border-amber-700/40 hover:border-amber-600/50 hover:bg-amber-900/20 text-amber-300/80 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)', fontFamily: 'var(--font-serif)' }}
          title="Back to the tournament"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline text-sm">Tournament</span>
          <span className="sr-only sm:hidden">Back to the tournament</span>
        </button>
        <div
          className="flex-1 flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border border-amber-700/40 text-amber-400/70"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)', fontFamily: 'var(--font-serif)' }}
          role="status"
        >
          {match.expired ? <CalendarX className="w-5 h-5" aria-hidden /> : <Loader2 className="w-5 h-5 animate-spin" aria-hidden />}
          <span className="text-sm sm:text-base">{match.expired ? 'Table expired' : 'Starts automatically'}</span>
        </div>
      </div>
    </motion.section>
  );
}
