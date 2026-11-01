'use client';

import { Minus, Plus, Ban } from 'lucide-react';
import { HudButtonDecor, HudIcon, useHudClassName } from '../hud/skins';
import { stepBid } from './bid-rules';
import { BidChipRow } from './BidChipRow';
import { PlaceBidButton } from './PlaceBidButton';

/** Shared look of the -/+ step buttons (`group relative` hosts the skin's button decor). */
const BID_STEP_BUTTON_CLASS = 'group relative hud-tap-target w-9 h-9 flex-shrink-0 rounded-xl border border-amber-700/40 bg-black/30 text-amber-400 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:border-amber-600/50 transition-all';

/**
 * 'inline': stepper, chips and Place Bid in one wrapping row (bidding panel);
 * 'row': chips and Place Bid on one line without the stepper (compact panel on landscape phones);
 * 'stacked': stepper above the chips (bidding sheet).
 */
export type BidSelectorLayout = 'inline' | 'row' | 'stacked';

const LAYOUT_CLASSES = {
  // Inline chips stop growing at about eleven chips (rounds 1-10 fit); later rounds scroll.
  // The row wraps Place Bid onto a second line when the prompt column is too narrow for one
  // line (tablets and phones with a turn timer), instead of clipping it at the panel edge.
  inline: { root: 'flex flex-wrap items-center gap-3 min-w-0', value: 'w-12 h-12 text-2xl', stepper: 'gap-2', chips: 'max-w-[26rem]' },
  // One line, one tap-target tall: the chips are the picker (no stepper) and scroll beside the
  // inline Place Bid, so the panel stays clear of the far seats on a 340px-tall screen.
  row: { root: 'flex flex-nowrap items-center gap-2 min-w-0', value: '', stepper: '', chips: '' },
  stacked: { root: 'flex flex-col gap-3 min-w-0', value: 'w-16 h-16 text-3xl', stepper: 'justify-center gap-4', chips: '' },
} as const satisfies Record<BidSelectorLayout, Record<string, string>>;

interface BidSelectorProps {
  selectedBid: number;
  maxBid: number;
  forbiddenBid: number | null;
  onBidChange: (bid: number) => void;
  layout: BidSelectorLayout;
  /** Renders the Place Bid button inline; omit when the surface has its own (sheet footer) */
  onPlaceBid?: (bid: number) => void;
  /** Short Place Bid label (compact panel on landscape phones) */
  compact?: boolean;
}

function StepButton({ direction, disabled, onClick }: { direction: 1 | -1; disabled: boolean; onClick: () => void }) {
  const skinClass = useHudClassName('button');
  const isUp = direction === 1;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isUp ? 'Raise bid' : 'Lower bid'}
      className={`${BID_STEP_BUTTON_CLASS} ${skinClass}`}
    >
      <HudButtonDecor variant="bid" />
      <HudIcon id={isUp ? 'bid-plus' : 'bid-minus'} fallback={isUp ? Plus : Minus} className="w-5 h-5" />
    </button>
  );
}

interface BidStepperProps {
  selectedBid: number;
  range: { maxBid: number; forbiddenBid: number | null };
  valueClass: string;
  stepperClass: string;
  onBidChange: (bid: number) => void;
}

/** -/+ buttons around the selected bid; a step skips the forbidden bid. */
function BidStepper({ selectedBid, range, valueClass, stepperClass, onBidChange }: BidStepperProps) {
  const lower = stepBid(selectedBid, -1, range);
  const higher = stepBid(selectedBid, 1, range);
  return (
    <div className={`flex flex-shrink-0 items-center ${stepperClass}`}>
      <StepButton direction={-1} disabled={lower === null} onClick={() => lower !== null && onBidChange(lower)} />
      <div
        className={`${valueClass} flex-shrink-0 rounded-xl flex items-center justify-center border border-amber-600/40 font-bold text-amber-200`}
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 20%, transparent) 100%)', fontFamily: 'var(--font-serif)' }}
        aria-live="polite"
      >
        {selectedBid}
      </div>
      <StepButton direction={1} disabled={higher === null} onClick={() => higher !== null && onBidChange(higher)} />
    </div>
  );
}

function ForbiddenBidNotice({ forbiddenBid, centered }: { forbiddenBid: number | null; centered: boolean }) {
  if (forbiddenBid === null) return null;
  return (
    <div className={`flex items-center gap-1.5 text-[11px] text-red-400/80 ${centered ? 'justify-center' : ''}`}>
      <Ban className="w-3 h-3 flex-shrink-0" />
      <span className="whitespace-nowrap">Bid <span className="font-bold">{forbiddenBid}</span> forbidden</span>
    </div>
  );
}

/**
 * Bid selection shared by every bidding surface: a -/+ stepper that skips the forbidden bid,
 * one-tap chips for every bid of the round, and (optionally) the Place Bid button.
 * Controls reach 44px on coarse pointers through the HUD tap-target variable.
 */
export function BidSelector({ selectedBid, maxBid, forbiddenBid, onBidChange, layout, onPlaceBid, compact = false }: BidSelectorProps) {
  const classes = LAYOUT_CLASSES[layout];
  const range = { maxBid, forbiddenBid };
  // The one-line row drops the stepper and the notice: the chips pick, the forbidden chip shows it
  const isRow = layout === 'row';

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className={classes.root}>
        {isRow ? null : <BidStepper selectedBid={selectedBid} range={range} valueClass={classes.value} stepperClass={classes.stepper} onBidChange={onBidChange} />}

        <div className={`min-w-0 flex-1 ${classes.chips}`}>
          <BidChipRow selectedBid={selectedBid} maxBid={maxBid} forbiddenBid={forbiddenBid} onBidChange={onBidChange} />
        </div>

        {onPlaceBid ? (
          <PlaceBidButton selectedBid={selectedBid} maxBid={maxBid} forbiddenBid={forbiddenBid} onPlaceBid={onPlaceBid} compact={compact} />
        ) : null}
      </div>
      {isRow ? null : <ForbiddenBidNotice forbiddenBid={forbiddenBid} centered={layout === 'stacked'} />}
    </div>
  );
}
