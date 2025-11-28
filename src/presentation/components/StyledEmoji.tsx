'use client';

// Styled emoji component matching the 3D player card style
export function StyledEmoji({
  emoji,
  size = 'md',
  selected = false,
  onClick,
  className = '',
}: {
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const sizes = {
    sm: { container: 'w-8 h-8', emoji: 'text-lg' },
    md: { container: 'w-10 h-10', emoji: 'text-xl' },
    lg: { container: 'w-12 h-12', emoji: 'text-2xl' },
  };

  const { container, emoji: emojiSize } = sizes[size];

  return (
    <div
      className={`
        ${container} rounded-full flex items-center justify-center
        bg-[#15152a] border-2 transition-all
        ${selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-amber-500/20'}
        ${onClick ? 'hover:border-amber-500/50 hover:bg-[#1a1a2f] cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <span className={emojiSize}>{emoji}</span>
    </div>
  );
}
