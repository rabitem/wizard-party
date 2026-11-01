import { WINTER_PALETTE as C } from '@/presentation/components/hud/skins/winter/winter-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './winter-lobby.module.css';

/** Thick snow load along a panel top (stretched to the panel width). */
const PANEL_SNOW_PATH =
  'M0 12Q-1 5 6 5Q10 0 18 3Q25 -1 33 3Q40 1 47 3Q55 -1 62 3Q70 0 78 3Q86 -1 92 3Q100 2 100 8V12Q94 9 88 12Q80 9 72 12Q64 9 56 12Q48 9 40 12Q32 9 24 12Q16 9 8 12Z';

function PanelSnow() {
  return (
    <svg viewBox="0 0 100 12" preserveAspectRatio="none" className={styles.panelSnow}>
      <path d={PANEL_SNOW_PATH} fill={C.snow} />
      <path d="M3 8Q30 5 50 7Q72 5 97 8" stroke={C.snowShade} strokeWidth={0.8} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A robin perched on the snow. */
function Robin() {
  return (
    <svg viewBox="0 0 20 16" className={styles.robin}>
      <path d="M4 9L0 7L1 11Z" fill={C.woodDark} />
      <ellipse cx={9} cy={9} rx={6} ry={4.6} fill={C.wood} />
      <path d="M8 9Q11 14 15 10Q15 6 12 6Q9 7 8 9Z" fill={C.carrot} />
      <circle cx={13} cy={5} r={3.2} fill={C.wood} />
      <circle cx={14} cy={4.4} r={0.7} fill={C.coal} />
      <path d="M16 5L18.5 5.6L16 6.4Z" fill={C.goldDark} />
      <path d="M8 13.5V15.5M10 13.6V15.5" stroke={C.woodDark} strokeWidth={0.8} />
    </svg>
  );
}

/** Frost blooming from the corners and a slow sprinkle of snow behind the content. */
export function WinterPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  return (
    <>
      <span className={styles.frostCorners} />
      {variant === 'actions' ? <span className={styles.snowGround} /> : <span className={styles.snowfall} />}
    </>
  );
}

/** Snow load on top and icicles hanging from the bottom of every panel; a robin on the players list. */
export function WinterPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <PanelSnow />
      <span className={styles.icicles} />
      {variant === 'players' ? <Robin /> : null}
    </>
  );
}

/** Small snow drifts in the add-bot row's bottom corners. */
export function WinterAddBotDecor() {
  return (
    <>
      <span className={styles.frostBehind} />
      <span className={styles.driftLeft} />
      <span className={styles.driftRight} />
    </>
  );
}

/** The start button as frosted glass with snow piled on its corners. */
export function WinterStartDecor({ mode }: LobbyStartDecorProps) {
  return (
    <>
      <span className={mode === 'ready' ? styles.frostGlass : styles.frostGlassDim} />
      <span className={styles.glassSheen} />
      {mode === 'guest' ? null : (
        <>
          <span className={styles.pileTopLeft} />
          <span className={styles.pileBottomRight} />
        </>
      )}
    </>
  );
}
