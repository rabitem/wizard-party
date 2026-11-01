import { HALLOWEEN_PALETTE as C } from '@/presentation/components/hud/skins/halloween/halloween-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './halloween-lobby.module.css';

/** Spoke angles of a corner web (degrees from the top edge towards the side edge). */
const WEB_SPOKES = [0, 22.5, 45, 67.5, 90];
const WEB_RINGS = [8, 15, 22];
const WEB_RADIUS = 30;
/** How far ring segments sag towards the corner (1 = straight). */
const WEB_SAG = 0.86;

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Math.round(r * Math.cos(rad) * 10) / 10, Math.round(r * Math.sin(rad) * 10) / 10];
}

function buildWebPath(): string {
  const spokes = WEB_SPOKES.map((deg) => {
    const [x, y] = polar(WEB_RADIUS, deg);
    return `M0 0L${x} ${y}`;
  });
  const rings = WEB_RINGS.map((r) => {
    const points = WEB_SPOKES.map((deg) => polar(r, deg));
    const segments = points.slice(1).map((p, i) => {
      const [cx, cy] = polar(r * WEB_SAG, (WEB_SPOKES[i] + WEB_SPOKES[i + 1]) / 2);
      return `Q${cx} ${cy} ${p[0]} ${p[1]}`;
    });
    return `M${points[0][0]} ${points[0][1]}${segments.join('')}`;
  });
  return [...spokes, ...rings].join('');
}

/** Built once: the web is the same in every corner (mirrored by CSS). */
const WEB_PATH = buildWebPath();

function Cobweb({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <path d={WEB_PATH} stroke={C.web} strokeWidth={0.6} fill="none" opacity={0.75} />
    </svg>
  );
}

/** A little spider resting in the web. */
function Spider() {
  return (
    <svg viewBox="0 0 16 14" className={styles.spider}>
      <path d="M8 7L2 3M8 7L1 7M8 7L2 11M8 7L14 3M8 7L15 7M8 7L14 11" stroke={C.night} strokeWidth={1} strokeLinecap="round" />
      <ellipse cx={8} cy={8} rx={3} ry={3.6} fill={C.night} stroke={C.purple} strokeWidth={0.6} />
      <circle cx={7} cy={6.6} r={0.6} fill={C.brew} />
      <circle cx={9} cy={6.6} r={0.6} fill={C.brew} />
    </svg>
  );
}

/** Ground fog drifting behind every panel's content. */
export function HalloweenPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  return (
    <>
      <span className={styles.panelFog} />
      {variant === 'players' || variant === 'count' ? <span className={styles.moonlight} /> : null}
    </>
  );
}

/** Cobwebs in the top corners, a spider on the players list. */
export function HalloweenPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return null;
  return (
    <>
      <Cobweb className={styles.webLeft} />
      {variant === 'count' ? null : <Cobweb className={styles.webRight} />}
      {variant === 'players' ? <Spider /> : null}
    </>
  );
}

/** A small ghost floating over the add-bot row ("summon a spirit"). */
export function HalloweenAddBotDecor() {
  return (
    <>
      <span className={styles.mist} />
      <svg viewBox="0 0 14 16" className={styles.ghost}>
        <path d="M1 15V7Q1 1 7 1Q13 1 13 7V15L11 13.5L9 15L7 13.5L5 15L3 13.5Z" fill={C.ghost} stroke={C.ghostShade} strokeWidth={0.6} />
        <ellipse cx={5} cy={7} rx={1} ry={1.4} fill={C.night} />
        <ellipse cx={9} cy={7} rx={1} ry={1.4} fill={C.night} />
        <ellipse cx={7} cy={10.4} rx={1.2} ry={0.8} fill={C.night} />
      </svg>
    </>
  );
}

/** Rising bubbles as [left %, size px, delay s]. */
const BUBBLES: readonly (readonly [number, number, number])[] = [
  [14, 6, 0],
  [27, 4, 1.1],
  [41, 7, 0.5],
  [58, 5, 1.7],
  [72, 6, 0.9],
  [86, 4, 2.2],
];

/** An iron cauldron ring handle at one end of the button. */
function Handle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 12 20" className={className}>
      <path d="M10 3Q2 3 2 10Q2 17 10 17" stroke={C.ironLight} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M10 3Q2 3 2 10Q2 17 10 17" stroke={C.night} strokeWidth={0.6} fill="none" transform="translate(0.8 0)" />
    </svg>
  );
}

/** The start button as a bubbling witch's cauldron (cold and still while waiting). */
export function HalloweenStartDecor({ mode }: LobbyStartDecorProps) {
  const brewing = mode !== 'waiting';
  const bubbles = mode === 'ready' ? BUBBLES : BUBBLES.filter((_, i) => i % 2 === 0);
  return (
    <>
      <span className={styles.cauldronIron} />
      <span className={brewing ? styles.brew : styles.brewCold} />
      {brewing
        ? bubbles.map(([left, size, delay]) => (
            <span
              key={left}
              className={styles.bubble}
              style={{ left: `${left}%`, width: size, height: size, animationDelay: `${delay}s` }}
            />
          ))
        : null}
      {mode === 'guest' ? null : (
        <>
          <Handle className={styles.handleLeft} />
          <Handle className={styles.handleRight} />
        </>
      )}
    </>
  );
}
