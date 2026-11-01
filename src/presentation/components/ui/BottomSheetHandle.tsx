'use client';

import type { BottomSheetHandleProps } from './BottomSheet.types';

/**
 * Drag handle indicator at the top of the BottomSheet
 * Visual cue that the sheet is draggable
 */
export function BottomSheetHandle({ visible = true }: BottomSheetHandleProps) {
  if (!visible) return null;

  return (
    <div className="flex justify-center pt-3 pb-2">
      <div
        className="w-9 h-1 rounded-full"
        style={{ background: 'color-mix(in srgb, var(--accent-deep) 30%, transparent)' }}
      />
    </div>
  );
}

/**
 * Top edge highlight decoration for the BottomSheet
 */
export function BottomSheetEdgeHighlight() {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[1px]"
      style={{
        background:
          'linear-gradient(90deg, transparent 10%, color-mix(in srgb, var(--accent-deep) 30%, transparent) 50%, transparent 90%)',
      }}
    />
  );
}
