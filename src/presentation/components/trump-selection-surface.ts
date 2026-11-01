const DEALER_BACKDROP_CLASS = 'absolute inset-0 bg-black/25 cursor-pointer';
const WAITING_BACKDROP_CLASS = 'absolute inset-0 bg-black/40 backdrop-blur-sm';
const DEALER_SHEET_BACKDROP_CLASS = 'absolute inset-0 bg-black/25';

interface TrumpSelectionBackdropParams {
  isDealer: boolean;
}

export function getTrumpSelectionBackdropClass({ isDealer }: TrumpSelectionBackdropParams): string {
  return isDealer ? DEALER_BACKDROP_CLASS : WAITING_BACKDROP_CLASS;
}

export function getTrumpSelectionSheetBackdropClass(): string {
  return DEALER_SHEET_BACKDROP_CLASS;
}
