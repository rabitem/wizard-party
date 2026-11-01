import { Blossom } from '@/presentation/components/hud/skins/spring/spring-icons';
import { SPRING_PALETTE as C } from '@/presentation/components/hud/skins/spring/spring-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './spring-lobby.module.css';

/** Dappled sunlight and drifting petals behind every panel; grass under the action bar. */
export function SpringPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.lawnFloor} />;
  return (
    <>
      <span className={styles.dapple} />
      <span className={styles.petalPattern} />
    </>
  );
}

/** A blossoming cherry branch reaching in from the top-left corner. */
function BlossomBranch() {
  return (
    <svg viewBox="0 0 54 28" className={styles.branch}>
      <path d="M0 4Q20 6 52 22M18 7Q26 2 34 3M30 13Q32 20 40 24" stroke={C.barkDark} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <path d="M44 18Q48 13 52 14Q50 19 44 18ZM24 4Q27 0 31 0Q29 4 24 4Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.5} />
      <Blossom cx={10} cy={6} size={4.4} />
      <Blossom cx={33} cy={4} size={3.6} color={C.blossomLight} />
      <Blossom cx={28} cy={13} size={4} />
      <Blossom cx={41} cy={23} size={3.4} color={C.blossomLight} />
      <circle cx={50} cy={22} r={1.6} fill={C.blossomDark} />
    </svg>
  );
}

/** A curling vine with leaves hanging down the right edge. */
function Vine() {
  return (
    <svg viewBox="0 0 16 60" className={styles.vine}>
      <path d="M12 0Q4 10 10 20Q16 30 8 40Q2 50 10 58" stroke={C.stem} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <path d="M8 10Q2 8 1 12Q6 14 8 10ZM12 24Q16 20 16 26Q13 28 12 24ZM7 36Q1 35 1 40Q5 41 7 36ZM9 50Q15 48 15 53Q11 55 9 50Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.5} />
      <Blossom cx={10} cy={20} size={2.4} color={C.tulipPurple} rim={C.tulipPurpleDark} />
      <Blossom cx={6} cy={46} size={2.2} color={C.yellow} rim={C.yellowDark} />
    </svg>
  );
}

/** A ladybug strolling along the top edge. */
function Ladybug() {
  return (
    <span className={styles.ladybugWalk}>
      <svg viewBox="0 0 14 10" className={styles.ladybug}>
        <circle cx={11.4} cy={5} r={2.2} fill={C.ink} />
        <path d="M12.6 3.4l1.2-1.6M12.6 6.6l1.2 1.6" stroke={C.ink} strokeWidth={0.5} strokeLinecap="round" />
        <ellipse cx={6.4} cy={5} rx={5} ry={4.2} fill={C.ladybug} stroke={C.ladybugDark} strokeWidth={0.6} />
        <path d="M11.2 5H1.6" stroke={C.ink} strokeWidth={0.6} />
        <circle cx={4} cy={3} r={0.9} fill={C.ink} />
        <circle cx={4} cy={7} r={0.9} fill={C.ink} />
        <circle cx={7.6} cy={2.6} r={0.8} fill={C.ink} />
        <circle cx={7.6} cy={7.4} r={0.8} fill={C.ink} />
      </svg>
    </span>
  );
}

/** Blossom branches in the corner, a vine down the side, a ladybug on the players list. */
export function SpringPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <BlossomBranch />
      {variant === 'rules' ? <Vine /> : null}
      {variant === 'players' ? <Ladybug /> : null}
    </>
  );
}

/** A bumblebee buzzing in loops over the add-bot row, visiting a daisy. */
export function SpringAddBotDecor() {
  return (
    <>
      <span className={styles.lawnBehind} />
      <svg viewBox="0 0 12 12" className={styles.daisy}>
        <path d="M6 12V7" stroke={C.stem} strokeWidth={1} />
        <Blossom cx={6} cy={5} size={3.6} color={C.white} rim={C.blossomDark} />
      </svg>
      <span className={styles.beeFlight}>
        <svg viewBox="0 0 18 14" className={styles.bee}>
          <g className={styles.beeWings}>
            <ellipse cx={7} cy={4} rx={3} ry={2.4} fill={C.white} opacity={0.85} stroke={C.canDark} strokeWidth={0.4} />
            <ellipse cx={10.4} cy={3.6} rx={2.6} ry={2.1} fill={C.white} opacity={0.75} stroke={C.canDark} strokeWidth={0.4} />
          </g>
          <ellipse cx={8.6} cy={8.6} rx={5.6} ry={3.8} fill={C.yellow} stroke={C.ink} strokeWidth={0.6} />
          <path d="M7 5.2V12M10 5V12.2" stroke={C.ink} strokeWidth={1.3} />
          <circle cx={14.4} cy={8.2} r={2.2} fill={C.ink} />
          <path d="M15.4 6.4l1-2M14.4 6.2l0.2-2.2" stroke={C.ink} strokeWidth={0.5} strokeLinecap="round" />
          <path d="M3 8.6L1 9" stroke={C.ink} strokeWidth={0.9} strokeLinecap="round" />
        </svg>
      </span>
    </>
  );
}

/** A flower at one end of the start button: a bud while waiting, blooming once everyone is in. */
function StartFlower({ className, open }: { className: string; open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 24V16" stroke={C.stem} strokeWidth={1.6} />
      {open ? (
        <g className={styles.bloom}>
          <Blossom cx={12} cy={11} size={9} color={C.blossomLight} rim={C.blossomDeep} />
        </g>
      ) : (
        <g>
          <path d="M12 4Q17 9 14.6 15H9.4Q7 9 12 4Z" fill={C.blossom} stroke={C.blossomDark} strokeWidth={0.7} />
          <path d="M9.4 15Q8 11 9 8L12 13L15 8Q16 11 14.6 15Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.6} />
        </g>
      )}
    </svg>
  );
}

/** The start button as a flower bed: blooming blossoms when ready, closed buds while waiting. */
export function SpringStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.meadowCalm} />
        <span className={styles.grassEdge} />
      </>
    );
  }
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.blossomBed : styles.blossomBedCalm} />
      <span className={styles.grassEdge} />
      <StartFlower className={ready ? styles.flowerLeft : styles.flowerLeftCalm} open={ready} />
      <StartFlower className={ready ? styles.flowerRight : styles.flowerRightCalm} open={ready} />
    </>
  );
}
