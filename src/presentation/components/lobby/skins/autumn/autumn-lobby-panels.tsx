import { AUTUMN_PALETTE as C } from '@/presentation/components/hud/skins/autumn/autumn-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './autumn-lobby.module.css';

/** Barn-wood grain behind every panel; the players list also gets a warm lantern glow. */
export function AutumnPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.strawFloor} />;
  return (
    <>
      <span className={styles.barnWood} />
      {variant === 'players' || variant === 'count' ? <span className={styles.lanternGlow} /> : null}
    </>
  );
}

/** Leaves of a corner pile as [x, y, rotation, colour]. */
const PILE: readonly (readonly [number, number, number, string])[] = [
  [6, 20, -40, C.gold],
  [14, 22, 20, C.red],
  [24, 21, -70, C.orange],
  [10, 14, 60, C.orange],
  [20, 15, -15, C.gold],
  [30, 18, 45, C.red],
  [16, 9, -55, C.red],
];

/** A heap of fallen leaves for a bottom corner (mirrored by CSS on the right). */
function LeafPile({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 36 26" className={className}>
      {PILE.map(([x, y, rot, fill]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <path d="M0 -6Q5 -2 0 6Q-5 -2 0 -6Z" fill={fill} stroke={C.outline} strokeWidth={0.6} />
          <path d="M0 -4.5V5" stroke={C.outline} strokeWidth={0.45} />
        </g>
      ))}
    </svg>
  );
}

/** A woven basket brimming with apples, sitting on the panel's top edge. */
function AppleBasket() {
  return (
    <svg viewBox="0 0 28 22" className={styles.appleBasket}>
      <path d="M5 11Q14 -1 23 11" stroke={C.woodDark} strokeWidth={1.4} fill="none" />
      <circle cx={8.6} cy={10.4} r={3.6} fill={C.apple} stroke={C.redDark} strokeWidth={0.5} />
      <circle cx={14} cy={9} r={3.8} fill={C.red} stroke={C.redDark} strokeWidth={0.5} />
      <circle cx={19.4} cy={10.6} r={3.4} fill={C.apple} stroke={C.redDark} strokeWidth={0.5} />
      <path d="M14 5.4Q14.6 3.8 16 3.4" stroke={C.bark} strokeWidth={0.8} strokeLinecap="round" />
      <ellipse cx={12.6} cy={8} rx={0.8} ry={1.2} fill="#ffffff" opacity={0.5} />
      <path d="M3 12H25L22.4 21H5.6Z" fill={C.wood} stroke={C.woodDark} strokeWidth={0.7} strokeLinejoin="round" />
      <path d="M4 15H24M4.8 18H23.2M8 12L9 21M13 12V21M18 12L17.6 21M22 12L21 21" stroke={C.woodDark} strokeWidth={0.5} />
    </svg>
  );
}

/** Rough-sawn plank along the top edge, leaf piles in the bottom corners, an apple basket. */
export function AutumnPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <span className={styles.plankEdge} />
      <LeafPile className={styles.pileLeft} />
      {variant === 'count' ? null : <LeafPile className={styles.pileRight} />}
      {variant === 'players' ? <AppleBasket /> : null}
    </>
  );
}

/** A squirrel scurrying back and forth along the add-bot row with an acorn in its paws. */
export function AutumnAddBotDecor() {
  return (
    <>
      <span className={styles.strawBehind} />
      <span className={styles.squirrelRun}>
        <svg viewBox="0 0 26 18" className={styles.squirrel}>
          <path d="M8 13Q1 14 1.4 7Q2 1 7.6 1.6Q11 2.2 9.6 6Q6.4 4.6 5.6 7.6Q5.4 10.6 9 11Z" fill={C.orange} stroke={C.orangeDark} strokeWidth={0.6} />
          <ellipse cx={13} cy={12} rx={5.4} ry={4.2} fill={C.acorn} stroke={C.acornDark} strokeWidth={0.6} />
          <circle cx={18.4} cy={8} r={3.2} fill={C.acorn} stroke={C.acornDark} strokeWidth={0.6} />
          <path d="M17 5.4L17.4 3.2L18.8 5" fill={C.acorn} stroke={C.acornDark} strokeWidth={0.5} />
          <circle cx={19.4} cy={7.4} r={0.6} fill={C.capDark} />
          <path d="M10 16L9 17.4M15 16L16 17.4" stroke={C.acornDark} strokeWidth={1} strokeLinecap="round" />
          <ellipse cx={22.4} cy={11.4} rx={1.8} ry={2.1} fill={C.acornLight} stroke={C.acornDark} strokeWidth={0.5} />
          <path d="M20.6 10.4Q22.4 8.6 24.2 10.4Q22.4 11 20.6 10.4Z" fill={C.cap} />
        </svg>
      </span>
    </>
  );
}

/** Cider drips from the barrel tap as [delay s]. */
const DRIPS = [0, 1.3];

/** A barrel tap on the left end, dripping cider when the harvest is ready. */
function Tap({ dripping }: { dripping: boolean }) {
  return (
    <>
      <svg viewBox="0 0 14 14" className={styles.tap}>
        <rect x={0} y={4} width={9} height={4} rx={1} fill={C.iron} stroke={C.outline} strokeWidth={0.5} />
        <path d="M7 8V11.4H10V8" fill={C.iron} stroke={C.outline} strokeWidth={0.5} />
        <rect x={3} y={1} width={2.4} height={4} rx={0.8} fill={C.woodDark} />
      </svg>
      {dripping ? DRIPS.map((delay) => <span key={delay} className={styles.drip} style={{ animationDelay: `${delay}s` }} />) : null}
    </>
  );
}

/** The start button as an apple-cider barrel on its side: staves, iron hoops, a tap and apples. */
export function AutumnStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') return <span className={styles.carvedSign} />;
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.barrel : styles.barrelCold} />
      <span className={styles.hoopLeft} />
      <span className={styles.hoopRight} />
      <Tap dripping={ready} />
      <svg viewBox="0 0 22 14" className={ready ? styles.barrelApples : styles.barrelApplesCold}>
        <circle cx={6} cy={8} r={4.6} fill={C.apple} stroke={C.redDark} strokeWidth={0.6} />
        <circle cx={15.4} cy={8.4} r={4.4} fill={C.gold} stroke={C.goldDark} strokeWidth={0.6} />
        <path d="M6 3.4Q6.4 1.6 8 1.2M15.4 4Q15.8 2.2 17.4 1.8" stroke={C.bark} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      </svg>
    </>
  );
}
