'use client';

/**
 * Position badge component that displays the player's ranking position
 */
export function PositionBadge({
  position,
  size = 'md',
  scale = 1,
}: {
  position: number;
  size?: 'sm' | 'md';
  scale?: number;
}) {
  const getBadgeStyle = () => {
    if (position === 1) {
      return { bg: 'linear-gradient(180deg, #f0c674 0%, #b8860b 100%)', color: '#1a1510', border: 'var(--accent-pale)' };
    }
    if (position === 2) {
      return { bg: 'linear-gradient(180deg, #c0c0c0 0%, #808080 100%)', color: '#1a1510', border: '#c0c0c0' };
    }
    if (position === 3) {
      return { bg: 'linear-gradient(180deg, #cd7f32 0%, #8b4513 100%)', color: '#1a1510', border: '#cd7f32' };
    }
    return { bg: '#252015', color: 'var(--text-muted)', border: 'var(--surface-border)' };
  };

  const style = getBadgeStyle();
  // Base sizes: sm = 20px/11px, md = 28px/14px
  const baseSize = size === 'sm' ? 20 : 28;
  const baseFontSize = size === 'sm' ? 11 : 14;
  const scaledSize = Math.round(baseSize * scale);
  const scaledFontSize = Math.round(baseFontSize * scale);

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: scaledSize,
        height: scaledSize,
        fontSize: scaledFontSize,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {position}
    </div>
  );
}
