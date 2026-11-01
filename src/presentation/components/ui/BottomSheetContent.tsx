'use client';

import type { CSSProperties } from 'react';
import type { BottomSheetContentProps, BottomSheetFooterProps } from './BottomSheet.types';

const CONTENT_END_PADDING = { '--sheet-end-padding': '0px' } as CSSProperties;
const FOOTER_END_PADDING = { '--sheet-end-padding': '0.75rem' } as CSSProperties;

/**
 * Scrollable content container for the BottomSheet: takes the height left between the header
 * and the footer, so the sheet never grows past its viewport-relative maximum.
 */
export function BottomSheetContent({ children, hasFooter }: BottomSheetContentProps) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${hasFooter ? '' : 'sheet-safe-bottom'}`}
      style={{ WebkitOverflowScrolling: 'touch', ...(hasFooter ? undefined : CONTENT_END_PADDING) }}
    >
      {children}
    </div>
  );
}

/** Sticky action area under the content; clears the home indicator via the safe area. */
export function BottomSheetFooter({ children }: BottomSheetFooterProps) {
  return (
    <div className="flex-shrink-0 px-4 pt-3 sheet-safe-bottom border-t border-amber-800/30" style={FOOTER_END_PADDING}>
      {children}
    </div>
  );
}
