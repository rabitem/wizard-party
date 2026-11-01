'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

// Styled icon component matching the medieval card style
// Uses RPG-Awesome icons instead of native emojis
export function StyledEmoji({
  icon,
  size = 'md',
  selected = false,
  onClick,
  className = '',
}: {
  icon: string; // RPG-Awesome icon class (e.g., 'ra-crown')
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const sizes = {
    sm: { container: 'w-8 h-8', icon: 'text-lg' },
    md: { container: 'w-10 h-10', icon: 'text-xl' },
    lg: { container: 'w-12 h-12', icon: 'text-2xl' },
  };

  const { container, icon: iconSize } = sizes[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
      }
    : {};

  return (
    <div
      className={`
        ${container} rounded-lg flex items-center justify-center
        border-2 transition-all
        ${selected
          ? 'border-amber-500 shadow-lg shadow-amber-500/30'
          : 'border-amber-700/40 hover:border-amber-600/50'
        }
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      style={{
        background: selected
          ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)'
          : THEME_SURFACE.MODAL_BG,
      }}
      {...interactiveProps}
    >
      <i className={`ra ${icon} ${iconSize} leading-none ${selected ? 'text-amber-300' : 'text-amber-500/80'}`} />
    </div>
  );
}
