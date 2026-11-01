'use client';

import { motion } from 'motion/react';
import { Bot, CheckCircle2, Hourglass, UserX } from 'lucide-react';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { useTournamentClock } from '@/presentation/hooks/useTournamentClock';

import {
  formatClock,
  lobbyPhaseHint,
  matchLobbyPhase,
  rosterSummary,
  seatStatus,
  secondsUntil,
  type MatchLobbyPhase,
  type SeatStatus,
} from './tournament-match-state';


const STATUS_VIEW: Record<SeatStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  seated: { label: 'At the table', icon: CheckCircle2, className: 'text-emerald-300/90' },
  waiting: { label: 'On the way', icon: Hourglass, className: 'text-amber-300/70' },
  'no-show': { label: 'No-show, a bot plays', icon: UserX, className: 'text-red-300/80' },
};

const PHASE_TITLE: Record<Exclude<MatchLobbyPhase['kind'], 'waiting'>, string> = {
  starting: 'The game is about to begin',
  expiring: 'This table is about to expire',
  expired: 'This table has expired',
};

/** What the lobby counts down to, with its caption and screen-reader label. */
const COUNTDOWN_VIEW: Record<Exclude<MatchLobbyPhase['kind'], 'expired'>, { caption: string; label: string }> = {
  starting: { caption: 'Starts in', label: 'Game starts in' },
  waiting: { caption: 'Deadline', label: 'No-show deadline in' },
  expiring: { caption: 'Expires in', label: 'Table expires in' },
};

function countdownTarget(phase: MatchLobbyPhase): number | null {
  switch (phase.kind) {
    case 'expired':
      return null;
    case 'waiting':
      return phase.deadlineAt;
    case 'starting':
    case 'expiring':
      return phase.at;
  }
}

/** The countdown of the lobby: auto start once everyone is seated, else the no-show deadline (or the match deadline, when sooner). */
function MatchCountdown({ match }: { match: TournamentMatchRoomState }) {
  const phase = matchLobbyPhase(match);
  const target = countdownTarget(phase);
  // Times are already on this device's clock (see readTournamentMatch).
  const now = useTournamentClock(0, target !== null);
  const summary = rosterSummary(match);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-900/30">
      <div className="min-w-0">
        <p className="text-sm text-amber-100 font-serif">
          {phase.kind === 'waiting' ? `Waiting for players · ${summary.seated}/${summary.expected}` : PHASE_TITLE[phase.kind]}
        </p>
        <p className="text-xs text-amber-200/50 mt-0.5">{lobbyPhaseHint(phase, summary)}</p>
      </div>
      {target !== null && phase.kind !== 'expired' ? (
        <div className="shrink-0 text-right" role="timer" aria-live="off" aria-label={COUNTDOWN_VIEW[phase.kind].label}>
          <span className="block text-[10px] uppercase tracking-wider text-amber-500/60 font-serif">
            {COUNTDOWN_VIEW[phase.kind].caption}
          </span>
          <span className="block text-xl tabular-nums text-amber-200 font-serif">
            {formatClock(secondsUntil(target, now))}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Who this tournament table is waiting for: every roster seat with its state, plus the bots the
 * table is padded with. The worker starts the game on its own; nobody can start it by hand.
 */
export function MatchWaitingRoster({ match }: { match: TournamentMatchRoomState }) {
  return (
    <motion.section
      className="mb-4 sm:mb-6 rounded-xl border border-[var(--surface-border)] overflow-hidden"
      style={{ background: 'var(--surface)', boxShadow: '0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 8%, transparent)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      aria-label="Players at this table"
    >
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
      <MatchCountdown match={match} />
      <ul className="divide-y divide-amber-900/20">
        {match.roster.map((seat) => {
          const status = seatStatus(seat);
          const view = STATUS_VIEW[status];
          const Icon = view.icon;
          return (
            <li key={seat.seat} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className={`font-serif text-sm truncate ${status === 'no-show' ? 'text-amber-200/40 line-through' : 'text-amber-50'}`}>
                {seat.name}
              </span>
              <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs ${view.className}`}>
                <Icon className={`w-3.5 h-3.5 ${status === 'waiting' ? 'animate-pulse' : ''}`} aria-hidden />
                {view.label}
              </span>
            </li>
          );
        })}
        {match.bots > 0 ? (
          <li className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm text-amber-200/60 font-serif">
              {match.bots === 1 ? 'One bot' : `${match.bots} bots`} to fill the table
            </span>
            <Bot className="w-4 h-4 text-amber-400/60" aria-hidden />
          </li>
        ) : null}
      </ul>
    </motion.section>
  );
}
