'use client';

import { CalendarDays, Sparkles } from 'lucide-react';

import type { PublicProfile } from '@shared/domain/account/public-profile';

import { HeaderCorners } from '../AccountOrnaments';
import { HEADER_HIGHLIGHT, SEAL_BG, TITLE_GLOW } from '../account-surfaces';
import { PlayerAvatar } from '../PlayerAvatar';
import { Panel, ProgressBar, SERIF } from '../ui';
import { ProfileFriendAction } from '../../friends/ProfileFriendAction';
import { CopyProfileLinkButton } from './CopyProfileLinkButton';
import { formatMonth, formatNumber } from './public-profile-format';
import { publicProfileUrl } from './public-profile-links';

/** The "player card": avatar with level seal, name, handle, title, XP and tagline. */
export function PublicProfileHeader({ profile }: { profile: PublicProfile }) {
  const { level, title, levelXp, levelSpan, totalXp } = profile.progression;
  return (
    <Panel>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: HEADER_HIGHLIGHT }}
        aria-hidden
      />
      <HeaderCorners />
      <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7 text-center sm:text-left">
        <div className="relative shrink-0 pb-2">
          <PlayerAvatar appearance={profile.appearance} label={profile.displayName} size="xl" level={level} glow />
          <span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 min-w-11 px-2 h-7 rounded-full border-2 border-amber-500/70 inline-flex items-center justify-center text-sm text-amber-100 tabular-nums"
            style={{ ...SERIF, background: SEAL_BG, boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            aria-label={`Level ${level}`}
          >
            {level}
          </span>
        </div>

        <div className="min-w-0 flex-1 w-full">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-amber-500/80" style={SERIF}>
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            {title}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl text-amber-50 break-words" style={{ ...SERIF, textShadow: TITLE_GLOW }}>
            {profile.displayName}
          </h1>
          {profile.tagline ? (
            <p className="mt-3 text-sm sm:text-base italic text-amber-200/75 break-words" style={SERIF}>
              &ldquo;{profile.tagline}&rdquo;
            </p>
          ) : null}

          <div className="mt-4 max-w-md mx-auto sm:mx-0">
            <div className="flex items-baseline justify-between gap-3 text-xs text-amber-300/60 mb-1.5" style={SERIF}>
              <span>Level {level}</span>
              <span className="tabular-nums">
                {formatNumber(levelXp)} / {formatNumber(levelSpan)} XP
              </span>
            </div>
            <ProgressBar value={levelXp} max={levelSpan} />
            <div className="mt-1.5 text-[11px] text-amber-400/45">{formatNumber(totalXp)} XP earned in total</div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-300/50">
              <CalendarDays className="w-3.5 h-3.5" aria-hidden />
              Wizard since {formatMonth(profile.memberSince)}
            </span>
            <span className="flex items-center gap-2 w-full sm:w-auto">
              <ProfileFriendAction username={profile.username} />
              <CopyProfileLinkButton url={publicProfileUrl(profile.username)} className="w-full sm:w-auto" />
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
