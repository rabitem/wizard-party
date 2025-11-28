'use client';

import { User } from 'lucide-react';

export function EmptyPlayerSlot() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-amber-500/20">
      <div className="w-9 h-9 rounded-xl bg-[#0a0a15] border border-amber-500/10 flex items-center justify-center">
        <User className="w-4 h-4 text-amber-400/30" />
      </div>
      <span className="text-amber-200/40 text-sm">Waiting for player...</span>
    </div>
  );
}
