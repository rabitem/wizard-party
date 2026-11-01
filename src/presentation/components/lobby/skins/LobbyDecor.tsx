'use client';

import type { LobbyPanelVariant, LobbySeatDecorProps, LobbyStartMode } from './lobby-skin.types';
import { useLobbySkin } from './useLobbySkin';

/** Shared wrapper: decorative, click-through, fills the host and follows its radius. */
const DECOR_ROOT_CLASS = 'pointer-events-none absolute inset-0 rounded-[inherit]';

/**
 * Header vignette box: bleeds to the page gutters (px-4 / sm:px-6) and from the top padding
 * (py-6 / sm:py-10) to just below the header, behind the header content (-z-10).
 */
const SCENE_ROOT_CLASS =
  'pointer-events-none absolute -z-10 left-1/2 -translate-x-1/2 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] -top-6 sm:-top-10 -bottom-5 sm:-bottom-6 overflow-hidden';

/** Fades the vignette into the page at its bottom edge and a little at the sides. */
const SCENE_FADE_STYLE = {
  maskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)',
} as const;

/** Dark halo behind the title + room code so they stay readable over any scene. */
const SCENE_SCRIM_STYLE = {
  background: 'radial-gradient(ellipse 34% 42% at 50% 58%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 55%, transparent 100%)',
} as const;

/**
 * The skin's header vignette. Place it inside the header, which must be `relative isolate`.
 * Renders nothing without a skin.
 */
export function LobbyScene() {
  const { Scene } = useLobbySkin();
  if (!Scene) return null;
  return (
    <div aria-hidden="true" className={SCENE_ROOT_CLASS} style={SCENE_FADE_STYLE}>
      <div className="absolute inset-0">
        <Scene />
      </div>
      <div className="absolute inset-0" style={SCENE_SCRIM_STYLE} />
    </div>
  );
}

/**
 * Pattern/texture inside a panel, clipped to it, behind its content. Place it as the first
 * child of the panel, which must be `relative isolate` (overflow-hidden is fine).
 */
export function LobbyPanelBackdrop({ variant }: { variant: LobbyPanelVariant }) {
  const { PanelBackdrop } = useLobbySkin();
  if (!PanelBackdrop) return null;
  return (
    <span aria-hidden="true" className={`${DECOR_ROOT_CLASS} overflow-hidden`}>
      <PanelBackdrop variant={variant} />
    </span>
  );
}

/**
 * Edge ornaments on top of a panel. Place it after the panel inside a `relative` box of the same
 * size that does NOT clip, so ornaments may overhang.
 */
export function LobbyPanelDecor({ variant }: { variant: LobbyPanelVariant }) {
  const { PanelDecor } = useLobbySkin();
  if (!PanelDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <PanelDecor variant={variant} />
    </span>
  );
}

/** Ornament around a seated player's avatar; first child of the `relative` avatar box. */
export function LobbyAvatarFrame(props: LobbySeatDecorProps) {
  const { AvatarFrameDecor } = useLobbySkin();
  if (!AvatarFrameDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <AvatarFrameDecor {...props} />
    </span>
  );
}

/** Decor for the host's add-bot row; first child of the `relative isolate` row. */
export function LobbyAddBotDecor() {
  const { AddBotDecor } = useLobbySkin();
  if (!AddBotDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <AddBotDecor />
    </span>
  );
}

/** Decor for the start button / guest waiting box; first child of the `relative isolate` host. */
export function LobbyStartButtonDecor({ mode }: { mode: LobbyStartMode }) {
  const { StartButtonDecor } = useLobbySkin();
  if (!StartButtonDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <StartButtonDecor mode={mode} />
    </span>
  );
}
