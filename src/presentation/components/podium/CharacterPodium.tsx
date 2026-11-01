'use client';

import { useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';

import { PODIUM } from '@/presentation/config/podium.config';
import type { PodiumContender, PodiumStand } from '@/presentation/types/podium.types';

import { placeLabel, podiumStands } from './podium-layout';

// three.js, and the 3D figures where the device can show them, load only once a podium is shown.
// The stage box below keeps its size meanwhile.
const PodiumStage = dynamic(() => import('./PodiumStage'), { ssr: false });

interface CharacterPodiumProps {
  /** Ranked players, best first; only ranks 1 to 3 stand on the podium. */
  contenders: readonly PodiumContender[];
  /** A player's name under the step; plain text by default (tournaments link the profile). */
  renderName?: (contender: PodiumContender) => ReactNode;
}

function PlainName({ contender }: { contender: PodiumContender }) {
  return (
    <span className="block truncate" style={{ color: contender.isViewer ? 'var(--accent-bright)' : 'var(--color-amber-100)' }}>
      {contender.name}
      {contender.isViewer ? <span className="sr-only"> (you)</span> : null}
    </span>
  );
}

function StandLabel({ stand, renderName }: { stand: PodiumStand; renderName?: CharacterPodiumProps['renderName'] }) {
  return (
    <li className="flex w-1/3 min-w-0 flex-col items-center px-1 text-center font-serif">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PODIUM.STEP_COLOR[stand.place] }}>
        {placeLabel(stand.place)}
        <span className="sr-only"> place:</span>
      </span>
      {stand.occupants.map((contender) => (
        <span key={contender.id} className="flex w-full min-w-0 justify-center text-sm leading-snug">
          {renderName ? renderName(contender) : <PlainName contender={contender} />}
        </span>
      ))}
      {stand.hidden > 0 ? <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>+{stand.hidden} more</span> : null}
      <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{stand.occupants[0]?.detail}</span>
    </li>
  );
}

/**
 * The winners' characters on a 1-2-3 podium: the champion on the tallest step, in the middle,
 * cheering; second and third idle beside. Tied players share a step. Shows 3D figures where the
 * device can, portraits otherwise; the names and scores under the steps are plain text.
 */
export function CharacterPodium({ contenders, renderName }: CharacterPodiumProps) {
  const stands = useMemo(() => podiumStands(contenders), [contenders]);
  const reduceMotion = useReducedMotion() ?? false;
  if (stands.length === 0) return null;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ aspectRatio: PODIUM.STAGE_ASPECT }} aria-hidden>
        <PodiumStage stands={stands} reduceMotion={reduceMotion} />
      </div>
      <ol aria-label="Podium" className="mt-1.5 flex justify-center">
        {stands.map((stand) => (
          <StandLabel key={stand.place} stand={stand} renderName={renderName} />
        ))}
      </ol>
    </div>
  );
}
