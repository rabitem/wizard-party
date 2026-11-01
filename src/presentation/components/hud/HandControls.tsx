'use client';

import { ReactNode, useCallback } from 'react';
import { Shuffle, ArrowUpDown } from 'lucide-react';
import { useClickLock } from '../ui';
import { HudButtonDecor, HudIcon, useHudClassName } from './skins';

function MedievalButton({
  onClick,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const skinClass = useHudClassName('button');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group relative w-12 h-12 flex items-center justify-center transition-all ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'
      } text-amber-500/70 hover:text-amber-300 ${skinClass}`}
      style={{
        background: 'var(--surface)',
      }}
    >
      {/* Border frame */}
      <div className="absolute inset-0 rounded border-2 border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
      {/* Inner shadow */}
      <div className="absolute inset-[2px] rounded bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
      {/* Corner accents */}
      <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
      <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
      <HudButtonDecor />
      {/* Content */}
      <div className="relative flex items-center justify-center">{children}</div>
    </button>
  );
}

interface HandControlsProps {
  onShuffle: () => void;
  onSort: () => void;
  isAnimating?: boolean;
}

export function HandControls({ onShuffle, onSort, isAnimating = false }: HandControlsProps) {
  const tryClick = useClickLock(600);

  const handleShuffle = useCallback(() => {
    tryClick(onShuffle);
  }, [onShuffle, tryClick]);

  const handleSort = useCallback(() => {
    tryClick(onSort);
  }, [onSort, tryClick]);

  return (
    <div className="flex items-center gap-2">
      <MedievalButton onClick={handleShuffle} title="Shuffle hand" disabled={isAnimating}>
        <HudIcon id="shuffle" fallback={Shuffle} className="w-5 h-5" />
      </MedievalButton>
      <MedievalButton onClick={handleSort} title="Sort hand" disabled={isAnimating}>
        <HudIcon id="sort" fallback={ArrowUpDown} className="w-5 h-5" />
      </MedievalButton>
    </div>
  );
}
