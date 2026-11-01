'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type SheetId =
  | 'leaderboard'
  | 'emotes'
  | 'quickchat'
  | 'bidding'
  | 'roundend-controls'
  | 'trump-selection'
  | 'card-declaration'
  | 'special-effect'
  | null;

interface SheetContextType {
  activeSheet: SheetId;
  openSheet: (id: SheetId) => void;
  closeSheet: () => void;
  isSheetOpen: (id: SheetId) => boolean;
}

const SheetContext = createContext<SheetContextType | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<SheetId>(null);

  const openSheet = useCallback((id: SheetId) => {
    setActiveSheet(id);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const isSheetOpen = useCallback((id: SheetId) => {
    return activeSheet === id;
  }, [activeSheet]);

  const value = useMemo(() => ({
    activeSheet,
    openSheet,
    closeSheet,
    isSheetOpen,
  }), [activeSheet, openSheet, closeSheet, isSheetOpen]);

  return (
    <SheetContext.Provider value={value}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheet must be used within a SheetProvider');
  }
  return context;
}

/**
 * Hook for components that want to manage their own sheet state
 * Automatically closes other sheets when opening
 */
export function useSheetState(sheetId: Exclude<SheetId, null>) {
  const { activeSheet, openSheet, closeSheet } = useSheet();

  const isOpen = activeSheet === sheetId;

  const open = useCallback(() => {
    openSheet(sheetId);
  }, [openSheet, sheetId]);

  const close = useCallback(() => {
    if (activeSheet === sheetId) {
      closeSheet();
    }
  }, [activeSheet, sheetId, closeSheet]);

  const toggle = useCallback(() => {
    if (isOpen) {
      closeSheet();
    } else {
      openSheet(sheetId);
    }
  }, [isOpen, closeSheet, openSheet, sheetId]);

  return { isOpen, open, close, toggle };
}
