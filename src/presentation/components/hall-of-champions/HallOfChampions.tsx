'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Coins, Crown, Percent, Sparkles, Trophy, type LucideIcon } from 'lucide-react';

import { LEADERBOARD_CATEGORIES, LEADERBOARD_RULES, type LeaderboardCategory } from '@shared/domain/account/leaderboard';

import { useAccount } from '@/presentation/providers/AccountProvider';

import { ChampionList } from './ChampionList';
import { ChampionPodium } from './ChampionPodium';
import { CATEGORY_COPY } from './leaderboard-format';
import { useLeaderboards } from './useLeaderboards';

const SERIF = { fontFamily: 'Georgia, serif' } as const;

const ICONS: Record<LeaderboardCategory, LucideIcon> = {
  level: Sparkles,
  wins: Trophy,
  'win-rate': Percent,
  'best-score': Coins,
};

function SectionHeader() {
  return (
    <h2 className="text-2xl sm:text-3xl text-amber-50 mb-4" style={SERIF}>Hall of Champions</h2>
  );
}

function CategoryTabs({ value, onChange }: { value: LeaderboardCategory; onChange: (next: LeaderboardCategory) => void }) {
  return (
    <div role="tablist" aria-label="Leaderboard category" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {LEADERBOARD_CATEGORIES.map((category) => {
        const Icon = ICONS[category];
        const active = category === value;
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(category)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border text-xs sm:text-sm transition-all cursor-pointer ${active ? 'border-amber-500/60 bg-amber-900/40 text-amber-100' : 'border-amber-900/40 text-amber-300/60 hover:text-amber-100 hover:border-amber-700/50'}`}
            style={SERIF}
          >
            <Icon className="w-3.5 h-3.5" />
            {CATEGORY_COPY[category].label}
          </button>
        );
      })}
    </div>
  );
}

function joinHintCopy(isGuest: boolean): [text: string, href: string, cta: string] {
  if (isGuest) return ['Guests play anonymously. Create a free account to earn your place here.', '/sign-in?mode=sign-up', 'Join the hall'];
  return ['Keep playing to climb the ranks. Only public profiles are listed.', '/account?tab=profile', 'Profile settings'];
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <Crown className="mx-auto mb-3 w-10 h-10 text-amber-700/40" strokeWidth={1.25} />
      <p className="text-amber-100/90" style={SERIF}>The hall awaits its first champion.</p>
      <p className="mt-1 text-xs text-amber-200/75" style={SERIF}>Finish a game with an account to claim the throne.</p>
    </div>
  );
}

/** The boards could not be loaded (a server without accounts, or the request failed). */
function UnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-10 text-center" role="status">
      <Crown className="mx-auto mb-3 w-10 h-10 text-amber-700/40" strokeWidth={1.25} />
      <p className="text-amber-100/90" style={SERIF}>The hall&apos;s records are out of reach right now.</p>
      <p className="mt-1 text-xs text-amber-200/75" style={SERIF}>The champions are still there. Try again in a moment.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-10 px-4 rounded-full border border-amber-700/50 text-sm text-amber-200 cursor-pointer hover:border-amber-500/60 hover:text-amber-100"
        style={SERIF}
      >
        Try again
      </button>
    </div>
  );
}

/** Tells the visitor how to get onto the board, depending on who they are. */
function JoinHint({ listed }: { listed: boolean }) {
  const { status } = useAccount();
  if (listed || status === 'loading') return null;
  const [text, href, cta] = joinHintCopy(status === 'guest');
  return (
    <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-amber-200/75" style={SERIF}>
      {text}
      <Link href={href} className="text-amber-400 underline decoration-amber-700/60 underline-offset-2 hover:text-amber-300">{cta}</Link>
    </p>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 pt-4" aria-busy aria-label="Loading leaderboard">
      <div className="grid grid-cols-3 gap-3 items-end">
        {[16, 24, 12].map((h) => <div key={h} className="rounded-xl bg-amber-900/15 animate-pulse" style={{ height: `${h * 0.25 + 6}rem` }} />)}
      </div>
      <div className="h-40 rounded-xl bg-amber-900/10 animate-pulse" />
    </div>
  );
}

export function HallOfChampions() {
  const leaderboards = useLeaderboards();
  const { user } = useAccount();
  const [category, setCategory] = useState<LeaderboardCategory>('level');
  const selfUsername = user?.username ?? null;

  const entries = leaderboards.status === 'ready' ? leaderboards.boards[category] : [];
  const listed = entries.some((entry) => entry.username === selfUsername);

  return (
    <motion.section
      className="mb-8 sm:mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      aria-labelledby="hall-of-champions"
    >
      <SectionHeader />
      {/* The start page sets this on its own realm panel (HallStation), so it carries no card of its own */}
      <div>
        <div>
          <span id="hall-of-champions" className="sr-only">Top players</span>
          {leaderboards.status === 'error' ? <UnavailableState onRetry={leaderboards.retry} /> : <CategoryTabs value={category} onChange={setCategory} />}
          {category === 'win-rate' && leaderboards.status !== 'error' ? (
            <p className="mt-2 text-[11px] text-amber-600/55" style={SERIF}>Players with at least {LEADERBOARD_RULES.MIN_GAMES_FOR_WIN_RATE} games.</p>
          ) : null}

          {leaderboards.status === 'loading' ? <LoadingState /> : null}
          {leaderboards.status === 'ready' && entries.length === 0 ? <EmptyState /> : null}
          {entries.length > 0 ? (
            <>
              <ChampionPodium entries={entries} category={category} selfUsername={selfUsername} />
              <ChampionList entries={entries.slice(3)} category={category} selfUsername={selfUsername} />
            </>
          ) : null}
          {leaderboards.status === 'error' ? null : <JoinHint listed={listed} />}
        </div>
      </div>
    </motion.section>
  );
}
