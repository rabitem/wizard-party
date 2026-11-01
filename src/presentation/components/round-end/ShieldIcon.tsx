// Shield SVG for rankings - extracted to avoid creating during render
export function ShieldIcon({ place, color, size = 40 }: { place: number; color: string; size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none">
      <path
        d="M20 2L4 8V22C4 32 12 40 20 44C28 40 36 32 36 22V8L20 2Z"
        fill={`url(#shield-gradient-${place})`}
        stroke={color}
        strokeWidth="2"
      />
      <defs>
        <linearGradient id={`shield-gradient-${place}`} x1="20" y1="2" x2="20" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0.4" />
          <stop offset="1" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <text
        x="20"
        y="28"
        textAnchor="middle"
        fill={color}
        fontSize="16"
        fontWeight="bold"
        fontFamily="serif"
      >
        {place}
      </text>
    </svg>
  );
}
