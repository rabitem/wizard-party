export const NAME_SCORE_LEFT_CLASS = 'flex items-center min-w-0 flex-1 overflow-hidden';
export const NAME_SCORE_TEXT_CLASS = 'truncate min-w-0';
export const NAME_SCORE_TEXT_FLEX_CLASS = `${NAME_SCORE_TEXT_CLASS} flex-1`;
export const NAME_SCORE_VALUE_CLASS = 'flex-shrink-0 tabular-nums text-right whitespace-nowrap';
export const WINNER_NAME_LINE_CLASS = 'block max-w-full truncate';

type NameScoreValueStyle = {
  width: string;
  minWidth: string;
  flexShrink: 0;
  textAlign: 'right';
  whiteSpace: 'nowrap';
};

function getSignedValueLength(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const integerValue = Math.trunc(value);
  return `${integerValue > 0 ? '+' : ''}${integerValue}`.length;
}

export function getNameScoreValueStyle(
  scale = 1,
  values: number[] = [],
  minWidthPx = 44,
  characterWidthPx = 9,
  paddingPx = 12,
): NameScoreValueStyle {
  const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const longestValueLength = Math.max(1, ...values.map(getSignedValueLength));
  const width = `${Math.ceil(Math.max(minWidthPx, longestValueLength * characterWidthPx + paddingPx) * normalizedScale)}px`;

  return {
    width,
    minWidth: width,
    flexShrink: 0,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  };
}
