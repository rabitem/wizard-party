'use client';

import type { ReactNode } from 'react';
import type { LobbyCopyId, LobbyIconId } from './lobby-skin.types';
import { useLobbySkin } from './useLobbySkin';

interface LobbyIconProps {
  id: LobbyIconId;
  /** Classes for the skin's replacement icon (the fallback keeps its own). */
  className?: string;
  /** Today's icon, rendered unchanged when the active skin has no replacement. */
  children: ReactNode;
}

/** A lobby glyph: the active skin's icon for `id`, else the fallback children. */
export function LobbyIcon({ id, className = '', children }: LobbyIconProps) {
  const Icon = useLobbySkin().icons?.[id];
  if (!Icon) return children;
  return <Icon className={`relative ${className}`} />;
}

interface LobbyCopyProps {
  id: LobbyCopyId;
  /** The original label; stays the accessible name when the skin shows a flavour line. */
  children: string;
}

/**
 * A lobby label a skin may re-flavour. Without a skin (or without that line) it renders the
 * original text unchanged. With one, the flavour line is shown (aria-hidden) and the original is
 * kept for screen readers.
 */
export function LobbyCopy({ id, children }: LobbyCopyProps) {
  const flavour = useLobbySkin().copy?.[id];
  if (!flavour) return children;
  return (
    <>
      <span aria-hidden="true">{flavour}</span>
      <span className="sr-only">{children}</span>
    </>
  );
}
