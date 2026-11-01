import { Gamepad2, Zap, TrendingUp, Crown } from 'lucide-react';
import { StatRow } from './StatRow';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ChronicleOfDeedsProps {
  gamesPlayed: number;
  totalTricksWon: number;
  totalScore: number;
  highestScore: number;
}

export function ChronicleOfDeeds({ gamesPlayed, totalTricksWon, totalScore, highestScore }: ChronicleOfDeedsProps) {
  return (
    <div
      className="rounded-xl border border-amber-800/30 overflow-hidden"
      style={{ background: THEME_SURFACE.CARD_BG_SOFT }}
    >
      <div className="px-4 py-2.5 border-b border-amber-800/20 bg-amber-900/20">
        <span className="text-xs text-amber-500/70 uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          Chronicle of Deeds
        </span>
      </div>
      <div className="p-3 space-y-1">
        <StatRow icon={<Gamepad2 className="w-3.5 h-3.5" />} label="Battles Fought" value={gamesPlayed} />
        <StatRow icon={<Zap className="w-3.5 h-3.5" />} label="Tricks Claimed" value={totalTricksWon} />
        <StatRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Total Glory" value={totalScore} />
        <StatRow icon={<Crown className="w-3.5 h-3.5" />} label="Greatest Victory" value={highestScore} highlight />
      </div>
    </div>
  );
}
