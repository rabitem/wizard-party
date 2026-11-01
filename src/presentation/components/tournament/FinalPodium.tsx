'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';

import { HEADER_HIGHLIGHT, TITLE_GLOW } from '../account/account-surfaces';
import { ordinal } from '../account/public/public-profile-format';
import { Panel } from '../account/ui';
import { PlayerName } from './TournamentPlayer';
import { TROPHY_TIER_STYLES, TournamentTrophyIcon } from './TournamentTrophyIcon';
import { confettiPieces, honourAwards, podiumEntries, podiumOrder, podiumStep, viewerAwardXp, type PodiumEntry } from './tournament-detail-model';

const STEP_HEIGHT = { first: 'h-24 sm:h-28', second: 'h-16 sm:h-20', third: 'h-12 sm:h-14' } as const;
const STEP_TIER = { first: 'gold', second: 'silver', third: 'bronze' } as const;
/** Steps rise one after another: third, second, then the champion. */
const STEP_DELAY_S = { third: 0.1, second: 0.25, first: 0.45 } as const;
const FALL_DISTANCE_PX = 320;
/** Confetti are little rectangles: height as a share of their width. */
const CONFETTI_ASPECT = 0.6;

/** A one-off confetti burst over the podium; skipped entirely with reduced motion. */
function Celebration({ seed }: { seed: string }) {
  const colors = TOURNAMENT_UI.CELEBRATION_COLORS;
  const pieces = useMemo(() => confettiPieces(seed, colors.length), [seed, colors.length]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-0 rounded-[2px]"
          style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * CONFETTI_ASPECT, background: colors[piece.color] }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: FALL_DISTANCE_PX, x: piece.drift, rotate: piece.rotate, opacity: 0 }}
          transition={{ duration: TOURNAMENT_UI.CELEBRATION_DURATION_S, delay: piece.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function PodiumStep({ entry, viewerId, animate }: { entry: PodiumEntry; viewerId: string | null; animate: boolean }) {
  const step = podiumStep(entry.standing.rank);
  const tier = TROPHY_TIER_STYLES[STEP_TIER[step]];
  const isViewer = entry.standing.userId === viewerId;
  return (
    <motion.li
      className="flex min-w-0 flex-1 flex-col items-center justify-end"
      initial={animate ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: STEP_DELAY_S[step] }}
    >
      <TournamentTrophyIcon icon="trophy" tier={STEP_TIER[step]} size={step === 'first' ? 'lg' : 'md'} title={`${ordinal(entry.standing.rank)} place`} />
      <div className="mt-2 w-full min-w-0 px-1 text-center text-sm">
        <PlayerName displayName={entry.standing.displayName} username={entry.standing.username} isViewer={isViewer} className="max-w-full justify-center" />
        <span className="block text-[11px] tabular-nums text-amber-200/50">{entry.standing.points} pts</span>
      </div>
      <div
        className={`mt-2 flex w-full items-start justify-center rounded-t-xl border border-b-0 pt-1.5 ${STEP_HEIGHT[step]} ${tier.ring}`}
        style={{ background: `linear-gradient(180deg, ${tier.glow} 0%, transparent 100%)` }}
      >
        <span className={`font-serif text-lg ${tier.text}`}>
          {entry.standing.rank}
        </span>
      </div>
    </motion.li>
  );
}

/** Completed tournament: the podium, special honours and what the viewer earned, with a little confetti. */
export function FinalPodium({ detail }: { detail: TournamentDetailView }) {
  const reduceMotion = useReducedMotion() ?? false;
  const { standings, awards, viewer, tournament } = detail;
  const podium = useMemo(() => podiumOrder(podiumEntries(standings, awards)), [standings, awards]);
  const honours = useMemo(() => honourAwards(awards), [awards]);
  const earnedXp = viewerAwardXp(awards, viewer.userId);
  if (podium.length === 0) return null;

  return (
    <Panel>
      <div className="relative px-4 pb-5 pt-6 sm:px-6" style={{ background: HEADER_HIGHLIGHT }}>
        {reduceMotion ? null : <Celebration seed={tournament.id} />}
        <h2 className="flex items-center justify-center gap-2 text-center text-xl text-amber-50 sm:text-2xl" style={{ fontFamily: 'var(--font-serif)', textShadow: TITLE_GLOW }}>
          <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
          The podium
        </h2>
        <ol className="mx-auto mt-5 flex max-w-md items-end gap-2 sm:gap-3" aria-label="Podium">
          {podium.map((entry) => (
            <PodiumStep key={entry.standing.userId} entry={entry} viewerId={viewer.userId} animate={!reduceMotion} />
          ))}
        </ol>
        {earnedXp > 0 ? (
          <p className="mt-4 text-center text-sm text-amber-200 font-serif">
            You earned {earnedXp} XP in this tournament.
          </p>
        ) : null}
        {honours.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-400/70 font-serif">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Honours
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {honours.map((award) => (
                <li key={`${award.awardId}-${award.player.userId}`} className="flex items-center gap-3 rounded-xl border border-amber-900/30 bg-black/20 px-3 py-2">
                  <TournamentTrophyIcon icon={award.icon} tier={award.tier} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-amber-100 font-serif">
                      {award.name} · <PlayerName displayName={award.player.displayName} username={award.player.username} isViewer={award.player.userId === viewer.userId} />
                    </span>
                    <span className="block text-[11px] text-amber-200/45">
                      {award.description} +{award.xp} XP
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
