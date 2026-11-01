'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { BottomSheet, useSheetState, type SheetId } from '../ui';
import {
  getTrumpSelectionBackdropClass,
  getTrumpSelectionSheetBackdropClass,
} from '../trump-selection-surface';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalEmblem } from '@/presentation/components/seasonal';

const PANEL_BACKGROUND = THEME_SURFACE.PANEL_BG;
const PANEL_SHADOW = THEME_SURFACE.POPOVER_SHADOW;
const SHEET_MAX_HEIGHT_PERCENT = 70;
const SERIF = { fontFamily: 'Georgia, serif' } as const;

/** Corner accents for dialog boxes */
export function CornerAccents() {
  return (
    <>
      <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-amber-600/40" />
      <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r border-amber-600/40" />
      <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l border-amber-600/40" />
      <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-amber-600/40" />
    </>
  );
}

/** Reopen button shown when a dismissible dialog was put away */
function ReopenButton({ label, icon, onReopen }: { label: string; icon: string; onReopen: () => void }) {
  return (
    <button
      onClick={onReopen}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 border-2 border-amber-600/60 hover:border-amber-500/80 transition-all cursor-pointer animate-pulse hover:animate-none"
      style={{ background: PANEL_BACKGROUND, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4), 0 0 20px color-mix(in srgb, var(--color-amber-800) 30%, transparent)' }}
    >
      <i className={`ra ${icon} text-amber-500`} />
      <span className="text-amber-200 text-sm font-medium" style={SERIF}>{label}</span>
    </button>
  );
}

export interface ChoiceDialogProps {
  sheetId: Exclude<SheetId, null>;
  title: string;
  /** rpg-awesome icon class, e.g. "ra-crystal-ball" */
  icon: string;
  isMobile: boolean;
  children: ReactNode;
  /**
   * What putting the dialog away does: "hide" keeps the decision pending behind a
   * reopen button, "cancel" calls onCancel (e.g. abandon a card play).
   */
  dismiss: { mode: 'hide'; reopenLabel: string } | { mode: 'cancel'; onCancel: () => void };
}

/**
 * Medieval choice dialog: centred on desktop, bottom sheet on mobile.
 */
export function ChoiceDialog({ sheetId, title, icon, isMobile, children, dismiss }: ChoiceDialogProps) {
  const { isOpen, open, close } = useSheetState(sheetId);
  const [isHidden, setIsHidden] = useState(false);

  // Auto-open the sheet while the decision is pending (unless put away)
  useEffect(() => {
    if (isMobile && !isOpen && !isHidden) open();
  }, [isMobile, isOpen, isHidden, open]);

  // Leaving the dialog (decision made elsewhere) frees the sheet slot for other sheets
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => () => closeRef.current(), []);

  const handleDismiss = () => {
    if (dismiss.mode === 'cancel') {
      dismiss.onCancel();
      return;
    }
    setIsHidden(true);
    if (isMobile) close();
  };

  if (dismiss.mode === 'hide' && isHidden && (!isMobile || !isOpen)) {
    return (
      <ReopenButton
        label={dismiss.reopenLabel}
        icon={icon}
        onReopen={() => {
          setIsHidden(false);
          if (isMobile) open();
        }}
      />
    );
  }

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleDismiss}
        title={title}
        maxHeight={SHEET_MAX_HEIGHT_PERCENT}
        backdropClassName={getTrumpSelectionSheetBackdropClass()}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={getTrumpSelectionBackdropClass({ isDealer: true })}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
        onClick={handleDismiss}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(); }}
      />
      <div
        role="dialog"
        aria-label={title}
        className="relative w-full max-w-lg mx-4 border-2 border-amber-700/50 shadow-2xl"
        style={{ background: PANEL_BACKGROUND, boxShadow: PANEL_SHADOW }}
      >
        <CornerAccents />
        <button
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1 hover:bg-amber-900/30 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5 text-amber-500/60 hover:text-amber-400" />
        </button>
        <div className="px-6 pt-5 pb-4 border-b border-amber-800/30">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/40" />
            <i className={`ra ${icon} text-amber-500 text-xl`} />
            <h2 className="text-lg text-amber-200 tracking-wide" style={SERIF}>{title}</h2>
            <i className={`ra ${icon} text-amber-500 text-xl`} />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/40" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Small "someone else is deciding" notice; a blocking overlay on desktop when `blocking`.
 */
export function WaitingNotice({ message, isMobile, blocking = false }: { message: string; isMobile: boolean; blocking?: boolean }) {
  const panel = (
    <div
      className="relative border-2 border-amber-700/50 px-4 py-2.5 sm:px-6 sm:py-4 shadow-2xl"
      style={{ background: PANEL_BACKGROUND, boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4), 0 0 15px color-mix(in srgb, var(--color-amber-800) 20%, transparent)' }}
    >
      <CornerAccents />
      <div className="flex items-center gap-2 sm:gap-3">
        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-500" />
        <span className="text-amber-200/90 text-xs sm:text-sm" style={SERIF}>{message}</span>
      </div>
    </div>
  );

  if (isMobile || !blocking) {
    return <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">{panel}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={getTrumpSelectionBackdropClass({ isDealer: false })} />
      {panel}
    </div>
  );
}

/** Body padding + hint line shared by every choice dialog */
export function ChoiceDialogBody({ hint, children }: { hint: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      <p className="text-center text-amber-400/70 mb-4 text-xs sm:text-sm" style={SERIF}>{hint}</p>
      {children}
      <div className="flex items-center justify-center gap-2 mt-4">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-700/30" />
        <SeasonalEmblem size={12} className="opacity-70" />
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
    </div>
  );
}
