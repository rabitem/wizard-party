'use client';

import type { ReactNode } from 'react';
import { Plug, Swords } from 'lucide-react';

import { Panel } from '../account/ui';

/** Skeleton blocks while a tournament page loads. */
export function TournamentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-24 rounded-2xl bg-amber-900/10 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

/** Centered message with an icon and an optional action (empty, not found, errors). */
export function TournamentMessage({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Panel>
      <div className="px-5 py-10 sm:py-12 text-center">
        <div className="mx-auto mb-3 flex justify-center text-amber-600/50">{icon ?? <Swords className="w-10 h-10" strokeWidth={1.25} />}</div>
        <p className="text-amber-100/90 text-base font-serif">
          {title}
        </p>
        {children ? <div className="mt-1.5 text-sm text-amber-200/50 leading-relaxed max-w-md mx-auto">{children}</div> : null}
        {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </Panel>
  );
}

/** The deployment has no tournament backend configured (capability off / 503). */
export function TournamentsUnavailable() {
  return (
    <TournamentMessage icon={<Plug className="w-10 h-10" strokeWidth={1.25} />} title="Tournaments are resting">
      Tournaments are not available on this server right now. Casual games work as usual — check back soon.
    </TournamentMessage>
  );
}
