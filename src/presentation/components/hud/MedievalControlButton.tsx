'use client';

import { HudButtonDecor, HudIcon, useHudClassName, type HudIconId } from './skins';

interface MedievalControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  /** Lets the active HUD skin replace `icon`. */
  iconId?: HudIconId;
  label: string;
}

/**
 * Medieval-styled control button with decorative corners
 */
export function MedievalControlButton({
  onClick,
  disabled,
  icon: Icon,
  iconId,
  label,
}: MedievalControlButtonProps) {
  const skinClass = useHudClassName('button');
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex flex-col items-center gap-2 p-4 transition-all ${
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
      <HudButtonDecor variant="tile" />
      {iconId ? (
        <HudIcon id={iconId} fallback={Icon} className="w-6 h-6 text-amber-400" />
      ) : (
        <Icon className="w-6 h-6 text-amber-400 relative" />
      )}
      <span className="text-xs text-amber-200 relative font-serif">
        {label}
      </span>
    </button>
  );
}
