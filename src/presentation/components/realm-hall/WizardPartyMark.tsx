import { WIZARD_PARTY_MARK as MARK } from '@/presentation/config/wizard-party-mark.config';

/**
 * The Wizard Party mark (geometry in wizard-party-mark.config.ts), in one brass line weight so it
 * reads at 24px and at 96px. Its colours follow the realm: the amber scale is remapped per theme.
 */
export function WizardPartyMark({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox={MARK.VIEW_BOX} className={className} role="img" aria-label="Wizard Party">
      <defs>
        <linearGradient id="wp-mark-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-amber-200)" />
          <stop offset="0.55" stopColor="var(--color-amber-400)" />
          <stop offset="1" stopColor="var(--color-amber-600)" />
        </linearGradient>
      </defs>
      <g transform={MARK.CARD.transform}>
        <rect x={MARK.CARD.x} y={MARK.CARD.y} width={MARK.CARD.width} height={MARK.CARD.height} rx={MARK.CARD.rx} fill="color-mix(in srgb, var(--color-amber-950) 70%, transparent)" stroke="url(#wp-mark-brass)" strokeWidth={MARK.STROKE} />
        <path d={MARK.CARD_PIP} fill="url(#wp-mark-brass)" />
      </g>
      <path d={MARK.HAT} fill="var(--color-amber-950)" stroke="url(#wp-mark-brass)" strokeWidth={MARK.STROKE} strokeLinejoin="round" />
      <path d={MARK.BAND} fill="none" stroke="url(#wp-mark-brass)" strokeWidth={MARK.BAND_STROKE} strokeLinecap="round" />
      <path d={MARK.BRIM} fill="var(--color-amber-950)" stroke="url(#wp-mark-brass)" strokeWidth={MARK.STROKE} strokeLinejoin="round" />
      <path d={MARK.STAR} fill="var(--color-amber-300)" />
    </svg>
  );
}
