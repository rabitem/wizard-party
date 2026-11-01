'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type PanInfo, useDragControls } from 'motion/react';
import { X } from 'lucide-react';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';
import { ScrollIndicator } from '../ui';
import { getSettingsBackdropClass, getSettingsOverlayRootClass, getSettingsPanelClass } from './settings-panel-feedback';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  /** Off in game, where Escape is the shortcut that toggles the settings panel. */
  closeOnEscape?: boolean;
  /** Drawn above the scrolling content (e.g. the feedback burst). */
  overlay?: ReactNode;
  children: ReactNode;
}

function DrawerHeader({ title, subtitle, icon, titleId, onClose }: { title: string; subtitle?: string; icon: ReactNode; titleId: string; onClose: () => void }) {
  return (
    <div className="sticky top-0 border-b-2 border-amber-700/30 px-4 sm:px-6 py-4 sm:py-5 z-10" style={{ background: THEME_SURFACE.HEADER_BG, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <SeasonalCorner position="top-left" size={28} className="hidden md:block" />
      <div className="hidden md:block absolute top-2 right-12 opacity-70"><SeasonalEmblem size={14} /></div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-amber-500/70 flex-shrink-0" aria-hidden>{icon}</span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg sm:text-xl text-amber-200/90 tracking-wide font-serif">{title}</h2>
            {subtitle ? <p className="text-xs text-amber-600/70 font-serif">{subtitle}</p> : null}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} className="relative p-2 transition-all cursor-pointer group flex-shrink-0" style={{ background: THEME_SURFACE.CONTROL_BG }}>
          <div className="absolute inset-0 rounded border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
          <X className="w-5 h-5 text-amber-500/70 group-hover:text-amber-400 relative" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-amber-700/20" />
        <SeasonalEmblem size={12} className="opacity-70" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/30 to-amber-700/20" />
      </div>
    </div>
  );
}

function MobileDragHandle({ isMobile, dragControls }: { isMobile: boolean; dragControls: ReturnType<typeof useDragControls> }) {
  return (
    <div className="md:hidden flex justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => isMobile && dragControls.start(e)}>
      <div className="w-10 h-1 rounded-full bg-amber-600/40" />
    </div>
  );
}

function PanelBackground() {
  return (<>
    <div className="absolute inset-0" style={{ background: THEME_SURFACE.PANEL_BG }} />
    <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-700/40 via-amber-600/30 to-amber-700/40" />
    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />
  </>);
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
}

/**
 * The frame both settings surfaces share: a panel sliding in from the right on desktop, a
 * bottom sheet that can be dragged down on phones. The in-game Settings and Preferences use it.
 */
export function SettingsDrawer({ isOpen, onClose, title, subtitle, icon, closeOnEscape = false, overlay, children }: SettingsDrawerProps) {
  const isMobile = useIsMobile();
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeOnEscape, isOpen, onClose]);

  const y = useMotionValue(0);
  const opacity = useTransform(y, (v) => typeof v !== 'number' || !Number.isFinite(v) ? 1 : Math.max(0, Math.min(1, 1 - v / 300)));
  const dragControls = useDragControls();

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) { animate(y, 500, { type: 'spring', damping: 30, stiffness: 300 }); setTimeout(onClose, 200); }
    else animate(y, 0, { type: 'spring', damping: 30, stiffness: 300 });
  };

  return (
    <AnimatePresence>
      {isOpen ? <motion.div
        key="settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={getSettingsOverlayRootClass()}
      >
        <motion.div key="settings-backdrop" onClick={onClose} className={getSettingsBackdropClass()} />
        <motion.div role="dialog" aria-modal="true" aria-labelledby={titleId}
          initial={isMobile ? { y: '100%' } : { opacity: 0, x: 300 }} animate={isMobile ? { y: 0 } : { opacity: 1, x: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, x: 300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={isMobile ? { y, opacity } : undefined} drag={isMobile ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={isMobile ? handleDragEnd : undefined} dragListener={false} dragControls={dragControls}
          onClick={(event) => event.stopPropagation()} className={getSettingsPanelClass(isMobile)}>
          <PanelBackground />
          <div className="relative h-full flex flex-col">
            {overlay}
            <MobileDragHandle isMobile={isMobile} dragControls={dragControls} />
            <DrawerHeader title={title} subtitle={subtitle} icon={icon} titleId={titleId} onClose={onClose} />
            <ScrollIndicator className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6" maxHeight={isMobile ? 'calc(90vh - 120px)' : 'calc(100vh - 140px)'}>
              {children}
              <div className="flex justify-center pt-4 pb-2"><SeasonalEmblem size={14} className="opacity-70" /></div>
              <div className="h-6 md:h-0" />
            </ScrollIndicator>
          </div>
        </motion.div>
      </motion.div> : null}
    </AnimatePresence>
  );
}
