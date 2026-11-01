import {
  Award,
  Bird,
  CalendarDays,
  Castle,
  CloudFog,
  Coins,
  Compass,
  Crown,
  Diamond,
  Eye,
  Feather,
  Flag,
  Flame,
  Footprints,
  Gem,
  Hand,
  Hourglass,
  Infinity as InfinityIcon,
  Landmark,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  Medal,
  MountainSnow,
  Orbit,
  Podium,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Swords,
  Target,
  Telescope,
  Tent,
  Triangle,
  Trophy,
  Users,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { ICON_TILE_BG } from './account-surfaces';

/** Every `icon` used by ACHIEVEMENTS (kebab-case lucide names); unknown names fall back to sparkles. */
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  bird: Bird,
  'calendar-days': CalendarDays,
  castle: Castle,
  'cloud-fog': CloudFog,
  coins: Coins,
  compass: Compass,
  crown: Crown,
  diamond: Diamond,
  eye: Eye,
  feather: Feather,
  flag: Flag,
  flame: Flame,
  footprints: Footprints,
  gem: Gem,
  hand: Hand,
  hourglass: Hourglass,
  infinity: InfinityIcon,
  landmark: Landmark,
  layers: Layers,
  'layout-grid': LayoutGrid,
  'link-2': Link2,
  medal: Medal,
  'mountain-snow': MountainSnow,
  orbit: Orbit,
  podium: Podium,
  scale: Scale,
  'scroll-text': ScrollText,
  shield: Shield,
  'shield-check': ShieldCheck,
  skull: Skull,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  swords: Swords,
  target: Target,
  telescope: Telescope,
  tent: Tent,
  triangle: Triangle,
  trophy: Trophy,
  users: Users,
  'wand-sparkles': WandSparkles,
  zap: Zap,
};

/** Whether the icon registry resolves `icon` (used by tests to keep the catalogue fully mapped). */
export function hasAchievementIcon(icon: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICONS, icon);
}

export const TIER_STYLES: Record<string, { ring: string; text: string; glow: string; label: string }> = {
  bronze: { ring: 'border-orange-700/60', text: 'text-orange-300', glow: 'rgba(194,120,60,0.25)', label: 'Bronze' },
  silver: { ring: 'border-slate-400/60', text: 'text-slate-200', glow: 'rgba(200,210,220,0.2)', label: 'Silver' },
  gold: { ring: 'border-amber-400/70', text: 'text-amber-300', glow: 'rgba(240,190,80,0.3)', label: 'Gold' },
  legendary: { ring: 'border-fuchsia-400/60', text: 'text-fuchsia-300', glow: 'rgba(210,120,240,0.3)', label: 'Legendary' },
};

export function AchievementIcon({ icon, tier, locked, size = 'md' }: { icon: string; tier: string; locked?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = locked ? Lock : (ICONS[icon] ?? Sparkles);
  const style = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  const box = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const glyph = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div
      className={`${box} shrink-0 rounded-xl border-2 flex items-center justify-center ${locked ? 'border-amber-900/40 text-amber-800/60' : `${style.ring} ${style.text}`}`}
      style={{
        background: ICON_TILE_BG,
        boxShadow: locked ? undefined : `0 0 18px ${style.glow}`,
      }}
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </div>
  );
}
