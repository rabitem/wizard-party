'use client';

import type { BottomSheetHeaderProps } from './BottomSheet.types';

/**
 * Optional header section for the BottomSheet
 * Displays title and optional subtitle
 */
export function BottomSheetHeader({
  title,
  subtitle,
  showHandle = true,
}: BottomSheetHeaderProps) {
  return (
    <div
      className="px-5 pb-3 border-b border-amber-800/20"
      style={{ paddingTop: showHandle ? 0 : 16 }}
    >
      <h2
        className="text-lg text-amber-100/95 text-center"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h2>
      {subtitle ? <p
          className="text-amber-500/50 text-xs text-center mt-0.5"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {subtitle}
        </p> : null}
    </div>
  );
}
