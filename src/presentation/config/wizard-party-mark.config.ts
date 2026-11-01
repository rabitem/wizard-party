/**
 * Geometry of the Wizard Party mark (64 × 64 view box): the wizard's hat with its star, set on a
 * playing card tilted behind it. WizardPartyMark draws it in the realm's colours; the favicon and
 * the app icon (src/app/icon.tsx, apple-icon.tsx) draw it in the Classic brass below.
 */
export const WIZARD_PARTY_MARK = {
  VIEW_BOX: '0 0 64 64',
  CARD: { x: 17, y: 12, width: 30, height: 42, rx: 4, transform: 'rotate(14 32 34)' },
  CARD_PIP: 'M21.5 16.5 l1.6 3.2 l-1.6 3.2 l-1.6 -3.2 z',
  HAT: 'M32 6 C30 14 25 26 21.5 40 L42.5 40 C39 26 34.5 15 36.5 9.5 C35 10 33.5 8.5 32 6 Z',
  BAND: 'M22.6 36 C28.5 34 35.5 34 41.4 36',
  BRIM: 'M12 42.5 C20 38.5 44 38.5 52 42.5 C44 46.5 20 46.5 12 42.5 Z',
  STAR: 'M31.2 19 l1.5 3.1 3.4 .5 -2.5 2.4 .6 3.4 -3 -1.6 -3 1.6 .6 -3.4 -2.5 -2.4 3.4 -.5 z',
  STROKE: 2,
  BAND_STROKE: 2.6,
} as const;

/** The Classic realm's brass and ink, for the static icons (they cannot follow a theme). */
export const WIZARD_PARTY_MARK_CLASSIC = {
  BRASS: ['#fde68a', '#fbbf24', '#d97706'] as const,
  STAR: '#fcd34d',
  INK: '#1c1208',
  CARD: '#2a1b0c',
  BACKGROUND: '#0d0a07',
  GLOW: 'rgba(212, 168, 83, 0.35)',
} as const;
