'use client';

import { motion } from 'motion/react';
import type { BottomSheetBackdropProps } from './BottomSheet.types';

/**
 * Plain translucent dim: a backdrop-filter blur over the live WebGL canvas would re-blur the
 * whole screen every frame (and is skipped by older Safari without the -webkit- prefix).
 */
const DEFAULT_BACKDROP_CLASS = 'absolute inset-0 bg-black/60';

/**
 * Semi-transparent backdrop overlay for the BottomSheet
 * Clicking the backdrop closes the sheet
 */
export function BottomSheetBackdrop({ onClose, className = DEFAULT_BACKDROP_CLASS }: BottomSheetBackdropProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
  );
}
