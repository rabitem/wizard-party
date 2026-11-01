'use client';

import { useEffect, useState } from 'react';
import type { CharacterAppearance } from '@shared/domain/character';

import { portraitKey, renderCharacterPortrait } from './character-portrait-renderer';

interface CharacterPortraitProps {
  appearance: CharacterAppearance;
  /** Accessible name, e.g. the player's name. */
  label: string;
  className?: string;
}

/**
 * A character's head and shoulders as an image, rendered in the browser on first use and cached
 * per look. Shows an empty circle of the same size until the render is ready or when WebGL is
 * missing, so lists never jump.
 */
export function CharacterPortrait({ appearance, label, className = 'w-16 h-16' }: CharacterPortraitProps) {
  const key = portraitKey(appearance);
  const [rendered, setRendered] = useState<{ key: string; src: string } | null>(null);

  useEffect(() => {
    let active = true;
    renderCharacterPortrait(appearance).then(
      (src) => { if (active) setRendered({ key, src }); },
      () => undefined
    );
    return () => {
      active = false;
    };
    // The key covers every part of the appearance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const src = rendered?.key === key ? rendered.src : null;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a data URL rendered in the browser
    <img src={src} alt={label} className={`${className} object-contain`} draggable={false} />
  ) : (
    <span role="img" aria-label={label} className={`${className} inline-block rounded-full bg-black/20`} />
  );
}
