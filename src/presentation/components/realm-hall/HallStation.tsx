import type { ReactNode } from 'react';
import { HALL_STATION_ATTRIBUTE } from './hall-progress-store';

export type StationSide = 'left' | 'right' | 'center';

interface HallStationProps {
  /** Where the readable column sits; the station's prop fills the other half of the view. */
  side: StationSide;
  label: string;
  children: ReactNode;
  className?: string;
  columnClassName?: string;
}

const JUSTIFY: Record<StationSide, string> = {
  left: 'md:justify-start',
  right: 'md:justify-end',
  center: 'md:justify-center',
};

/**
 * Darkens the side of the view the text sits on, so it reads against any realm's hall without
 * a box around it. Phones get the column full width over an even shade.
 */
const SHADE: Record<StationSide, string> = {
  left: 'md:bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.5)_42%,transparent_70%)]',
  right: 'md:bg-[linear-gradient(270deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.5)_42%,transparent_70%)]',
  center: 'md:bg-[radial-gradient(ellipse_60%_70%_at_50%_60%,rgba(0,0,0,0.6)_0%,transparent_75%)]',
};

/**
 * One stop of the walk through the realm hall: a viewport-tall section whose centre crossing the
 * middle of the screen brings the camera to the matching stop (REALM_HALL.STOPS, same order).
 */
export function HallStation({ side, label, children, className = '', columnClassName = '' }: HallStationProps) {
  const stationProps = { [HALL_STATION_ATTRIBUTE]: '' };
  return (
    <section
      {...stationProps}
      aria-label={label}
      className={`relative z-10 min-h-[100svh] flex items-center justify-center px-4 sm:px-8 lg:px-16 py-20 bg-black/55 ${SHADE[side]} md:bg-transparent ${JUSTIFY[side]} ${className}`}
    >
      <div className={`w-full max-w-xl ${columnClassName}`}>{children}</div>
    </section>
  );
}
