'use client';

import { Shuffle, ArrowUpDown } from 'lucide-react';

interface HandControlsProps {
  onShuffle: () => void;
  onSort: () => void;
}

export function HandControls({ onShuffle, onSort }: HandControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onShuffle}
        className="group p-2.5 bg-[#0a0a15]/90 hover:bg-[#15152a] backdrop-blur-sm rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
        title="Shuffle hand"
      >
        <Shuffle className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
      </button>
      <button
        onClick={onSort}
        className="group p-2.5 bg-[#0a0a15]/90 hover:bg-[#15152a] backdrop-blur-sm rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
        title="Sort hand"
      >
        <ArrowUpDown className="w-5 h-5 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
      </button>
    </div>
  );
}
