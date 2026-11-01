'use client';

import { SeasonalCorner, SeasonalDivider, useActiveTheme } from '@/presentation/components/seasonal';

import { HEADER_CORNER_SIZE } from './account-surfaces';

/** Dark is the classic look of the account screens, so it stays free of ornaments. */
const UNADORNED_THEME = 'dark';

function useAdorned(): boolean {
  return useActiveTheme() !== UNADORNED_THEME;
}

/** Seasonal flourishes on two opposite corners of a header card (the card must be `relative`). */
export function HeaderCorners() {
  if (!useAdorned()) return null;
  return (
    <>
      <SeasonalCorner position="top-left" size={HEADER_CORNER_SIZE} />
      <SeasonalCorner position="bottom-right" size={HEADER_CORNER_SIZE} />
    </>
  );
}

/** Theme-emblem rule between page sections; nothing in the Dark theme. */
export function SectionDivider({ className = '' }: { className?: string }) {
  if (!useAdorned()) return null;
  return <SeasonalDivider className={className} />;
}
