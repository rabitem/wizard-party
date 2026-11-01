/**
 * Layout contract for the round-end panel: the panel is a capped flex column whose
 * standings scroll, while the footer with the next-round CTA stays in view on short screens.
 */
export const ROUND_END_FRAME_CLASS = 'relative w-full max-w-md max-h-[90vh] flex flex-col';
export const ROUND_END_PANEL_CLASS = 'relative flex flex-col min-h-0 overflow-hidden border-2 border-amber-700/40 rounded-lg';
export const ROUND_END_SCROLL_CLASS = 'relative flex-1 min-h-0 overflow-y-auto';
export const ROUND_END_FOOTER_CLASS = 'relative flex-shrink-0';
