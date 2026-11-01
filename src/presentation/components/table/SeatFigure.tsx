'use client';

import { Component, Suspense, type ReactNode } from 'react';
import type { IPlayer } from '@shared/domain';
import { DEFAULT_APPEARANCE } from '@shared/domain/character';

import { CharacterFigure } from '@/presentation/components/character/CharacterFigure';
import { useSeatAppearance } from '@/presentation/hooks/account/useSeatAppearance';
import { SEAT_FIGURE } from '@/presentation/config/character.config';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling';
import { useRenderQuality } from '../three/render-quality';
import { usePrefersReducedMotion } from '../three/themed-environments/primitives/usePrefersReducedMotion';
import { REACTION_CLIPS, seatClip } from './seat-reactions';
import { useSeatReaction } from './useSeatReaction';

/** A figure that cannot load (assets missing, a decode error) is left out; the table goes on. */
class SeatFigureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    console.warn('[SeatFigure] Character could not be shown:', error.message);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type SeatPlayer = Pick<IPlayer, 'id' | 'isBot' | 'botDifficulty' | 'appearance' | 'isConnected' | 'roundHistory'>;

interface SeatFigureProps {
  player: SeatPlayer;
  /** The player who won the trick being shown, if any: that figure cheers. */
  trickWinnerId?: string | null;
}

/**
 * An opponent's character standing behind their seat plate, facing the table. Lives inside the
 * seat's rotated group, where +z points away from the table centre. At rest it holds a pose and
 * costs nothing per frame; it moves only to play a reaction once (seat-reactions.ts), and not at
 * all on the low render tier or with reduced motion. Its motion is ambient: it never keeps the table
 * rendering at full rate. It mounts visible, so the table's shader warm-up compiles it.
 */
export function SeatFigure({ player, trickWinnerId }: SeatFigureProps) {
  const appearance = useSeatAppearance(player, false);
  const { tier } = useRenderQuality();
  const still = usePrefersReducedMotion() || tier === 'low';
  const latest = useSeatReaction(player, trickWinnerId);
  const oneShot = latest && !still ? { clip: REACTION_CLIPS[latest.reaction], key: latest.serial } : undefined;

  return (
    <group position={[0, 0, SEAT_FIGURE.OUTWARD_OFFSET]} rotation={[0, Math.PI, 0]} scale={SEAT_FIGURE.SCALE} userData={AMBIENT_USER_DATA}>
      <SeatFigureBoundary>
        <Suspense fallback={null}>
          <CharacterFigure
            appearance={appearance ?? DEFAULT_APPEARANCE}
            silhouette={appearance === null}
            clip={seatClip(null, player)}
            holdPose
            oneShot={oneShot}
          />
        </Suspense>
      </SeatFigureBoundary>
    </group>
  );
}
