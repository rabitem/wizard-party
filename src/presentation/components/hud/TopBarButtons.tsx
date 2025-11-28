'use client';

import { Settings, BarChart3 } from 'lucide-react';

interface TopBarButtonsProps {
  onStatsOpen: () => void;
  onSettingsOpen: () => void;
}

export function TopBarButtons({ onStatsOpen, onSettingsOpen }: TopBarButtonsProps) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
      <button
        onClick={onStatsOpen}
        className="group p-2.5 bg-[#0a0a15]/90 hover:bg-[#15152a] backdrop-blur-sm rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
        title="Your Stats"
      >
        <BarChart3 className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
      </button>
      <button
        onClick={onSettingsOpen}
        className="group p-2.5 bg-[#0a0a15]/90 hover:bg-[#15152a] backdrop-blur-sm rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
        title="Settings"
      >
        <Settings className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
      </button>
    </div>
  );
}
