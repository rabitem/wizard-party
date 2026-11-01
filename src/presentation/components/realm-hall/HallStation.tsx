import type { ReactNode } from 'react';
import { HALL_STATION_ATTRIBUTE } from './hall-progress-store';

export type StationSide = 'left' | 'right' | 'center';

interface HallStationProps {
  /** Where the readable column sits; the room's lit feature fills the other half of the view. */
  side: StationSide;
  label: string;
  children: ReactNode;
  /**
   * Sets the column on the realm's opaque surface with a brass hairline, so the room never shows
   * through the text. The door and the table stations sit straight on the room instead.
   */
  panel?: boolean;
  /** A dark fade along the top edge, so props a realm's room puts there never end in a hard cut. */
  topFade?: boolean;
  className?: string;
  columnClassName?: string;
}

const JUSTIFY: Record<StationSide, string> = {
  left: 'md:justify-start',
  right: 'md:justify-end',
  center: 'md:justify-center',
};

const PANEL_CLASS =
  'rounded-3xl border border-amber-600/35 bg-[var(--page-base)] shadow-[0_18px_50px_rgba(0,0,0,0.5)] p-5 sm:p-7';

/**
 * One stop of the walk through the realm's room: a viewport-tall section whose centre crossing the
 * middle of the screen brings the camera to the matching stop (REALM_HALL.STOPS, same order).
 */
export function HallStation({ side, label, children, panel = true, topFade = false, className = '', columnClassName = '' }: HallStationProps) {
  const stationProps = { [HALL_STATION_ATTRIBUTE]: '' };
  return (
    <section
      {...stationProps}
      aria-label={label}
      className={`relative z-10 min-h-[100svh] flex items-center justify-center px-4 sm:px-8 lg:px-16 py-20 ${JUSTIFY[side]} ${className}`}
    >
      {topFade ? <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[24svh] -z-10 bg-[linear-gradient(180deg,var(--page-base)_0%,color-mix(in_srgb,var(--page-base)_70%,transparent)_45%,transparent_100%)]" /> : null}
      <div className={`w-full max-w-xl ${panel ? PANEL_CLASS : ''} ${columnClassName}`}>{children}</div>
    </section>
  );
}
