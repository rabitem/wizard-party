export interface TabBarGeometry {
  /** Visible width of the scrolling bar. */
  viewportWidth: number;
  /** Full scrollable width of the bar. */
  contentWidth: number;
  /** Left edge of the tab within the scrollable content. */
  itemOffset: number;
  itemWidth: number;
}

/**
 * Horizontal scroll position that centers a tab in a sideways-scrolling tab bar, clamped to the
 * scrollable range. Scrolling the bar itself (instead of element.scrollIntoView) never moves the
 * page vertically.
 */
export function centeredScrollLeft({ viewportWidth, contentWidth, itemOffset, itemWidth }: TabBarGeometry): number {
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const centered = itemOffset + itemWidth / 2 - viewportWidth / 2;
  return Math.min(maxScroll, Math.max(0, Math.round(centered)));
}
