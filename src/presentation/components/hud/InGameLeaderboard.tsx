'use client';

import { useEffect, useRef } from 'react';
import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import { useSheetState, BottomSheet } from '../ui';
import {
  InGameLeaderboardProps,
  useLeaderboardEntries,
  MobilePodiumContent,
} from './leaderboard';
import { LeaderboardPanel } from './leaderboard/LeaderboardPanel';
import { getStandingsDockRegion } from './leaderboard/leaderboard-dock';
import { HudSlot } from './layout';
import { HudPanelDecor } from './skins';

type SheetProps = Pick<InGameLeaderboardProps, 'localPlayerId' | 'currentRound' | 'currentPlayerIndex' | 'isOpen' | 'onClose'> & {
  entries: ReturnType<typeof useLeaderboardEntries>;
};

/** Phone HUD: standings in a bottom sheet, kept in sync with the shared sheet context. */
function StandingsSheet({ entries, localPlayerId, currentRound, currentPlayerIndex, isOpen, onClose }: SheetProps) {
  const { isOpen: isSheetActive, open: openSheet, close: closeSheet } = useSheetState('leaderboard');
  const wasSheetActive = useRef(isSheetActive);

  // Sync external isOpen with the sheet context
  useEffect(() => {
    if (isOpen && !isSheetActive) {
      openSheet();
    } else if (!isOpen && isSheetActive) {
      closeSheet();
    }
  }, [isOpen, isSheetActive, openSheet, closeSheet]);

  // When another sheet takes over, notify parent to close
  useEffect(() => {
    if (wasSheetActive.current && !isSheetActive && isOpen) {
      onClose();
    }
    wasSheetActive.current = isSheetActive;
  }, [isSheetActive, isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <BottomSheet
      isOpen={isSheetActive}
      onClose={() => {
        closeSheet();
        onClose();
      }}
      title="Standings"
      maxHeight={55}
    >
      <div className="relative isolate">
        <HudPanelDecor variant="standings" contained />
        <MobilePodiumContent
          entries={entries}
          localPlayerId={localPlayerId}
          currentPlayerIndex={currentPlayerIndex}
          currentRound={currentRound}
        />
      </div>
    </BottomSheet>
  );
}

/**
 * Medieval-styled in-game standings. The layout policy picks the mode: a sheet on the phone HUD,
 * a panel docked in a HUD region when it fits beside the table, else a top-bar popover.
 */
export function InGameLeaderboard({
  players,
  localPlayerId,
  currentRound,
  currentPlayerIndex,
  isOpen,
  onClose,
  mode,
  position = 'right',
  compact = false,
}: InGameLeaderboardProps) {
  const entries = useLeaderboardEntries(players);

  if (mode === 'sheet') {
    return (
      <StandingsSheet
        entries={entries}
        localPlayerId={localPlayerId}
        currentRound={currentRound}
        currentPlayerIndex={currentPlayerIndex}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  // Popover from the top-bar trophy button: only while explicitly opened
  if (mode === 'popover' || position === 'hidden') {
    if (!isOpen) return null;
    return (
      <div className="absolute top-full right-0 mt-3 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
        <LeaderboardPanel
          entries={entries}
          localPlayerId={localPlayerId}
          currentPlayerIndex={currentPlayerIndex}
          currentRound={currentRound}
          compact={compact}
          onClose={onClose}
          showCloseButton
          position="hidden"
        />
      </div>
    );
  }

  return (
    <HudSlot
      region={getStandingsDockRegion(position)}
      order={position === 'bottom' ? HUD_SLOT_ORDER.bottom.standings : HUD_SLOT_ORDER.dock.standings}
    >
      <div className="flex min-h-0 max-w-full flex-col">
        <LeaderboardPanel
          entries={entries}
          localPlayerId={localPlayerId}
          currentPlayerIndex={currentPlayerIndex}
          currentRound={currentRound}
          compact={compact}
          horizontal={position === 'bottom'}
          position={position}
        />
      </div>
    </HudSlot>
  );
}
