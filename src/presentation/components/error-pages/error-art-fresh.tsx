import styles from './error-page.module.css';

/** Inline SVG illustrations for the error pages (viewBox 0 0 160 160). */

/** Winter: a snowman scratching his hat with a twig arm. */
export function PuzzledSnowman() {
  return (
    <g>
      <ellipse cx="80" cy="148" rx="56" ry="8" fill="#e2e8f0" opacity="0.35" />
      <g className={styles.bob}>
        <circle cx="80" cy="118" r="30" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="80" cy="72" r="22" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="80" cy="110" r="3" fill="#334155" />
        <circle cx="80" cy="124" r="3" fill="#334155" />
        <path d="M58 88 Q80 98 102 88 L102 94 Q80 104 58 94 Z" fill="#dc2626" />
        <path d="M94 94 L100 112 L92 112 Z" fill="#b91c1c" />
        <circle cx="73" cy="68" r="2.8" fill="#1e293b" />
        <circle cx="88" cy="66" r="2.8" fill="#1e293b" />
        <path d="M80 74 L96 78 L80 79 Z" fill="#f97316" />
        <path d="M72 82 Q78 80 86 83" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="64" y="38" width="32" height="20" rx="2" fill="#1e293b" />
        <rect x="58" y="54" width="44" height="6" rx="2" fill="#1e293b" />
        {/* Left arm reaches up to scratch the hat, right arm hangs out */}
        <path d="M60 108 L36 80 M44 90 L36 92 M38 82 L42 70" stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M108 112 L136 104 M128 106 L134 96" stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <text x="118" y="44" fontSize="28" fill="#bae6fd" className={`font-serif ${styles.pulse}`}>?</text>
    </g>
  );
}

const PETAL_ANGLES = [0, 72, 144, 216, 288];

/** Spring: a drooping flower in a pot with a fallen petal. */
export function WiltedFlower() {
  return (
    <g>
      <path d="M50 120 L110 120 L102 150 L58 150 Z" fill="#c2410c" />
      <rect x="46" y="114" width="68" height="10" rx="3" fill="#ea580c" />
      <path d="M80 116 C80 80 96 60 116 72" stroke="#4d7c0f" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M82 98 C70 92 62 96 60 104 C70 106 78 104 82 98 Z" fill="#65a30d" />
      <g transform="translate(118 88)">
        <g className={styles.sway}>
          {PETAL_ANGLES.map((angle) => (
            <ellipse key={angle} cx="0" cy="-13" rx="8" ry="13" fill="#f9a8d4" stroke="#db2777" strokeWidth="1.5" transform={`rotate(${angle})`} />
          ))}
          <circle r="8" fill="#fde047" />
          <circle cx="-3" cy="0" r="1.5" fill="#1c1004" />
          <circle cx="3" cy="0" r="1.5" fill="#1c1004" />
          <path d="M-3 5 Q0 3 3 5" stroke="#1c1004" strokeWidth="1.2" fill="none" />
        </g>
      </g>
      <ellipse cx="132" cy="146" rx="7" ry="3.5" fill="#f9a8d4" transform="rotate(-20 132 146)" />
    </g>
  );
}

/** Summer: an ice cream cone whose scoop is melting into a puddle. */
export function MeltedIceCream() {
  return (
    <g>
      <circle cx="132" cy="28" r="14" fill="#fbbf24" className={styles.pulse} />
      <path d="M26 140 C26 128 60 124 84 126 C112 128 136 132 134 142 C132 152 30 152 26 140 Z" fill="#f9a8d4" stroke="#ec4899" strokeWidth="2" />
      <circle cx="52" cy="138" r="3" fill="#fef9c3" />
      <circle cx="110" cy="140" r="2.5" fill="#86efac" />
      <g className={styles.bob}>
        <path d="M56 70 L104 70 L80 128 Z" fill="#d6a15a" stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
        <path d="M64 80 L94 108 M76 72 L100 94 M96 80 L70 108 M86 72 L62 94" stroke="#92400e" strokeWidth="1.5" opacity="0.6" />
        <path d="M54 72 C54 52 106 52 106 72 C106 80 100 78 98 88 C96 96 92 90 92 80 C90 76 84 78 82 92 C80 100 76 98 76 86 C74 78 68 76 66 84 C64 90 58 90 58 80 C56 76 54 76 54 72 Z" fill="#f9a8d4" stroke="#ec4899" strokeWidth="2" />
        <circle cx="70" cy="64" r="2.5" fill="#1c1004" />
        <circle cx="90" cy="64" r="2.5" fill="#1c1004" />
        <path d="M74 72 Q80 68 86 72" stroke="#1c1004" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}
