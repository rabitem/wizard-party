'use client';

import { useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';

import type { TournamentDetailView } from '@shared/application/use-cases/tournament';

import { useLocalAppearance } from '@/presentation/hooks/account/useLocalAppearance';
import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';
import type { PodiumContender } from '@/presentation/types/podium.types';

import { HEADER_HIGHLIGHT, TITLE_GLOW } from '../account/account-surfaces';
import { Panel } from '../account/ui';
import { CharacterPodium } from '../podium';
import { PlayerName } from './TournamentPlayer';
import { TournamentTrophyIcon } from './TournamentTrophyIcon';
import { confettiPieces, honourAwards, podiumEntries, tournamentPodiumContenders, viewerAwardXp } from './tournament-detail-model';

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

/** Completed tournament: the podium, special honours and what the viewer earned, with a little confetti. */
export function FinalPodium({ detail }: { detail: TournamentDetailView }) {
  const reduceMotion = useReducedMotion() ?? false;
  const { standings, awards, viewer, tournament } = detail;
  const viewerAppearance = useLocalAppearance();
  const entries = useMemo(() => podiumEntries(standings, awards), [standings, awards]);
  const contenders = useMemo(() => tournamentPodiumContenders(entries, viewer.userId, viewerAppearance), [entries, viewer.userId, viewerAppearance]);
  const usernames = useMemo(() => new Map(entries.map(({ standing }) => [standing.userId, standing.username])), [entries]);
  // The name links the player's public profile; the link fills a 44px row for touch.
  const renderName = useCallback(
    (contender: PodiumContender) => (
      <PlayerName displayName={contender.name} username={usernames.get(contender.id) ?? null} isViewer={contender.isViewer} className="min-h-11 max-w-full justify-center" />
    ),
    [usernames]
  );
  const honours = useMemo(() => honourAwards(awards), [awards]);
  const earnedXp = viewerAwardXp(awards, viewer.userId);
  if (entries.length === 0) return null;

  return (
    <Panel>
      <div className="relative px-4 pb-5 pt-6 sm:px-6" style={{ background: HEADER_HIGHLIGHT }}>
        {reduceMotion ? null : <Celebration seed={tournament.id} />}
        <h2 className="flex items-center justify-center gap-2 text-center text-xl text-amber-50 sm:text-2xl" style={{ fontFamily: 'var(--font-serif)', textShadow: TITLE_GLOW }}>
          <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
          The podium
        </h2>
        <div className="mx-auto mt-5 max-w-md">
          <CharacterPodium contenders={contenders} renderName={renderName} />
        </div>
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
