import styles from './error-page.module.css';

/**
 * Inline SVG illustrations for the error pages (viewBox 0 0 160 160).
 * Fixed art colours are intentional: they read on every theme surface.
 */

/** Halloween: a jack-o-lantern with mismatched eyes and a question mark. */
export function ConfusedPumpkin() {
  return (
    <g>
      <text x="112" y="44" fontSize="34" fill="#fbbf24" className={`font-serif ${styles.pulse}`}>?</text>
      <g className={styles.bob}>
        <path d="M80 44 C78 34 82 26 90 22" stroke="#4d7c0f" strokeWidth="6" strokeLinecap="round" fill="none" />
        <ellipse cx="56" cy="92" rx="30" ry="40" fill="#c2410c" />
        <ellipse cx="104" cy="92" rx="30" ry="40" fill="#c2410c" />
        <ellipse cx="80" cy="92" rx="30" ry="44" fill="#f97316" />
        <path d="M80 50 V136" stroke="#ea580c" strokeWidth="2" opacity="0.6" />
        {/* Mismatched eyes: one wide, one squinting */}
        <path d="M58 80 L72 80 L65 66 Z" fill="#1c1004" />
        <path d="M90 78 L104 74 L98 70 Z" fill="#1c1004" />
        {/* Wobbly, unsure mouth */}
        <path d="M58 108 Q66 100 72 108 T86 108 T100 104" stroke="#1c1004" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

const MAPLE_LEAF =
  'M0,-42 L8,-24 L20,-30 L16,-10 L34,-16 L28,-2 L40,4 L22,14 L26,26 L8,20 L4,38 L-4,38 L-8,20 L-26,26 L-22,14 L-40,4 L-28,-2 L-34,-16 L-16,-10 L-20,-30 L-8,-24 Z';

/** Autumn: a little maple leaf drifting along a dashed trail, looking around. */
export function LostLeaf() {
  return (
    <g>
      <path d="M14 132 C40 150 60 110 46 100 S70 70 90 90" stroke="#d97706" strokeWidth="2" strokeDasharray="4 6" fill="none" opacity="0.6" />
      <circle cx="30" cy="140" r="3" fill="#b45309" opacity="0.6" />
      <g transform="translate(98 70)">
        <g className={styles.sway}>
          <path d={MAPLE_LEAF} fill="#ea580c" stroke="#9a3412" strokeWidth="2" strokeLinejoin="round" />
          <path d="M0,22 V52" stroke="#9a3412" strokeWidth="3" strokeLinecap="round" />
          <circle cx="-10" cy="0" r="3.5" fill="#1c1004" />
          <circle cx="10" cy="0" r="3.5" fill="#1c1004" />
          <ellipse cx="0" cy="12" rx="4" ry="5" fill="#1c1004" />
        </g>
      </g>
      <text x="128" y="30" fontSize="26" fill="#fbbf24" className={`font-serif ${styles.pulse}`}>?</text>
    </g>
  );
}

/** Non-seasonal themes: the classic wizard with a starry hat and a glowing staff. */
export function ClassicWizard() {
  return (
    <g>
      <circle cx="128" cy="40" r="18" fill="var(--glow)" className={styles.pulse} />
      <line x1="128" y1="44" x2="124" y2="148" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
      <circle cx="128" cy="40" r="8" fill="#fde68a" />
      <g className={styles.bob}>
        <path d="M72 14 L104 78 L40 78 Z" fill="#4c1d95" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
        <path d="M68 40 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1 Z" fill="#fbbf24" />
        <circle cx="84" cy="62" r="2.5" fill="#fde68a" />
        <circle cx="62" cy="66" r="2" fill="#fde68a" />
        <ellipse cx="72" cy="80" rx="44" ry="8" fill="#5b21b6" stroke="#7c3aed" strokeWidth="2" />
        <rect x="52" y="86" width="40" height="18" rx="8" fill="#f5d0a9" />
        <circle cx="64" cy="95" r="3" fill="#1c1004" />
        <circle cx="80" cy="95" r="3" fill="#1c1004" />
        <path d="M46 102 Q72 160 98 102 Q90 112 72 110 Q54 112 46 102 Z" fill="#e7e5e4" stroke="#a8a29e" strokeWidth="2" />
        <path d="M62 108 Q72 104 82 108" stroke="#a8a29e" strokeWidth="2" fill="none" />
      </g>
    </g>
  );
}
