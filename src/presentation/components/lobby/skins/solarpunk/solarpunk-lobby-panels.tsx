import { Leaf } from '@/presentation/components/hud/skins/solarpunk/solarpunk-icons';
import { SOLARPUNK_PALETTE as C } from '@/presentation/components/hud/skins/solarpunk/solarpunk-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './solarpunk-lobby.module.css';

/** Greenhouse glass panes and a slanting sunbeam behind every panel. */
export function SolarpunkPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.mossFloor} />;
  return (
    <>
      <span className={styles.glassPanes} />
      <span className={styles.sunbeam} />
    </>
  );
}

/** Ivy leaves on a trailing stem as [x, y, angle, colour]. */
const IVY: readonly (readonly [number, number, number, string])[] = [
  [6, 6, -70, C.leaf],
  [14, 9, 60, C.fern],
  [8, 18, -50, C.leafLight],
  [15, 26, 70, C.leaf],
  [7, 34, -60, C.fern],
  [12, 44, 50, C.leaf],
];

/** Ivy trailing down from the top-left corner. */
function Ivy() {
  return (
    <svg viewBox="0 0 22 52" className={styles.ivy}>
      <path d="M2 0Q14 8 8 18Q2 28 12 36Q16 42 10 50" stroke={C.leafDark} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      {IVY.map(([x, y, angle, colour]) => <Leaf key={`${x}-${y}`} x={x} y={y} length={7} angle={angle} color={colour} />)}
    </svg>
  );
}

/** A riveted brass rail along the top, ivy over a corner, a glass corner bracket on the count card. */
export function SolarpunkPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <span className={styles.brassRail} />
      {variant === 'count' ? <span className={styles.cornerBracket} /> : <Ivy />}
    </>
  );
}

/** A gardening drone hovering over the add-bot row with a seedling pot on a tether. */
export function SolarpunkAddBotDecor() {
  return (
    <>
      <span className={styles.glassBehind} />
      <span className={styles.droneFlight}>
        <svg viewBox="0 0 28 22" className={styles.drone}>
          <path d="M4 6H24M7 6V9M21 6V9" stroke={C.brassDark} strokeWidth={1.2} strokeLinecap="round" />
          <ellipse className={styles.prop} cx={4} cy={4.6} rx={4} ry={0.9} fill={C.glass} stroke={C.glassRim} strokeWidth={0.5} />
          <ellipse className={styles.prop} cx={24} cy={4.6} rx={4} ry={0.9} fill={C.glass} stroke={C.glassRim} strokeWidth={0.5} />
          <rect x={7} y={8} width={14} height={7} rx={3.5} fill={C.brass} stroke={C.outline} strokeWidth={0.6} />
          <circle cx={14} cy={11.5} r={2.2} fill={C.sky} stroke={C.brassDark} strokeWidth={0.6} />
          <circle cx={13.3} cy={10.8} r={0.6} fill={C.white} />
          <rect x={9} y={8.6} width={3} height={1.4} rx={0.5} fill={C.panelCell} />
          <path d="M14 15V18" stroke={C.ink} strokeWidth={0.5} />
          <path d="M11.6 18H16.4L15.6 21.6H12.4Z" fill={C.copper} stroke={C.outline} strokeWidth={0.4} />
          <Leaf x={14} y={18} length={3.6} angle={-40} />
          <Leaf x={14} y={18} length={3.2} angle={40} color={C.leafLight} />
        </svg>
      </span>
    </>
  );
}

/** A glowing seed pod at one end of the start button (dark and dormant while waiting). */
function SeedPod({ className, charged }: { className: string; charged: boolean }) {
  return (
    <svg viewBox="0 0 20 24" className={className}>
      {charged ? <circle className={styles.podGlow} cx={10} cy={11} r={9} fill={C.leafLight} /> : null}
      <path d="M10 2Q17 10 10 20Q3 10 10 2Z" fill={charged ? C.leaf : C.leafDark} stroke={C.brassDark} strokeWidth={0.9} />
      <path d="M10 5Q12.6 10 10 16" stroke={charged ? C.leafLight : C.fern} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d="M4 21Q10 18 16 21" stroke={C.brass} strokeWidth={2} fill="none" strokeLinecap="round" />
      <circle cx={4.4} cy={21} r={1} fill={C.brassLight} />
      <circle cx={15.6} cy={21} r={1} fill={C.brassLight} />
    </svg>
  );
}

/** The start button as a sun-charged brass panel: a charge sheen sweeps across between seed pods. */
export function SolarpunkStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.glassCalm} />
        <span className={styles.brassRimCalm} />
      </>
    );
  }
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.brassCharged : styles.brassDormant} />
      {ready ? <span className={styles.chargeSheen} /> : null}
      <SeedPod className={ready ? styles.podLeft : styles.podLeftCalm} charged={ready} />
      <SeedPod className={ready ? styles.podRight : styles.podRightCalm} charged={ready} />
    </>
  );
}
