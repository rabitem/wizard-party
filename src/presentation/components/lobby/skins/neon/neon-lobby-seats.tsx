import type { CSSProperties } from 'react';
import { NEON_PALETTE as C } from '@/presentation/components/hud/skins/neon/neon-palette';
import type { LobbySeatDecorProps } from '../lobby-skin.types';
import styles from './neon-lobby.module.css';

/** Player colours, cycled per seat like an arcade cabinet's P1/P2/P3... */
const SEAT_COLORS = [C.pink, C.cyan, C.yellow, C.purple, C.orange, '#5dff8f'];

function seatVars(index: number): CSSProperties {
  return { '--seat': SEAT_COLORS[index % SEAT_COLORS.length] } as CSSProperties;
}

/** Arcade "player select" frame: scanlines, glowing corner brackets and a P# tag. */
export function NeonPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={seatVars(index)}>
      <span className={isLocal ? styles.scanlinesLocal : styles.scanlines} />
      <span className={isLocal ? styles.bracketsLocal : styles.brackets} />
      <span className={styles.seatTag}>P{index + 1}</span>
    </span>
  );
}

/** A glowing tube ring around the avatar in the seat's colour. */
export function NeonAvatarFrame({ index, isLocal }: LobbySeatDecorProps) {
  return <span className={isLocal ? styles.avatarRingLocal : styles.avatarRing} style={seatVars(index)} />;
}

/** An empty cabinet slot: dashed dim tube and a blinking "insert coin" style prompt. */
export function NeonEmptySlotDecor() {
  return (
    <>
      <span className={styles.emptyTube} />
      <span className={styles.insertCoin}>Insert coin</span>
    </>
  );
}
