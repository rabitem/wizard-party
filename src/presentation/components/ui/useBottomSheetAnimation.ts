'use client';

import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import type { UseBottomSheetAnimationReturn } from './BottomSheet.types';

/**
 * Custom hook to manage BottomSheet animation logic
 * Handles drag gestures, opacity transitions, and body scroll locking
 */
export function useBottomSheetAnimation(
  isOpen: boolean,
  onClose: () => void
): UseBottomSheetAnimationReturn {
  const y = useMotionValue(0);

  // Guard against NaN values during mount/unmount transitions
  const opacity = useTransform(y, (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, 1 - value / 300));
  });

  // Handle drag end - close if dragged far enough
  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      animate(y, 500, { type: 'spring', damping: 30, stiffness: 300 });
      setTimeout(onClose, 150);
    } else {
      animate(y, 0, { type: 'spring', damping: 30, stiffness: 300 });
    }
  };

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Reset y position when opening
  useEffect(() => {
    if (isOpen) {
      y.set(0);
    }
  }, [isOpen, y]);

  return { y, opacity, handleDragEnd };
}
