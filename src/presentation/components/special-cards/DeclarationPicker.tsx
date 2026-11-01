'use client';

import {
  CardForm,
  CardType,
  DeclarationKind,
  getCardCatalogEntry,
  type ICard,
  type ICardDeclaration,
  type Suit,
} from '@shared/domain';
import { ChoiceDialog, ChoiceDialogBody } from './ChoiceDialog';
import { ChoiceButton, SuitChoiceGrid } from './SuitChoiceGrid';

export interface PendingDeclaration {
  card: ICard;
  kind: DeclarationKind;
  /** e.g. "Cloud" or "Vampire as Cloud" */
  label: string;
}

interface DeclarationPickerProps {
  pending: PendingDeclaration;
  trumpSuit: Suit | null;
  isMobile: boolean;
  onDeclare: (declaration: ICardDeclaration) => void;
  onCancel: () => void;
}

const FORM_COLORS: Record<CardForm, string> = {
  [CardForm.WIZARD]: '#a855f7',
  [CardForm.JESTER]: '#22c55e',
};

const FORM_CARD_TYPES: Record<CardForm, CardType> = {
  [CardForm.WIZARD]: CardType.WIZARD,
  [CardForm.JESTER]: CardType.JESTER,
};

const FORM_ICONS: Record<CardForm, string> = {
  [CardForm.WIZARD]: 'ra-crystal-wand',
  [CardForm.JESTER]: 'ra-aura',
};

/**
 * Announce the suit (Cloud, Juggler) or form (Shapeshifter) of a card being played.
 * Closing the dialog cancels the play.
 */
export function DeclarationPicker({ pending, trumpSuit, isMobile, onDeclare, onCancel }: DeclarationPickerProps) {
  const rank = getCardCatalogEntry(pending.card.type).rank;

  return (
    <ChoiceDialog
      sheetId="card-declaration"
      title={pending.kind === DeclarationKind.SUIT ? 'Announce a Suit' : 'Choose a Form'}
      icon="ra-scroll-unfurled"
      isMobile={isMobile}
      dismiss={{ mode: 'cancel', onCancel }}
    >
      <ChoiceDialogBody hint={`${pending.label} - ${rank}.`}>
        {pending.kind === DeclarationKind.SUIT ? (
          <SuitChoiceGrid trumpSuit={trumpSuit} onSelect={(suit) => onDeclare({ suit })} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[CardForm.WIZARD, CardForm.JESTER].map((form) => (
              <ChoiceButton
                key={form}
                color={FORM_COLORS[form]}
                icon={FORM_ICONS[form]}
                label={getCardCatalogEntry(FORM_CARD_TYPES[form]).name}
                detail={getCardCatalogEntry(FORM_CARD_TYPES[form]).rank}
                onClick={() => onDeclare({ form })}
              />
            ))}
          </div>
        )}
      </ChoiceDialogBody>
    </ChoiceDialog>
  );
}
