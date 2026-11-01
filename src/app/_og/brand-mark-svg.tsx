import { WIZARD_PARTY_MARK as MARK, WIZARD_PARTY_MARK_CLASSIC as CLASSIC } from '@/presentation/config/wizard-party-mark.config';

/**
 * The Wizard Party mark in Classic brass, for next/og image routes (the favicon and the app icon),
 * which render outside any theme. The start page draws the same geometry in the realm's colours.
 */
export function BrandMarkSvg({ size }: { size: number }) {
  return (
    <svg viewBox={MARK.VIEW_BOX} width={size} height={size}>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={CLASSIC.BRASS[0]} />
          <stop offset="0.55" stopColor={CLASSIC.BRASS[1]} />
          <stop offset="1" stopColor={CLASSIC.BRASS[2]} />
        </linearGradient>
      </defs>
      <g transform={MARK.CARD.transform}>
        <rect x={MARK.CARD.x} y={MARK.CARD.y} width={MARK.CARD.width} height={MARK.CARD.height} rx={MARK.CARD.rx} fill={CLASSIC.CARD} stroke="url(#brass)" strokeWidth={MARK.STROKE} />
        <path d={MARK.CARD_PIP} fill="url(#brass)" />
      </g>
      <path d={MARK.HAT} fill={CLASSIC.INK} stroke="url(#brass)" strokeWidth={MARK.STROKE} strokeLinejoin="round" />
      <path d={MARK.BAND} fill="none" stroke="url(#brass)" strokeWidth={MARK.BAND_STROKE} strokeLinecap="round" />
      <path d={MARK.BRIM} fill={CLASSIC.INK} stroke="url(#brass)" strokeWidth={MARK.STROKE} strokeLinejoin="round" />
      <path d={MARK.STAR} fill={CLASSIC.STAR} />
    </svg>
  );
}
