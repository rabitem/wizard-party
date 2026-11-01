'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HALL_LOADER } from '@/presentation/config/realm-hall.config';
import { useSeasonalPack } from '@/presentation/components/settings/useSeasonalPack';
import { REALM_OPTIONS } from '../room-browser/realm-switcher.config';
import { useHallLoading } from './hall-loading-store';


/**
 * Three cards that riffle over one another while the room loads. A CSS animation (.hall-shuffle-card
 * in globals.css), so they keep moving while the next room's build blocks the main thread; fanned
 * and still with reduced motion.
 */
function ShufflingCards() {
  return (
    <span className="relative w-11 h-12 shrink-0" aria-hidden>
      {[-1, 0, 1].map((offset) => (
        <span
          key={offset}
          className="hall-shuffle-card absolute left-2.5 top-1 w-6 h-9 rounded-[5px] border border-amber-300/70 bg-[linear-gradient(160deg,var(--color-amber-700),var(--color-amber-950))] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
          style={{
            zIndex: offset === 0 ? 2 : 1,
            transform: `translateX(${offset * 6}px) rotate(${offset * 12}deg)`,
            ['--shuffle-x' as string]: `${offset * 6}px`,
            ['--shuffle-r' as string]: `${offset * 12}deg`,
            ['--shuffle-lift' as string]: offset === 0 ? '-5px' : '0px',
            ['--shuffle-delay' as string]: `${(offset + 1) * 0.12}s`,
          }}
        />
      ))}
    </span>
  );
}

/** A line from HALL_LOADER.LINES, moving on every few seconds; starts at a random line each time. */
function useRotatingLine(active: boolean): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    queueMicrotask(() => setIndex(Math.floor(Math.random() * HALL_LOADER.LINES.length)));
    const timer = setInterval(() => setIndex((current) => (current + 1) % HALL_LOADER.LINES.length), HALL_LOADER.LINE_MS);
    return () => clearInterval(timer);
  }, [active]);
  return HALL_LOADER.LINES[index];
}

/**
 * Whether the loader shows: while the room loads (after a short delay, so a fast load never
 * flashes) and through every realm switch from the lenses (switchRealm), which raises it first.
 */
function useLoaderVisible(): boolean {
  const { status, busy, switching } = useHallLoading();
  const [delayed, setDelayed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  const waiting = status === 'loading' || busy;
  useEffect(() => {
    if (!waiting) {
      queueMicrotask(() => setDelayed(false));
      return;
    }
    const timer = setTimeout(() => setDelayed(true), HALL_LOADER.SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  // Each new wait gets the full allowance; a stalled one stops covering the page after MAX_VISIBLE_MS.
  const wanted = switching || waiting;
  useEffect(() => {
    queueMicrotask(() => setGaveUp(false));
    if (!wanted) return;
    const timer = setTimeout(() => setGaveUp(true), HALL_LOADER.MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [wanted, switching]);

  if (status === 'unavailable' || gaveUp) return false;
  return switching || (waiting && delayed);
}

/**
 * The start page's loading moment: shuffling cards, which realm is being set up and a rotating
 * line, in the gap where the table appears (bottom of the screen on phones). Purely decorative
 * for pointers; screen readers hear one polite status, not every line.
 */
export function HallLoader() {
  const visible = useLoaderVisible();
  const line = useRotatingLine(visible);
  const { target } = useHallLoading();
  const { settings, isPackActive } = useSeasonalPack();
  const active = settings ? REALM_OPTIONS.find((option) => isPackActive(option.pack))?.pack.name : undefined;
  const realmName = target ?? active ?? 'realm';

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 top-[4.25rem] md:top-[44%]">
      <span className="sr-only">{visible ? `Setting up the ${realmName} room` : ''}</span>
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="hall-loader"
            // No JS fade-in: the next room's build blocks the main thread and would freeze it half-faded
            initial={false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            aria-hidden
            className="flex items-center gap-3 max-w-md pl-3 pr-5 py-2.5 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
          >
            <ShufflingCards />
            <span className="min-w-0">
              <span className="block text-sm text-amber-100 font-serif">
                Setting up the {realmName} room
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={line}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="block text-xs text-amber-200/75 italic font-serif"
                >
                  {line}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
