'use client';

import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';

import { ConnectionIndicator } from '../../connection-indicator';
import { deadlineCaption, roundTableCaption } from './tournament-match-state';


/**
 * Header of a tournament table's lobby, in place of "Game Lobby" and the room code (a match room
 * can't be shared or joined by code): the match label and where it sits in the tournament.
 */
export function TournamentMatchBanner({ match, isConnected = true }: { match: TournamentMatchRoomState; isConnected?: boolean }) {
  const deadline = deadlineCaption(match);
  return (
    <motion.header
      className="text-center mb-6 sm:mb-8"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="inline-flex items-center justify-center mb-3">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-amber-500/25 rounded-full scale-150" aria-hidden />
          <div
            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-amber-500/60 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-amber-500) 35%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--color-amber-700) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" strokeWidth={1.5} aria-hidden />
          </div>
        </div>
      </div>

      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber-500/70 mb-1 font-serif">
        Tournament match
      </p>
      <h1
        className="text-xl sm:text-2xl font-normal text-amber-50 mb-1.5 break-words"
        style={{ fontFamily: 'var(--font-serif)', textShadow: '0 2px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent)' }}
      >
        {match.label}
      </h1>
      <div className="flex items-center justify-center gap-2 text-sm text-amber-400/70 font-serif">
        <span>{roundTableCaption(match)}</span>
        <ConnectionIndicator isWebSocketConnected={isConnected} compact />
      </div>
      {deadline && !match.expired ? (
        <p className="mt-1 text-xs text-amber-200/50 font-serif">
          {deadline}
        </p>
      ) : null}
    </motion.header>
  );
}
