'use client';

import { useEffect, useState } from 'react';
import { CONSTANTS } from '@/presentation/config/constants';
import { LoadingOverlay } from './LoadingOverlay';

const { FADE_MS, MAX_WAIT_MS } = CONSTANTS.TABLE_LOADING;

interface TableLoadingOverlayProps {
  /** The game view is up and its 3D table has drawn (or cannot draw at all) */
  ready: boolean;
}

/**
 * The game page's single loader: stays mounted while the game state and then the 3D table load,
 * fades out once the table is drawn and comes back if the table has to load again. Sits below
 * the modal overlays (connection, pause, leave) so they stay reachable, and gives up after
 * MAX_WAIT_MS so a stalled asset never hides the game.
 */
export function TableLoadingOverlay({ ready }: TableLoadingOverlayProps) {
  const [timedOut, setTimedOut] = useState(false);
  const [faded, setFaded] = useState(false);
  // A new wait (the table remounted) gets its own time limit
  if (ready && timedOut) setTimedOut(false);
  const hidden = ready || timedOut;
  if (!hidden && faded) setFaded(false);

  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  // Unmount once faded out: the loader's CSS animations would keep running under the table
  useEffect(() => {
    if (!hidden) return undefined;
    const timer = setTimeout(() => setFaded(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [hidden]);

  if (faded) return null;

  return (
    <div
      role="status"
      aria-label="Preparing the table"
      aria-hidden={hidden}
      className={`fixed inset-0 z-[45] transition-opacity motion-reduce:transition-none ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <LoadingOverlay />
    </div>
  );
}
