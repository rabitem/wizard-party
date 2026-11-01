import { starPath, twinklePath } from '@/presentation/components/hud/skins/celestial/celestial-icons';
import { CELESTIAL_PALETTE as C } from '@/presentation/components/hud/skins/celestial/celestial-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './celestial-lobby.module.css';

/** Star dust behind every panel, a nebula glow on the players list, a horizon on the actions bar. */
export function CelestialPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.horizonGlow} />;
  return (
    <>
      <span className={styles.starDust} />
      {variant === 'players' ? <span className={styles.nebula} /> : null}
    </>
  );
}

/** Gold filigree scrollwork for a panel corner (drawn for the top-left, rotated for the rest). */
function Filigree({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 30 30" fill="none" strokeLinecap="round" className={className}>
      <g stroke={C.outline} strokeWidth={2.6}>
        <path d="M2 28V11Q2 2 11 2H28" />
      </g>
      <g stroke={C.gold}>
        <path d="M2 28V11Q2 2 11 2H28" strokeWidth={1.3} />
        <path d="M6 22V13Q6 6 13 6H22" strokeWidth={0.8} opacity={0.75} />
        <path d="M10 14Q10 10 14 10Q17 10 17 13Q17 15 15 15Q13.6 15 13.8 13.6" strokeWidth={0.9} />
        <path d="M22 6Q25 6 25 9M6 22Q6 25 9 25" strokeWidth={0.8} />
      </g>
      <path d={starPath(4.6, 4.6, 3.4, 1.4, 4)} fill={C.goldLight} stroke={C.outline} strokeWidth={0.6} />
      <circle cx={28} cy={2} r={1.2} fill={C.gold} />
      <circle cx={2} cy={28} r={1.2} fill={C.gold} />
    </svg>
  );
}

/** A gilded medallion with an eight-pointed star, centred on a panel's top edge. */
function Medallion() {
  return (
    <svg viewBox="0 0 24 24" className={styles.medallion}>
      <circle cx={12} cy={12} r={10.4} fill={C.midnight} stroke={C.outline} strokeWidth={2.2} />
      <circle cx={12} cy={12} r={10.4} fill="none" stroke={C.gold} strokeWidth={1.2} />
      <circle cx={12} cy={12} r={8.2} fill="none" stroke={C.gold} strokeWidth={0.5} strokeDasharray="1 1.6" />
      <path d={starPath(12, 12, 6.4, 2.4, 8)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.6} />
      <circle cx={12} cy={12} r={1.6} fill={C.goldLight} />
    </svg>
  );
}

/** A thin gold rule with filigree corners; count and players get a medallion on top. */
export function CelestialPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.actionsRule} />;
  return (
    <>
      <span className={styles.goldRule} />
      <Filigree className={styles.filigreeTopLeft} />
      <Filigree className={styles.filigreeTopRight} />
      <Filigree className={styles.filigreeBottomLeft} />
      <Filigree className={styles.filigreeBottomRight} />
      {variant === 'count' || variant === 'players' ? <Medallion /> : null}
    </>
  );
}

/** The add-bot row: star dust, and a comet streaking in across the top now and then. */
export function CelestialAddBotDecor() {
  return (
    <>
      <span className={styles.addBotDust} />
      <span className={styles.cometTrack}>
        <svg viewBox="0 0 60 12" className={styles.comet}>
          <path d="M0 6L48 3.4V8.6Z" fill={C.gold} opacity={0.2} />
          <path d="M18 6L49 4.4V7.6Z" fill={C.goldLight} opacity={0.45} />
          <path d="M34 6L50 5V7Z" fill={C.star} opacity={0.8} />
          <circle cx={52} cy={6} r={3.6} fill={C.star} stroke={C.gold} strokeWidth={0.8} />
          <circle cx={51} cy={5} r={1.2} fill={C.white} />
        </svg>
      </span>
    </>
  );
}

const DIAL_TICKS = Array.from({ length: 24 }, (_, i) => i * 15);
const SUN_RAYS = Array.from({ length: 16 }, (_, i) => i * 22.5);

/** An astrolabe dial: limb with a degree scale, a turning rete star and an alidade. */
function Astrolabe({ className, reteClass }: { className: string; reteClass?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <circle cx={20} cy={20} r={18} fill={C.midnight} stroke={C.outline} strokeWidth={2.4} />
      <circle cx={20} cy={20} r={18} fill="none" stroke={C.gold} strokeWidth={1.6} />
      <g stroke={C.gold} strokeWidth={0.7}>
        {DIAL_TICKS.map((deg) => <path key={deg} d={deg % 45 === 0 ? 'M20 2.8V6.4' : 'M20 2.8V4.6'} transform={`rotate(${deg} 20 20)`} />)}
      </g>
      <circle cx={20} cy={20} r={12} fill="none" stroke={C.gold} strokeWidth={0.6} opacity={0.6} />
      <g className={reteClass}>
        <path d={starPath(20, 20, 11, 3.4, 8)} fill={C.goldLight} fillOpacity={0.85} stroke={C.goldDark} strokeWidth={0.6} />
        <circle cx={24} cy={16} r={6} fill="none" stroke={C.gold} strokeWidth={0.7} />
      </g>
      <path d="M8 32L32 8" stroke={C.brass} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={20} cy={20} r={1.8} fill={C.gold} stroke={C.goldDark} strokeWidth={0.6} />
    </svg>
  );
}

/** A radiant sun disc with long and short rays. */
function SunDisc({ className, raysClass }: { className: string; raysClass?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <g className={raysClass}>
        {SUN_RAYS.map((deg, i) => (
          <path key={deg} d={i % 2 === 0 ? 'M20 1L22 8H18Z' : 'M20 4.5L21.4 9H18.6Z'} fill={C.sun} stroke={C.sunDark} strokeWidth={0.6} transform={`rotate(${deg} 20 20)`} />
        ))}
      </g>
      <circle cx={20} cy={20} r={10} fill={C.gold} stroke={C.sunDark} strokeWidth={1} />
      <circle cx={20} cy={20} r={7} fill="none" stroke={C.goldLight} strokeWidth={0.7} />
      <path d={twinklePath(20, 20, 4.6)} fill={C.goldLight} />
    </svg>
  );
}

/**
 * The start button as an astronomer's instrument: midnight face with a gold double rim, an
 * astrolabe and a sun disc at the ends (turning when ready), a faint orbit sweeping behind.
 */
export function CelestialStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.instrumentFaceDim} />
        <span className={styles.guestStars} />
        <span className={styles.instrumentRimDim} />
      </>
    );
  }
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.instrumentFace : styles.instrumentFaceDim} />
      {ready ? <span className={styles.orbitSweep} /> : null}
      <span className={ready ? styles.instrumentRim : styles.instrumentRimDim} />
      <Astrolabe className={ready ? styles.astrolabe : styles.astrolabeDim} reteClass={ready ? styles.rete : undefined} />
      <SunDisc className={ready ? styles.sunDisc : styles.sunDiscDim} raysClass={ready ? styles.sunRays : undefined} />
    </>
  );
}
