'use client';

import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { BottomSheetProps } from './BottomSheet.types';
import { useBottomSheetAnimation } from './useBottomSheetAnimation';
import { BottomSheetBackdrop } from './BottomSheetBackdrop';
import { BottomSheetHandle, BottomSheetEdgeHighlight } from './BottomSheetHandle';
import { BottomSheetHeader } from './BottomSheetHeader';
import { BottomSheetContent, BottomSheetFooter } from './BottomSheetContent';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/**
 * A draggable bottom sheet modal component
 * Supports drag-to-close gesture, a customizable header and a sticky footer for the main action.
 * Its height follows the visible viewport (dvh), so mobile browser toolbars never hide the footer.
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  showHandle = true,
  maxHeight = 85,
  backdropClassName,
  footer,
}: BottomSheetProps) {
  const { y, opacity, handleDragEnd } = useBottomSheetAnimation(isOpen, onClose);
  const hasFooter = footer !== undefined && footer !== null;
  const heightStyle = { '--sheet-max-height': String(maxHeight) } as CSSProperties;

  return (
    <AnimatePresence>
      {isOpen ? <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <BottomSheetBackdrop onClose={onClose} className={backdropClassName} />

          {/* Sheet */}
          <motion.div
            className="relative w-full overflow-hidden"
            style={{
              y,
              opacity,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              background:
                THEME_SURFACE.PANEL_BG,
              boxShadow:
                '0 -10px 50px rgba(0,0,0,0.5), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 15%, transparent)',
            }}
            initial={{ translateY: '100%' }}
            animate={{ translateY: 0 }}
            exit={{ translateY: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            <BottomSheetEdgeHighlight />
            <div className="sheet-max-height sheet-safe-x flex flex-col" style={heightStyle}>
              <BottomSheetHandle visible={showHandle} />

              {title ? <BottomSheetHeader
                  title={title}
                  subtitle={subtitle}
                  showHandle={showHandle}
                /> : null}

              <BottomSheetContent hasFooter={hasFooter}>
                {children}
              </BottomSheetContent>

              {hasFooter ? <BottomSheetFooter>{footer}</BottomSheetFooter> : null}
            </div>
          </motion.div>
        </motion.div> : null}
    </AnimatePresence>
  );
}
