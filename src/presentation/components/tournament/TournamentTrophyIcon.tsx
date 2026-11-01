'use client';

import { Award, Coins, Eye, Flag, Medal, Shield, Sparkles, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';

import type { TrophyTier } from '@shared/domain/tournament';

import { ICON_TILE_BG } from '../account/account-surfaces';

/**
 * Icon names of TOURNAMENT_AWARDS (the domain names lucide icons, the presentation resolves
 * them). A new award only needs its icon here; unknown names fall back to a sparkle.
 */
const AWARD_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  medal: Medal,
  award: Award,
  eye: Eye,
  coins: Coins,
  'trending-up': TrendingUp,
  shield: Shield,
  flag: Flag,
};

export const TROPHY_TIER_STYLES: Record<TrophyTier, { ring: string; text: string; glow: string; label: string }> = {
  gold: { ring: 'border-amber-400/70', text: 'text-amber-300', glow: 'rgba(240,190,80,0.35)', label: 'Gold' },
  silver: { ring: 'border-slate-300/60', text: 'text-slate-200', glow: 'rgba(200,210,220,0.25)', label: 'Silver' },
  bronze: { ring: 'border-orange-600/60', text: 'text-orange-300', glow: 'rgba(194,120,60,0.3)', label: 'Bronze' },
  special: { ring: 'border-violet-400/60', text: 'text-violet-200', glow: 'rgba(170,130,240,0.3)', label: 'Honour' },
  participation: { ring: 'border-amber-800/60', text: 'text-amber-200/70', glow: 'rgba(160,120,60,0.15)', label: 'Finisher' },
};

const BOX = { sm: 'w-8 h-8 rounded-lg', md: 'w-11 h-11 rounded-xl', lg: 'w-16 h-16 rounded-2xl' } as const;
const GLYPH = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' } as const;

/** A tournament award as a tier-coloured tile; reused by the trophy cabinet on account pages. */
export function TournamentTrophyIcon({ icon, tier, size = 'md', title }: { icon: string; tier: TrophyTier; size?: keyof typeof BOX; title?: string }) {
  const Icon = AWARD_ICONS[icon] ?? Sparkles;
  const style = TROPHY_TIER_STYLES[tier] ?? TROPHY_TIER_STYLES.participation;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border ${BOX[size]} ${style.ring}`}
      style={{ background: ICON_TILE_BG, boxShadow: `0 0 16px ${style.glow}` }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon className={`${GLYPH[size]} ${style.text}`} strokeWidth={1.75} />
    </span>
  );
}
