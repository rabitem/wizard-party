'use client';

import { UserRound } from 'lucide-react';
import type { CharacterAppearance } from '@shared/domain/character';

import { CharacterPortrait } from './CharacterPortrait';

interface CharacterFaceProps {
  /** null: a silhouette, for guests and players whose look is unknown. */
  appearance: CharacterAppearance | null;
  label: string;
  /** Sizes the face; it fills the box it is given. */
  className?: string;
}

/** A character's portrait, or a silhouette of the same size, for avatars and standings. */
export function CharacterFace({ appearance, label, className = 'w-full h-full' }: CharacterFaceProps) {
  if (appearance) return <CharacterPortrait appearance={appearance} label={label} className={`${className} object-cover`} />;
  return (
    <span role="img" aria-label={label} className={`${className} inline-flex items-center justify-center text-amber-200/45`}>
      <UserRound className="w-[60%] h-[60%]" aria-hidden />
    </span>
  );
}
