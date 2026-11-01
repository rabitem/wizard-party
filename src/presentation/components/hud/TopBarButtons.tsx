'use client';

import { ReactNode } from 'react';
import { Settings, BarChart3, Trophy } from 'lucide-react';
import { HudButtonDecor, HudIcon, useHudClassName } from './skins';

interface TopBarButtonsProps {
  onStatsOpen: () => void;
  onSettingsOpen: () => void;
  onLeaderboardToggle?: () => void;
  leaderboardOpen?: boolean;
  /** Standings shown as a popover from a trophy button (layout policy decides) */
  showLeaderboard?: boolean;
  leaderboardContent?: ReactNode;
}

function MedievalButton({
  onClick,
  active = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  const skinClass = useHudClassName('button');
  // hud-control-size: 44px on a coarse pointer, 40px with a mouse (CSS variables from the layout policy)
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`group relative hud-control-size flex items-center justify-center transition-all cursor-pointer ${
        active
          ? 'text-amber-300'
          : 'text-amber-500/70 hover:text-amber-300'
      } ${skinClass}`}
      style={{
        background: active
          ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)'
          : 'var(--surface)',
      }}
    >
      {/* Border frame */}
      <div
        className={`absolute inset-0 border-2 transition-colors ${
          active ? 'border-amber-600/60' : 'border-amber-800/40 group-hover:border-amber-700/50'
        }`}
      />
      {/* Inner shadow */}
      <div className="absolute inset-[2px] bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
      {/* Corner accents */}
      <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
      <HudButtonDecor />
      {/* Content */}
      <div className="relative">{children}</div>
    </button>
  );
}

/** Stats, settings and (when standings are a popover) leaderboard buttons; HUD actions region. */
export function TopBarButtons({
  onStatsOpen,
  onSettingsOpen,
  onLeaderboardToggle,
  leaderboardOpen = false,
  showLeaderboard = false,
  leaderboardContent,
}: TopBarButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <MedievalButton onClick={onStatsOpen} title="Your Stats">
        <HudIcon id="stats" fallback={BarChart3} className="w-5 h-5" />
      </MedievalButton>
      <MedievalButton onClick={onSettingsOpen} title="Settings">
        <HudIcon id="settings" fallback={Settings} className="w-5 h-5" />
      </MedievalButton>
      {showLeaderboard && onLeaderboardToggle ? <div className="relative">
          <MedievalButton
            onClick={onLeaderboardToggle}
            active={leaderboardOpen}
            title="Leaderboard"
          >
            <HudIcon id="trophy" fallback={Trophy} className="w-5 h-5" />
          </MedievalButton>
          {leaderboardContent}
        </div> : null}
    </div>
  );
}
