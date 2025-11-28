'use client';

import { Plus } from 'lucide-react';

interface AddBotButtonProps {
  onAddBot: () => void;
}

export function AddBotButton({ onAddBot }: AddBotButtonProps) {
  return (
    <button
      onClick={() => {
        console.log('[LobbyUI] Add Bot button clicked');
        onAddBot();
      }}
      className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors w-full cursor-pointer"
    >
      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
        <Plus className="w-4 h-4 text-cyan-400" />
      </div>
      <span className="text-cyan-400 text-sm font-medium">Add Bot Player</span>
    </button>
  );
}
