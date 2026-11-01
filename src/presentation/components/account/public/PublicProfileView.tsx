'use client';

import Link from 'next/link';
import { History, Pin, Play } from 'lucide-react';

import type { PublicProfile } from '@shared/domain/account/public-profile';

import { HeaderCorners, SectionDivider } from '../AccountOrnaments';
import { AccountShell } from '../AccountShell';
import { Panel } from '../ui';
import { TrophyCabinet, cabinetTierCounts, fromPublicTrophies } from '../trophies';
import { PublicAchievementShowcase } from './PublicAchievementShowcase';
import { PublicGameList } from './PublicGameList';
import { PublicProfileHeader } from './PublicProfileHeader';
import { PublicStatsGrid } from './PublicStatsGrid';

/** Tournament trophies of the profile; players who never won one see no empty shelf. */
function PublicTrophyCabinet({ profile }: { profile: PublicProfile }) {
  // `?? []`: profiles cached before trophies existed lack the field until they are rebuilt.
  const entries = fromPublicTrophies(profile.trophies ?? []);
  if (entries.length === 0) return null;
  return <TrophyCabinet entries={entries} counts={cabinetTierCounts(entries, profile.trophyCounts)} />;
}

/** Public player card at /u/<username>. Receives only the whitelisted PublicProfile view. */
export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  return (
    <AccountShell>
      <div className="space-y-4 sm:space-y-5">
        <PublicProfileHeader profile={profile} />
        <SectionDivider />
        <PublicStatsGrid stats={profile.stats} />
        <PublicGameList
          icon={<Pin className="w-4 h-4" />}
          title="Pinned games"
          description="Legendary matches, chosen by the wizard."
          games={profile.pinnedGames}
        />
        <PublicTrophyCabinet profile={profile} />
        <PublicAchievementShowcase achievements={profile.achievements} />
        {profile.recentGames ? (
          <PublicGameList icon={<History className="w-4 h-4" />} title="Recent games" games={profile.recentGames} empty="No games played yet." />
        ) : null}

        <SectionDivider />
        <Panel>
          <HeaderCorners />
          <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 justify-between text-center sm:text-left">
            <div className="min-w-0">
              <h2 className="text-lg text-amber-100 break-words font-serif">
                Think you can out-bid {profile.displayName}?
              </h2>
              <p className="mt-1 text-sm text-amber-200/50">Wizard Party is a free multiplayer trick-taking card game. No download needed.</p>
            </div>
            <Link
              href="/"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-11 w-full sm:w-auto text-sm border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:text-white bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-border)_100%,transparent)_0%,color-mix(in_srgb,var(--page-base)_70%,transparent)_100%)] shadow-[0_4px_20px_color-mix(in_srgb,var(--glow)_40%,transparent)] transition-all font-serif"
            >
              <Play className="w-4 h-4" aria-hidden />
              Play Wizard Party
            </Link>
          </div>
        </Panel>
      </div>
    </AccountShell>
  );
}
