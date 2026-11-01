import { HALLOWEEN_PALETTE as C } from '@/presentation/components/hud/skins/halloween/halloween-palette';
import type { LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './halloween-lobby.module.css';

/** Grass tuft x positions along the plate's bottom edge, in %. */
const TUFTS = [6, 38, 71, 93];

function Tuft({ left }: { left: number }) {
  return (
    <svg viewBox="0 0 12 6" className={styles.tuft} style={{ left: `${left}%` }}>
      <path d="M0 6L2 1L3 6L5 0L6.5 6L8 2L9 6L11 1.5L12 6Z" fill={C.stemDark} />
    </svg>
  );
}

/** A granite headstone plate: speckled stone, a hairline crack, grass growing along the base. */
export function HalloweenPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  return (
    <>
      <span className={isLocal ? styles.stoneLocal : styles.stone} />
      <svg viewBox="0 0 30 14" className={index % 2 ? styles.crackAlt : styles.crack}>
        <path d="M0 1L7 4L10 2L16 7L20 6L26 11L30 12" stroke="#000000" strokeWidth={0.8} fill="none" opacity={0.55} />
      </svg>
      {TUFTS.map((left) => <Tuft key={left} left={left} />)}
    </>
  );
}

/** A small arched headstone rising behind the avatar, a cross carved in its crown. */
export function HalloweenAvatarFrame() {
  return (
    <svg viewBox="0 0 60 60" className={styles.headstone}>
      <path d="M6 58V20Q6 1 30 1Q54 1 54 20V58Z" fill={C.ironLight} stroke={C.night} strokeWidth={1.2} />
      <path d="M9 56V21Q9 5 30 5" stroke="#ffffff" strokeWidth={0.8} opacity={0.25} fill="none" />
      <path d="M30 2.5v6.5M27 5h6" stroke={C.night} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M2 60L5 54L7 60L10 53L12 60M48 60L51 53L53 60L56 54L58 60" fill={C.stem} />
    </svg>
  );
}

/** An open grave: a dirt mound with a shovel and a blank headstone lit by a flickering candle. */
export function HalloweenEmptySlotDecor() {
  return (
    <>
      <span className={styles.mist} />
      <svg viewBox="0 0 120 48" preserveAspectRatio="xMaxYMid meet" className={styles.openGrave}>
        <path d="M84 46V18Q84 6 98 6Q112 6 112 18V46Z" fill={C.ironLight} stroke={C.night} strokeWidth={1} opacity={0.9} />
        <path d="M90 20h16M92 26h12" stroke={C.night} strokeWidth={1} opacity={0.5} />
        <path d="M30 46Q50 30 74 46Z" fill={C.woodDark} />
        <path d="M38 42l3-2M54 38l2 1M62 41l3 1" stroke={C.wood} strokeWidth={1} />
        <path d="M44 14L58 40" stroke={C.wood} strokeWidth={2} strokeLinecap="round" />
        <path d="M41 9L47 7L49 13L43 15Z" fill={C.iron} stroke={C.ironLight} strokeWidth={0.6} />
        <rect x={76} y={36} width={4} height={10} rx={0.8} fill={C.candle} />
        <path className={styles.candleFlame} d="M78 28Q80.5 32 78 35Q75.5 32 78 28Z" fill={C.flame} />
        <circle className={styles.candleFlame} cx={78} cy={33} r={7} fill={C.glow} opacity={0.18} />
      </svg>
    </>
  );
}
