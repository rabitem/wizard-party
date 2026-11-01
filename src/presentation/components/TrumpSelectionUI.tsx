'use client';

import { TrumpChoiceReason, type Suit } from '@shared/domain';
import { ChoiceDialog, ChoiceDialogBody, WaitingNotice } from './special-cards/ChoiceDialog';
import { SuitChoiceGrid } from './special-cards/SuitChoiceGrid';
import type { TrumpChoiceModel } from './special-cards/special-card-view-model';

interface TrumpSelectionUIProps {
  choice: TrumpChoiceModel;
  /** Null declares no trump (only offered when the choice allows it). */
  onSelectTrump: (suit: Suit | null) => void;
  isMobile?: boolean;
}

const HINTS: Record<TrumpChoiceReason, string> = {
  [TrumpChoiceReason.REVEALED_CARD]: 'A card of power was turned up! Declare the trump suit.',
  [TrumpChoiceReason.WEREWOLF]: 'Thy Werewolf seized the trump card! Name the trump suit - or banish trump entirely.',
};

function waitingMessage(choice: TrumpChoiceModel): string {
  return choice.reason === TrumpChoiceReason.WEREWOLF
    ? `${choice.chooserName}'s Werewolf seized the trump card and chooseth trump...`
    : `${choice.chooserName} chooseth the trump suit...`;
}

/**
 * Trump decision: the dealer after a Wizard (or similar) is turned up, or the
 * Werewolf holder after swapping for the trump card (who may declare no trump).
 */
export function TrumpSelectionUI({ choice, onSelectTrump, isMobile = false }: TrumpSelectionUIProps) {
  if (!choice.canChoose) {
    return <WaitingNotice message={waitingMessage(choice)} isMobile={isMobile} blocking />;
  }

  return (
    <ChoiceDialog
      sheetId="trump-selection"
      title="Choose Thy Trump"
      icon="ra-crystal-ball"
      isMobile={isMobile}
      dismiss={{ mode: 'hide', reopenLabel: 'Choose Trump' }}
    >
      <ChoiceDialogBody hint={HINTS[choice.reason]}>
        <SuitChoiceGrid
          onSelect={onSelectTrump}
          extraOption={choice.allowNoTrump
            ? { icon: 'ra-cancel', label: 'No Trump', onClick: () => onSelectTrump(null) }
            : undefined}
        />
      </ChoiceDialogBody>
    </ChoiceDialog>
  );
}
