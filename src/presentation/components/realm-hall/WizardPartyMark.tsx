/**
 * The Wizard Party mark: the wizard's hat from the app icon, with its star, set on a playing
 * card tilted behind it. Drawn in one brass line weight so it reads at 24px and at 96px; the
 * colours follow the realm (the amber scale and --glow are remapped per theme).
 */
export function WizardPartyMark({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Wizard Party">
      <defs>
        <linearGradient id="wp-mark-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-amber-200)" />
          <stop offset="0.55" stopColor="var(--color-amber-400)" />
          <stop offset="1" stopColor="var(--color-amber-600)" />
        </linearGradient>
      </defs>
      {/* The card, tilted, with a corner pip */}
      <g transform="rotate(14 32 34)">
        <rect x="17" y="12" width="30" height="42" rx="4" fill="color-mix(in srgb, var(--color-amber-950) 70%, transparent)" stroke="url(#wp-mark-brass)" strokeWidth="2" />
        <path d="M21.5 16.5 l1.6 3.2 l-1.6 3.2 l-1.6 -3.2 z" fill="url(#wp-mark-brass)" />
      </g>
      {/* The hat: crown, brim and band */}
      <path d="M32 6 C30 14 25 26 21.5 40 L42.5 40 C39 26 34.5 15 36.5 9.5 C35 10 33.5 8.5 32 6 Z" fill="var(--color-amber-950)" stroke="url(#wp-mark-brass)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22.6 36 C28.5 34 35.5 34 41.4 36" fill="none" stroke="url(#wp-mark-brass)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12 42.5 C20 38.5 44 38.5 52 42.5 C44 46.5 20 46.5 12 42.5 Z" fill="var(--color-amber-950)" stroke="url(#wp-mark-brass)" strokeWidth="2" strokeLinejoin="round" />
      {/* The star on the hat */}
      <path d="M31.2 19 l1.5 3.1 3.4 .5 -2.5 2.4 .6 3.4 -3 -1.6 -3 1.6 .6 -3.4 -2.5 -2.4 3.4 -.5 z" fill="var(--color-amber-300)" />
    </svg>
  );
}
