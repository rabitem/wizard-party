'use client';

import { useEffect, useId } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { LobbyPanelBackdrop, LobbyPanelDecor } from '../skins/LobbyDecor';
import type { LobbyPanelVariant } from '../skins/lobby-skin.types';

interface LobbySheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Which theme-skin panel decor this sheet gets (seat actions by default). */
  skinVariant?: LobbyPanelVariant;
}

/**
 * Bottom sheet on phones, centered dialog from `sm` up. Painted with the theme's surface tokens so
 * every UI theme gets a matching panel. Mount it inside <AnimatePresence> for the exit animation.
 */
export function LobbySheet({ title, subtitle, onClose, children, footer, skinVariant = 'players' }: LobbySheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 cursor-default" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative isolate w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)', boxShadow: '0 -10px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        <LobbyPanelBackdrop variant={skinVariant} />
        <LobbyPanelDecor variant={skinVariant} />
        <div className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-amber-700/50 sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-2">
          <div className="min-w-0">
            <h2 id={titleId} className="text-amber-100 text-lg font-serif">{title}</h2>
            {subtitle ? <p className="text-amber-500/80 text-xs mt-0.5 font-serif">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-amber-500/70 hover:text-amber-200 hover:bg-amber-900/30 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="px-5 pb-5 pt-3 border-t border-amber-800/30">{footer}</div> : null}
      </motion.div>
    </motion.div>
  );
}
