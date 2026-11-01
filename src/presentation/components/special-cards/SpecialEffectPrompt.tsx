'use client';

import { useState } from 'react';
import { CardType, TrickEffectKind, getCardCatalogEntry, type ICard, type TrickEffectResponse } from '@shared/domain';
import { MiniCard } from '../bidding/MiniCard';
import { ChoiceDialog, ChoiceDialogBody, WaitingNotice } from './ChoiceDialog';
import { ChoiceButton } from './SuitChoiceGrid';
import type { EffectPromptModel } from './special-card-view-model';

const RAISE_COLOR = '#f59e0b';
const LOWER_COLOR = '#38bdf8';

interface SpecialEffectPromptProps {
  model: EffectPromptModel;
  isMobile: boolean;
  onRespond: (response: TrickEffectResponse) => void;
}

/** A row of selectable mini cards */
function CardPicker({
  cards,
  selectedId,
  onSelect,
  label,
}: {
  cards: ICard[];
  selectedId: string | null;
  onSelect: (cardId: string) => void;
  label: string;
}) {
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-widest text-amber-500/70 mb-1.5 text-center font-serif">{label}</div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onSelect(card.id)}
            aria-pressed={selectedId === card.id}
            aria-label={card.type === CardType.NUMBER ? `${card.suit} ${card.value}` : getCardCatalogEntry(card.type).name}
            className={`cursor-pointer transition-transform hover:-translate-y-0.5 ${selectedId === card.id ? 'ring-2 ring-amber-400 -translate-y-1' : ''}`}
          >
            <MiniCard card={card} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return (
    <div className="flex justify-center">
      <button
        disabled={disabled}
        onClick={onClick}
        className="px-5 py-2 border-2 border-amber-600/60 text-amber-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:border-amber-500"
        style={{ fontFamily: 'var(--font-serif)', background: 'linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface), black 12%) 100%)' }}
      >
        {children}
      </button>
    </div>
  );
}

function PassLeftPrompt({ model, isMobile, onRespond }: SpecialEffectPromptProps & { model: Extract<EffectPromptModel, { mode: TrickEffectKind.PASS_LEFT }> }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ChoiceDialog sheetId="special-effect" title="The Juggler" icon="ra-ball" isMobile={isMobile} dismiss={{ mode: 'hide', reopenLabel: 'Pass a Card' }}>
      <ChoiceDialogBody hint={`Every apprentice passes one card to the left. Choose the card for ${model.recipientName}.`}>
        <CardPicker cards={model.hand} selectedId={selected} onSelect={setSelected} label="Your hand" />
        <ConfirmButton disabled={!selected} onClick={() => selected && onRespond({ kind: TrickEffectKind.PASS_LEFT, cardId: selected })}>
          Pass Card
        </ConfirmButton>
      </ChoiceDialogBody>
    </ChoiceDialog>
  );
}

function AdjustBidPrompt({ model, isMobile, onRespond }: SpecialEffectPromptProps & { model: Extract<EffectPromptModel, { mode: TrickEffectKind.ADJUST_BID }> }) {
  const respond = (delta: 1 | -1) => onRespond({ kind: TrickEffectKind.ADJUST_BID, delta });
  return (
    <ChoiceDialog sheetId="special-effect" title="The Cloud" icon="ra-poison-cloud" isMobile={isMobile} dismiss={{ mode: 'hide', reopenLabel: 'Change Bid' }}>
      <ChoiceDialogBody hint={`Thou hast won the Cloud's trick (${model.tricksWon} won so far). Thy bid of ${model.currentBid} must change by one.`}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <ChoiceButton color={RAISE_COLOR} icon="ra-muscle-up" label={`Raise to ${model.currentBid + 1}`} onClick={() => respond(1)} />
          {model.canLower ? (
            <ChoiceButton color={LOWER_COLOR} icon="ra-fall-down" label={`Lower to ${model.currentBid - 1}`} onClick={() => respond(-1)} />
          ) : null}
        </div>
      </ChoiceDialogBody>
    </ChoiceDialog>
  );
}

function SwapWithTrickPrompt({ model, isMobile, onRespond }: SpecialEffectPromptProps & { model: Extract<EffectPromptModel, { mode: TrickEffectKind.SWAP_WITH_TRICK }> }) {
  const [handCardId, setHandCardId] = useState<string | null>(null);
  const [trickCardId, setTrickCardId] = useState<string | null>(null);
  return (
    <ChoiceDialog sheetId="special-effect" title="The Witch" icon="ra-bubbling-potion" isMobile={isMobile} dismiss={{ mode: 'hide', reopenLabel: 'Witch Swap' }}>
      <ChoiceDialogBody hint="Lay one of thy cards into the trick and take any other card from it.">
        <CardPicker cards={model.pile} selectedId={trickCardId} onSelect={setTrickCardId} label="Take from the trick" />
        <CardPicker cards={model.hand} selectedId={handCardId} onSelect={setHandCardId} label="Give from your hand" />
        <ConfirmButton
          disabled={!handCardId || !trickCardId}
          onClick={() => handCardId && trickCardId && onRespond({ kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId, trickCardId })}
        >
          Swap Cards
        </ConfirmButton>
      </ChoiceDialogBody>
    </ChoiceDialog>
  );
}

/**
 * Whatever the pending special-card effect asks of the local player, or a waiting
 * notice while others decide.
 */
export function SpecialEffectPrompt(props: SpecialEffectPromptProps) {
  const { model, isMobile } = props;
  switch (model.mode) {
    case 'NONE':
      return null;
    case 'WAITING':
      return <WaitingNotice message={model.message} isMobile={isMobile} />;
    case TrickEffectKind.PASS_LEFT:
      return <PassLeftPrompt {...props} model={model} />;
    case TrickEffectKind.ADJUST_BID:
      return <AdjustBidPrompt {...props} model={model} />;
    case TrickEffectKind.SWAP_WITH_TRICK:
      return <SwapWithTrickPrompt {...props} model={model} />;
    default:
      return null;
  }
}
