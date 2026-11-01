'use client';

import { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner } from '@/presentation/components/seasonal';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  /** If true, allows the modal to be scrollable and expand to fit content on mobile */
  allowScroll?: boolean;
}

export function Modal({ children, onClose, allowScroll = true }: ModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  // Guard against NaN values during mount/unmount transitions
  const opacity = useTransform(y, (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, 1 - value / 300));
  });
  const scale = useTransform(y, (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.max(0.9, Math.min(1, 1 - value / 3000));
  });

  // Handle drag end - close if dragged far enough
  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      // Animate out and close
      animate(y, 500, { type: 'spring', damping: 30, stiffness: 300 });
      setTimeout(onClose, 200);
    } else {
      // Snap back
      animate(y, 0, { type: 'spring', damping: 30, stiffness: 300 });
    }
  };

  // Lock body scroll on mobile when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full md:w-[400px] md:mx-auto">
        {/* Outer glow - hidden on mobile for cleaner look */}
        <div className="hidden md:block absolute -inset-3 bg-amber-900/30 rounded-2xl blur-2xl" />

        <motion.div
          ref={sheetRef}
          className="relative rounded-t-2xl md:rounded-xl border-2 border-amber-700/50 shadow-2xl w-full overflow-hidden"
          style={{
            background: THEME_SURFACE.PANEL_BG,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 10%, transparent)',
            y,
            opacity,
            scale,
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
        >
          {/* Drag handle - visible only on mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-amber-600/40" />
          </div>

          {/* Corner flourishes */}
          <SeasonalCorner position="top-left" size={28} className="hidden md:block" />
          <SeasonalCorner position="top-right" size={28} className="hidden md:block" />
          <SeasonalCorner position="bottom-left" size={28} className="hidden md:block" />
          <SeasonalCorner position="bottom-right" size={28} className="hidden md:block" />

          {/* Scrollable content wrapper */}
          <div
            className={`${allowScroll ? 'max-h-[85vh] md:max-h-[80vh] overflow-y-auto overscroll-contain' : ''}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
