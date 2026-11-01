import { SUMMER_PALETTE as C } from '@/presentation/components/hud/skins/summer/summer-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './summer-lobby.module.css';

/** Pool caustics behind every panel; the players list also gets a palm frond shadow. */
export function SummerPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.sandFloor} />;
  return (
    <>
      <span className={styles.caustics} />
      {variant === 'players' ? (
        <svg viewBox="0 0 120 90" className={styles.palmShadow}>
          <path d="M120 0Q86 18 60 60Q90 26 120 18ZM120 26Q92 40 76 86Q98 50 120 46ZM104 0Q80 4 40 30Q78 14 112 8Z" fill="#000000" />
        </svg>
      ) : null}
    </>
  );
}

/** A rubber duck resting on the panel's top edge. */
function Duck() {
  return (
    <svg viewBox="0 0 22 19" className={styles.duck}>
      <path d="M2.8 12.6L1.3 9.6L5 11.3Z" fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.7} strokeLinejoin="round" />
      <ellipse cx={10} cy={13} rx={7.5} ry={4.2} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
      <circle cx={14.6} cy={7} r={3.8} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
      <path d="M18 7.2L21 7.8L18.2 9.2Z" fill={C.orange} stroke={C.orangeDark} strokeWidth={0.5} strokeLinejoin="round" />
      <circle cx={15.6} cy={6.2} r={0.75} fill={C.navy} />
    </svg>
  );
}

/** A starfish lying on the bottom-left corner. */
function Starfish() {
  return (
    <svg viewBox="0 0 20 20" className={styles.starfish}>
      <path
        d="M10 1.5L12.3 7.4L18.6 7.6L13.6 11.5L15.4 17.6L10 14L4.6 17.6L6.4 11.5L1.4 7.6L7.7 7.4Z"
        fill={C.orange}
        stroke={C.orangeDark}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <g fill={C.yellow}>
        <circle cx={10} cy={6} r={0.8} />
        <circle cx={14} cy={9.2} r={0.8} />
        <circle cx={6} cy={9.2} r={0.8} />
        <circle cx={12.4} cy={13.6} r={0.8} />
        <circle cx={7.6} cy={13.6} r={0.8} />
      </g>
    </svg>
  );
}

/** Lapping wave along every panel's bottom edge plus a per-panel beach find. */
export function SummerPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <span className={styles.waveEdge} />
      {variant === 'players' || variant === 'avatar' ? <Duck /> : null}
      {variant === 'count' ? <Starfish /> : null}
    </>
  );
}

/** A little crab scuttling along the bottom of the add-bot row. */
export function SummerAddBotDecor() {
  return (
    <>
      <span className={styles.sandBehind} />
      <svg viewBox="0 0 24 14" className={styles.crab}>
        <path d="M5 9L1 12M6 10L3 13.5M19 9L23 12M18 10L21 13.5" stroke={C.red} strokeWidth={1.2} strokeLinecap="round" />
        <path d="M6 6L3 2.5M18 6L21 2.5" stroke={C.red} strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={3} cy={2.5} r={2} fill={C.red} />
        <circle cx={21} cy={2.5} r={2} fill={C.red} />
        <ellipse cx={12} cy={8.5} rx={7} ry={4.5} fill={C.red} stroke={C.outline} strokeWidth={0.6} />
        <circle cx={10} cy={6} r={1} fill={C.white} />
        <circle cx={14} cy={6} r={1} fill={C.white} />
        <circle cx={10} cy={6} r={0.45} fill={C.navy} />
        <circle cx={14} cy={6} r={0.45} fill={C.navy} />
      </svg>
    </>
  );
}

/** Red/white lifebuoy (a ring of four red and four white quarters). */
function Lifebuoy({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx={12} cy={12} r={8} fill="none" stroke={C.red} strokeWidth={5.4} />
      <circle cx={12} cy={12} r={8} fill="none" stroke={C.white} strokeWidth={5.4} strokeDasharray="6.28 6.28" strokeDashoffset={3.14} />
      <circle cx={12} cy={12} r={10.7} fill="none" stroke={C.outline} strokeWidth={0.6} />
      <circle cx={12} cy={12} r={5.3} fill="none" stroke={C.outline} strokeWidth={0.6} />
    </svg>
  );
}

/** The start button as a pool: rippling water, a foam line, lifebuoys floating at both ends. */
export function SummerStartDecor({ mode }: LobbyStartDecorProps) {
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.poolWater : styles.poolWaterCalm} />
      <span className={styles.poolFoam} />
      {mode === 'guest' ? null : (
        <>
          <Lifebuoy className={ready ? styles.buoyLeft : styles.buoyLeftCalm} />
          <Lifebuoy className={ready ? styles.buoyRight : styles.buoyRightCalm} />
        </>
      )}
    </>
  );
}
