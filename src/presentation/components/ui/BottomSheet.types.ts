'use client';

import type { ReactNode } from 'react';
import type { MotionValue, PanInfo } from 'motion/react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional title for the sheet header */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Whether to show the drag handle (default: true) */
  showHandle?: boolean;
  /** Max height as percentage of the visible viewport (dvh, vh fallback; default: 85) */
  maxHeight?: number;
  /** Optional backdrop class override for surfaces that need different background readability */
  backdropClassName?: string;
  /** Sticky action area under the scrolling content (e.g. the primary button); always visible */
  footer?: ReactNode;
}

export interface BottomSheetBackdropProps {
  onClose: () => void;
  className?: string;
}

export interface BottomSheetHandleProps {
  visible?: boolean;
}

export interface BottomSheetHeaderProps {
  /** Id of the title element; the sheet's dialog role is labelled by it. */
  titleId?: string;
  title: string;
  subtitle?: string;
  showHandle?: boolean;
}

export interface BottomSheetContentProps {
  children: ReactNode;
  /** Without a footer the content itself clears the bottom safe area */
  hasFooter: boolean;
}

export interface BottomSheetFooterProps {
  children: ReactNode;
}

export interface UseBottomSheetAnimationReturn {
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  handleDragEnd: (event: never, info: PanInfo) => void;
}
