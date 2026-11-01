import type { CSSProperties } from 'react';
import { NEON_PALETTE as C } from '@/presentation/components/hud/skins/neon/neon-palette';
import type { LobbyPanelDecorProps, LobbyPanelVariant, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './neon-lobby.module.css';

/** Tube colours per panel: [main tube, accent tube]. */
const TUBES: Record<LobbyPanelVariant, readonly [string, string]> = {
  count: [C.pink, C.cyan],
  players: [C.cyan, C.pink],
  rules: [C.purple, C.cyan],
  actions: [C.pink, C.cyan],
  avatar: [C.cyan, C.yellow],
};

function tubeVars(variant: LobbyPanelVariant): CSSProperties {
  const [main, accent] = TUBES[variant];
  return { '--tube': main, '--tube-accent': accent } as CSSProperties;
}

/** Faint grid and scanlines behind every panel; the actions bar gets a glowing floor. */
export function NeonPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.actionFloor} />;
  return <span className={styles.panelGrid} style={tubeVars(variant)} />;
}

/** A neon tube bent around the panel with an accent tube and mounting clips along the bottom. */
export function NeonPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={tubeVars(variant)}>
      <span className={styles.panelTube} />
      <span className={styles.accentTube} />
      <span className={styles.clipLeft} />
      <span className={styles.clipRight} />
    </span>
  );
}

/** The add-bot row as a "CPU" slot: dashed accent tube and a tag. */
export function NeonAddBotDecor() {
  return (
    <>
      <span className={styles.cpuTube} />
      <span className={styles.cpuTag}>CPU</span>
    </>
  );
}

/** The start button as a glowing arcade pad (unlit while waiting, attract-mode sweep for guests). */
export function NeonStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.padDim} />
        <span className={styles.attractSweep} />
      </>
    );
  }
  const lit = mode === 'ready';
  return (
    <>
      <span className={lit ? styles.padLit : styles.padDim} />
      <span className={lit ? styles.padTubeOuter : styles.padTubeOuterOff} />
      <span className={lit ? styles.padTubeInner : styles.padTubeInnerOff} />
      <span className={lit ? styles.chevronsLeft : styles.chevronsLeftOff}>{'>>'}</span>
      <span className={lit ? styles.chevronsRight : styles.chevronsRightOff}>{'<<'}</span>
    </>
  );
}
