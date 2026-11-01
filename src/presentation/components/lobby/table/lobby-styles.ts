/**
 * Shared look of the round-table lobby. Colors come from theme tokens (--surface, --glow and the
 * remapped amber scale) so every UI theme restyles the lobby without per-theme code.
 */

/**
 * The primary action (Start game, Quick play, Add bot): aged brass, matte and dark, with cream
 * lettering and a thin brass edge. The realm remaps the amber scale, so the brass follows the theme.
 */
export const GOLD_BUTTON_STYLE = {
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 62%, #1a1108) 0%, color-mix(in srgb, var(--color-amber-800) 78%, #100a04) 100%)',
  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-amber-400) 55%, transparent), inset 0 1px 0 color-mix(in srgb, var(--color-amber-200) 30%, transparent), 0 4px 14px rgba(0,0,0,0.35)',
  color: 'var(--color-amber-50)',
  fontFamily: 'var(--font-serif)',
} as const;

export const SURFACE_STYLE = {
  background: 'var(--surface)',
  borderColor: 'var(--surface-border)',
} as const;

export const FIELD_BG = 'rgba(0,0,0,0.35)';

/**
 * Lobby layout, shared by the lobby and its skeleton. Tailwind emits custom variants after its
 * breakpoints, so a `split:` class always wins over `md:` or `lg:`.
 *
 * Stacked (phones, tablets in portrait), one column: top bar, table, rules and invites, and the
 * action bar pinned to the bottom. Tablets centre the table in the free height.
 *
 * Split (see the variant in globals.css): one centred group of the table and a control panel
 * beside it. The panel is a card behind the second column holding the top bar, the player roster
 * (when the screen is tall enough), the rules and the actions, as tall as the table. `--lobby-table` is the table's width: what the viewport height
 * leaves after the page padding and 4rem for the names under the near seats, times the table's
 * aspect ratio (4 / 3.4), at most 60rem.
 */
export const LOBBY_PAGE_CLASS =
  'relative z-10 isolate min-h-[100dvh] flex flex-col split:justify-center px-4 sm:px-6 lg:px-10 pt-5 sm:pt-8 [--lobby-pad:clamp(1rem,4dvh,2.5rem)] split:py-[var(--lobby-pad)] [--lobby-table:max(16rem,min(60rem,calc((100dvh-2*var(--lobby-pad)-4rem)*4/3.4)))]';

/** Rows when stacked: top bar, free space, table, rules, free space, actions. Split: four panel rows beside the table. */
export const LOBBY_GRID_CLASS =
  'relative mx-auto w-full flex-1 grid max-w-lg md:max-w-3xl grid-rows-[auto_0px_auto_auto_1fr_auto] md:grid-rows-[auto_1fr_auto_auto_1fr_auto] split:flex-none split:max-w-[calc(var(--lobby-table)+26rem)] split:grid-cols-[minmax(0,1fr)_23rem] split:grid-rows-[auto_minmax(0,1fr)_auto_auto] split:gap-x-12';

/** Where each part sits in LOBBY_GRID_CLASS. Panel parts are `relative` so they paint above the panel card. */
export const LOBBY_SLOT = {
  top: 'row-start-1 split:col-start-2 split:px-5 split:pt-5',
  roster: 'relative hidden [@media(min-width:64rem)_and_(min-height:36rem)]:flex col-start-2 row-start-2 px-5 pt-6',
  info: 'relative row-start-4 split:col-start-2 split:row-start-3 split:px-5 split:pt-6',
  actions: 'row-start-6 split:col-start-2 split:row-start-4',
  panel: 'hidden split:block relative isolate col-start-2 [grid-row:1/5] rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.45)]',
} as const;

/**
 * The table's box: as wide as the column, and stacked also as the viewport height allows (16rem
 * stay for the top bar, the rules and the action bar). Seats and labels scale with it (container
 * `table`).
 */
export const TABLE_BOX_CLASS =
  '@container/table relative row-start-3 self-center mx-auto w-full aspect-[4/3.4] mt-6 mb-10 max-w-[max(16rem,min(100%,45rem,calc((100dvh-16rem)*4/3.4)))] split:col-start-1 split:[grid-row:1/5] split:my-0 split:max-w-[min(100%,var(--lobby-table))]';

export const CHIP_CLASS ='inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs';
