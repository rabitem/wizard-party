'use client';

import { MoreHorizontal } from 'lucide-react';
import { HudButtonDecor, HudIcon, useHudClassName } from './skins';

interface ControlsFABProps {
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * Game controls button of the phone HUD; rendered into the HUD controls region.
 */
export function ControlsFAB({ disabled, onToggle }: ControlsFABProps) {
  const skinClass = useHudClassName('button');
  return (
    <button
      onClick={() => !disabled && onToggle()}
      className={`group relative w-12 h-12 flex items-center justify-center transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
      } ${skinClass}`}
      style={{
        background: 'var(--surface)',
      }}
    >
      {/* Border frame */}
      <div className="absolute inset-0 border-2 border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
      {/* Inner shadow */}
      <div className="absolute inset-[2px] bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
      {/* Corner accents */}
      <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
      <HudButtonDecor variant="fab" />
      <HudIcon id="menu" fallback={MoreHorizontal} className="w-6 h-6 text-amber-400" />
    </button>
  );
}
