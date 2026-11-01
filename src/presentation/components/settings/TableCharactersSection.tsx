'use client';

import { UsersRound } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { MedievalToggle } from './MedievalToggle';

interface TableCharactersSectionProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/** Whether opponents' characters stand at their seats on the 3D table. */
export function TableCharactersSection({ enabled, onChange }: TableCharactersSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <UsersRound className="w-4 h-4 text-amber-500/60" />
        <span className="text-xs text-amber-400/70 uppercase tracking-widest font-serif">Characters</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>

      <div className="flex items-center justify-between gap-3 p-3 border border-amber-800/30" style={{ background: THEME_SURFACE.CARD_BG }}>
        <div>
          <span className="text-amber-200/80 text-sm font-serif">Characters at the table</span>
          <p className="text-xs text-amber-500/50 font-serif">Opponents stand at their seats and react to the game</p>
        </div>
        <MedievalToggle enabled={enabled} onClick={() => onChange(!enabled)} label="Characters at the table" />
      </div>
    </section>
  );
}
