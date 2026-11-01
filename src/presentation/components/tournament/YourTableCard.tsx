'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Hourglass, Swords } from 'lucide-react';

import type { MyMatchView } from '@shared/application/use-cases/tournament';

import { GLOW_SHADOW, HEADER_HIGHLIGHT } from '../account/account-surfaces';
import { Button, Panel } from '../account/ui';
import { formatDuration } from './tournament-view-model';

interface YourTableCardProps {
  match: MyMatchView;
  now: number;
  joining: boolean;
  /** Joining waits for the player to confirm leaving the game they are playing elsewhere. */
  confirmingLeave: boolean;
  onJoin: (confirmed: boolean) => void;
  onCancel: () => void;
}

/** The viewer's pending table: the one call to action that matters while a round runs. */
export function YourTableCard({ match, now, joining, confirmingLeave, onJoin, onCancel }: YourTableCardProps) {
  const reduceMotion = useReducedMotion();
  const remaining = match.deadlineAt - now;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Panel>
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6" style={{ background: HEADER_HIGHLIGHT }}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/50 bg-amber-900/30" style={{ boxShadow: GLOW_SHADOW }} aria-hidden>
            <Swords className="h-6 w-6 text-amber-300" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-[11px] uppercase tracking-widest text-amber-400/80 font-serif">
              Your table is ready
            </p>
            <p className="mt-0.5 truncate text-lg text-amber-50 font-serif">
              {match.label}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-amber-200/55">
              <Hourglass className="h-3.5 w-3.5" aria-hidden />
              {remaining > 0 ? `Play it within ${formatDuration(remaining)}. Absent players are replaced by bots.` : 'The deadline has passed.'}
            </p>
          </div>
          {confirmingLeave ? (
            <div className="flex flex-col gap-2 sm:items-end" role="alert">
              <p className="text-xs text-amber-200/80 font-serif">
                You are in a game right now. Leave it for your table?
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCancel}>
                  Stay
                </Button>
                <Button variant="primary" onClick={() => onJoin(true)} loading={joining} icon={<Swords className="h-4 w-4" />}>
                  Leave and join
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="primary" onClick={() => onJoin(false)} loading={joining} icon={<Swords className="h-4 w-4" />} className="sm:min-w-44">
              Join your table
            </Button>
          )}
        </div>
      </Panel>
    </motion.div>
  );
}
