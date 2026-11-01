import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';

interface GlyphProps {
  theme: ThemePreference;
  primary: string;
  secondary: string;
}

/** Halloween: little jack-o'-lantern. */
function Pumpkin({ primary, secondary }: Omit<GlyphProps, 'theme'>) {
  return (
    <g>
      <path d="M12 5c0-2 1-3 2-3" stroke={secondary} strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="14" rx="9" ry="7" fill={primary} />
      <path d="M12 7v14M7.5 8.5c-2 3-2 8 0 11M16.5 8.5c2 3 2 8 0 11" stroke="rgba(0,0,0,0.25)" fill="none" />
      <path d="M8 12l2 1.5L8 14zM16 12l-2 1.5 2 .5zM8.5 17c2 1.2 5 1.2 7 0l-1 1.5-1.5-.8-1 .8-1-.8-1.5.8z" fill="#2a1200" />
    </g>
  );
}

/** Autumn: maple leaf. */
function MapleLeaf({ primary, secondary }: Omit<GlyphProps, 'theme'>) {
  return (
    <g>
      <path d="M12 2l2 5 4-2-1 5 5 1-4 4 2 3h-5l-1 5h-4l-1-5H4l2-3-4-4 5-1-1-5 4 2z" fill={primary} />
      <path d="M12 7v16" stroke={secondary} strokeWidth="1" />
    </g>
  );
}

/** Winter: six-armed snowflake. */
function Snowflake({ primary }: Omit<GlyphProps, 'theme'>) {
  const arms = [0, 60, 120];
  return (
    <g stroke={primary} strokeWidth="1.4" strokeLinecap="round" fill="none">
      {arms.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 12 12)`}>
          <path d="M12 2v20M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
        </g>
      ))}
    </g>
  );
}

/** Spring: five-petal blossom. */
function Blossom({ primary, secondary }: Omit<GlyphProps, 'theme'>) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g>
      {petals.map((deg) => (
        <ellipse key={deg} cx="12" cy="6.5" rx="3.6" ry="5" fill={primary} transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill={secondary} />
    </g>
  );
}

/** Summer: sun with rays. */
function Sun({ primary, secondary }: Omit<GlyphProps, 'theme'>) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g>
      {rays.map((deg) => (
        <path key={deg} d="M12 1.5v3.5" stroke={primary} strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="5.5" fill={primary} stroke={secondary} strokeWidth="1" />
    </g>
  );
}

/** Non-seasonal themes: four-point star in the theme's accent. */
function Star({ primary }: Omit<GlyphProps, 'theme'>) {
  return <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill={primary} />;
}

/** Theme-specific emblem drawn in a 24x24 box. */
export function SeasonalGlyph({ theme, primary, secondary }: GlyphProps) {
  switch (theme) {
    case 'halloween':
      return <Pumpkin primary={primary} secondary={secondary} />;
    case 'autumn':
      return <MapleLeaf primary={primary} secondary={secondary} />;
    case 'winter':
      return <Snowflake primary={primary} secondary={secondary} />;
    case 'spring':
      return <Blossom primary={primary} secondary={secondary} />;
    case 'summer':
      return <Sun primary={primary} secondary={secondary} />;
    default:
      return <Star primary={primary} secondary={secondary} />;
  }
}
