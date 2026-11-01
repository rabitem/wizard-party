# HUD layout and responsive policy

How the in-game HUD decides what to show on a phone, a tablet and a desktop, and how it places
itself on screen. Read this before you add HUD content, change a breakpoint or touch the camera
framing that depends on the HUD. The scene the HUD floats over is in
[render-scene.md](render-scene.md) and [cards-camera.md](cards-camera.md).

Every form-factor decision comes from one responsive policy. The HUD lays itself out in named,
non-overlapping regions, and no HUD component positions itself on the screen.

## One responsive policy

```
window (innerWidth/innerHeight, (pointer: coarse))
  └─ viewportStore            hooks/layout/viewport-store.ts      one listener set, useSyncExternalStore
       └─ LayoutProfile       { width, height, orientation, coarsePointer }
            └─ resolveLayoutPolicy()   hooks/layout/layout-policy.ts   pure, unit tested per device
                 └─ LayoutPolicy       types/hud-layout.types.ts
```

Paths are under `src/presentation/`. `useLayoutPolicy()` (`hooks/layout/useLayoutPolicy.ts`)
returns the policy; a client render reads the live viewport and every consumer shares the same
snapshot. A hydrating render uses the server profile (`RESPONSIVE_CONFIG.SERVER_PROFILE`) and
corrects itself right after. The game page renders `LoadingOverlay` until the client holds a game
state (`GameClientUI`), so the HUD does not render before a snapshot has arrived.

| Layout class      | When                                             | HUD        | Bidding | Camera preset |
| ----------------- | ------------------------------------------------ | ---------- | ------- | ------------- |
| `phone-portrait`  | width < 768 or height < 500, portrait            | compact    | sheet   | `mobile`      |
| `phone-landscape` | width < 768 or height < 500, landscape           | compact    | panel   | `desktop`     |
| `tablet`          | larger, coarse pointer                           | regular    | panel   | `desktop`     |
| `desktop`         | larger, fine pointer                             | regular    | panel   | `desktop`     |

The thresholds are `CONSTANTS.BREAKPOINTS.MOBILE` and `COMPACT_HEIGHT`
(`config/constants.ts`), exposed as `RESPONSIVE_CONFIG.PHONE_MAX_WIDTH` and `PHONE_MAX_HEIGHT`.
Thresholds and tokens live in `config/responsive.config.ts` (`RESPONSIVE_CONFIG`,
`HUD_LAYOUT_CONFIG`, `HUD_SLOT_ORDER`, `TURN_TIMER_PLACEMENT`, `STANDINGS_DOCK_CONFIG`). Only
`layout-policy.ts` (`resolveLayoutClass`, called by `resolveLayoutPolicy`) compares viewport
numbers with the layout thresholds.

Policy fields:

- `compactHud`: phone HUD (one controls button and sheets instead of the persistent panels).
- `biddingSurface`: `sheet` on portrait phones, `panel` in the prompt region elsewhere.
- `density`: `compact` panels on phones, `regular` elsewhere.
- `cameraPreset`: the steep `mobile` preset only on portrait phones; landscape phones frame like
  desktops.
- `tapTargetPx`: `RESPONSIVE_CONFIG.TAP_TARGET_MIN_PX` on a coarse pointer, 0 with a mouse.
- `promptBelowTopBar`: on portrait phones prompts get their own row under the top bar.
- `turnTimer`: region, popover direction and size of the turn timer (`TURN_TIMER_PLACEMENT`).
  The timer never sits in the bottom centre, which belongs to the hand. Under the status bar it
  has a fixed width (`narrow` on landscape phones, without the phase label; `regular` elsewhere),
  so a long player name cannot widen the status column and squeeze the prompt column. Only the
  full-width prompt row of portrait phones uses the growing `compact` timer.

Components that still take an `isMobile` prop (`RoundEndUI`, the special-card layer, the turn
indicator, the 3D canvas) are handed it by the HUD or the game page from the policy
(`policy.compactHud`, or `policy.cameraPreset === 'mobile'` for the canvas). The game client state
(`useGameClientState`) carries no viewport flag.

## CSS variables and utilities

`getHudCssVariables(policy)` sets these on the game root (`GameClientUI`):

| Variable             | Coarse pointer | Fine pointer | Used by                                     |
| -------------------- | -------------- | ------------ | ------------------------------------------- |
| `--hud-tap-target`   | 44px           | 0px          | `.hud-tap-target` (bid chips, stepper, Place Bid) |
| `--hud-control-size` | 44px           | 40px         | `.hud-control-size` (top-bar buttons, compact status bar height) |
| `--hud-gutter`       | 8px (compact) / 16px (regular) | | `.hud-layout` padding                  |
| `--hud-gap`          | 8px            | 8px          | gaps between regions and slots              |

The values come from `RESPONSIVE_CONFIG.CONTROL_SIZE_PX`, `TAP_TARGET_MIN_PX` and
`HUD_LAYOUT_CONFIG`. `src/app/globals.css` provides the classes, in the "Game viewport & HUD
regions" block: `.game-viewport` (100dvh with a 100vh fallback, no pinch zoom of the fixed HUD),
`.sheet-max-height` (dvh-based sheet height), `.sheet-safe-bottom` and `.sheet-safe-x`
(safe-area padding of sheets) and `.hud-scroll-row` (thin scrollbar for chip rows).

Pages outside the game (the home page, the lobby) are plain CSS and use Tailwind breakpoints. For
two-pane layouts `globals.css` defines the `split` variant: desktop width (64rem) or a landscape
phone (at least 40rem wide, at most 32rem tall). The lobby puts the table beside its control panel
there (`lobby/table/lobby-styles.ts`). Tailwind emits custom variants after its breakpoints, so a
larger size inside a `split` layout is written `split:2xl:...`, not `2xl:...`.

The home page (`components/realm-hall/`) renders the active realm's game room and table behind
the page: `ThemedEnvironment`, `SceneLighting` and `TableSurface`, the same parts as the game, in
a canvas set up like `Game3DCanvas`. Each `HallStation` section is one stop of a camera walk
(`REALM_HALL.STOPS` in `config/realm-hall.config.ts`, same order; portrait screens swap in
`PORTRAIT_STOPS` through `hallStopsFor`, because there the panels span the width; a stop may set
its own `fov`, which the camera eases toward); `useHallScrollProgress` turns
the scroll position into walk progress, and the camera eases toward it inside `useFrame`. With
reduced motion the camera stays at the first stop; without WebGL the page keeps a painted
backdrop.

`HallLoader` covers the wait: shuffling cards, the realm being set up and a rotating line from
`HALL_LOADER.LINES`. Inside the canvas `HallLoadingReporter` writes `hallLoadingStore` (room
ready, textures still loading); a realm lens calls `switchRealm`, which raises the loader first and
applies the switch only after `HALL_LOADER.CURTAIN_MS`, because building the next room blocks the
main thread. `HallDock` holds the top-right controls in one capsule: `ProfileSearch` (public
profiles, see docs/accounts/social.md), friends, preferences and the account. On phones it slides
away while scrolling down (`useHideOnScrollDown`).

The link previews (`src/app/_og/`, `opengraph-image.tsx`, `twitter-image.tsx`, `join/og`,
`share/og`) render on the Node.js runtime from `assets/og`: Gelasio (an OFL serif with Georgia's
metrics) and two captures of every realm's room (`realm-hall-<realm>-side.jpg` at the walk's last
turn, `-table.jpg` at the seat) taken from the start page with its UI hidden. Invite and results
links carry the sharer's realm as `&realm=<id>` (`useRealmLinkParam`, from their table theme); the
`/join` and `/share` pages pass it to their image routes (`src/app/_og/og-realm.ts`), and a missing
or unknown realm shows Classic, as does the site's own preview. The lobby's invite link is
`/join?room=`, so it previews the room code. `next.config.ts` traces that folder into those routes. Satori, the renderer, needs
`display: flex` on any div with more than one child, does not read variable fonts, and ignores
the `inset` shorthand. The favicon (`public/favicon.svg`, `favicon.png`) and `icon.tsx` /
`apple-icon.tsx` draw the mark from `config/wizard-party-mark.config.ts`.

The game route sets `viewportFit: 'cover'` (`src/app/game/[id]/page.tsx`, merged over the root
viewport), so the canvas fills the screen edge to edge and every HUD edge adds
`env(safe-area-inset-*)` through `max(gutter, inset)`.

## HUD regions

`HudLayout` (`components/hud/layout/HudLayout.tsx`) renders the region grid over the canvas:

```
 status   | prompt  | actions      top row     (prompt gets its own row on portrait phones)
 dock-l   | (stage) | dock-r       middle row  the stage cell stays free for the table
 social   | bottom  | controls     bottom row
```

- Edge columns keep their content width and share the rest equally, so the centre stays centred
  and shrinks first. Chip rows scroll, and the bidding panel wraps Place Bid onto a second line
  instead of overflowing. The corner regions (`status`, `actions`, `social`, `controls`) hug their
  content inside the cell (`justify-self`), so with an empty centre the controls region does not
  stretch over the hand.
- Components render into a region with `<HudSlot region order>`
  (`components/hud/layout/HudSlot.tsx`). A slot is a portal into the region's node, so content
  placed through slots cannot overlap another region. `order` comes from `HUD_SLOT_ORDER`, so
  stacking inside a region does not depend on mount order. Outside a `HudLayout` a slot renders
  nothing.
- Purely informative slots (turn indicator, reconnecting notice) pass `interactive={false}` so
  they never swallow pointer input meant for the table.
- Sheets, modals and toasts are not regions: they overlay everything (`BottomSheet` is
  `fixed inset-0 z-50`).

Placements (`src/app/game/[id]/GameHud.tsx` and the bidding components):

| Region        | Content                                                              |
| ------------- | -------------------------------------------------------------------- |
| status        | `GameStatusBar` (compact on phones), tournament match badge, turn timer (except portrait phones) |
| prompt        | reconnecting notice, bidding panel, turn indicator, turn timer (portrait phones) |
| actions       | `TopBarButtons` (+ standings popover)                                |
| dock-left/right | docked standings panel                                             |
| social        | emote bar and quick chat (regular HUD)                               |
| bottom        | horizontal standings panel (user setting "bottom")                   |
| controls      | reactions feed, hand controls (regular HUD), bidding reopen button (portrait phones), controls button (phones; hidden while any sheet is open, since the sheet covers it) |

### Standings

`resolveStandingsMode(policy, position)` (`components/hud/leaderboard/leaderboard-dock.ts`):

- phone HUD: a bottom sheet opened from the controls button;
- `hidden` preference: a popover from the top-bar trophy button;
- `left` and `right`: docked only when `canDockSidePanel` says the panel fits in the strip the
  centred table leaves free (`STANDINGS_DOCK_CONFIG`), otherwise the popover. This keeps the
  panel off the side seats on tablets and small screens;
- `bottom`: docked in the bottom region.

`LeaderboardPosition` has one definition (`types/hud-layout.types.ts`).

## Reserved screen insets

`HudLayout` measures the free stage cell against the HUD root with a `ResizeObserver`
(`useHudInsetsPublisher`) and publishes the result to `hudInsetsStore`
(`hooks/layout/hud-insets-store.ts`):

```ts
interface HudInsets { top: number; right: number; bottom: number; left: number } // CSS px
```

- React: `useHudInsets()`.
- Outside React (for example a `useFrame` callback): `hudInsetsStore.get()` and `subscribe()`.

Each value is how far HUD chrome (including safe-area padding) reaches in from that edge of the
game viewport. The store resets to zero when the HUD unmounts. `useStageViewport`
(`components/three/stage-viewport.ts`) reads the left and right insets to centre the table in the
width the side docks leave free, never below `CAMERA_CONFIG.FRAMING.MIN_STAGE_WIDTH_FRACTION`.
The top and bottom bars are not taken out of the stage; the portrait framing reserves those bands
itself (`CAMERA_CONFIG.FRAMING.PORTRAIT_RESERVE`, see [cards-camera.md](cards-camera.md)).

## Bidding surfaces

Both surfaces show the same information and controls, so they cannot drift (`components/bidding/`):

- `BidContextHeader`: trump (icon and name), bid total against this round's tricks, every
  player's bid chip. `inline` (one row, chips scroll) in the panel, `stacked` (summary and wrapped
  chips) in the sheet.
- `BidSelector`: a -/+ stepper that skips the forbidden bid (`stepBid` in `bid-rules.ts`), one-tap
  chips for every bid of the round in one horizontally scrolling row (the selected chip is
  scrolled into view), the forbidden-bid notice and an optional inline Place Bid. The `row`
  layout (compact panel) keeps only the chips and Place Bid on one line: no stepper, and the
  forbidden chip shows the forbidden bid instead of the notice.
- `PlaceBidButton`: the submit guard (`canSubmitBid`) and a double-submit lock
  (`PLACE_BID_LOCK_MS`); the compact panel uses the short label "Bid 3".
- `BiddingUI` keeps the player's pick and derives the shown selection every render with
  `resolveSelectableBid`: the forbidden bid only applies once the last bidder is up, so a pick
  made earlier moves to the next lower bid instead of leaving Place Bid disabled.

`BiddingPanel` renders into the prompt region. At `compact` density (landscape phones) it is one
slim header line over the `row` selector, about 80 px tall instead of 110 to 140, so it stays
clear of the far seats' name labels on a 340 px tall screen and Place Bid stays visible; the
chips and Place Bid keep the 44 px touch size. `BiddingSheet` (portrait phones) puts Place Bid in the sheet's
sticky footer, so it is visible without scrolling, and its reopen button lives in the controls
region, clear of the hand.

## Visual rules

- No `backdrop-filter` on persistent HUD panels over the live WebGL canvas: it re-blurs the canvas
  every frame, and older Safari skips it without the `-webkit-` prefix. The status bar, standings,
  bidding panel and the sheet backdrop (`BottomSheetBackdrop`) use solid translucent backgrounds.
  The modal overlays `ErrorToast` and `ConnectionStatusOverlay` keep their blur.
- HUD text in a suit colour goes through `getHudSuitColor(accent)`
  (`components/hud/hud-suit-color.ts`): the card-theme accent when it reaches WCAG AA text contrast on the lightest HUD panel
  (`HUD_CONTRAST_CONFIG` in `config/hud-contrast.config.ts`), otherwise the least-lightened tint
  that does. Card faces keep the raw accent.

## Adding things

- **HUD content**: pick a region, or add one to `HudRegion` (`types/hud-layout.types.ts`), the
  grid and `HUD_REGIONS` in `HudLayout.tsx`, and the `.hud-region-*` rules in `globals.css`. Add
  its order to `HUD_SLOT_ORDER`, then render it inside `<HudSlot region order>` from `GameHud`.
  Read sizes from the policy or the HUD CSS variables, never from Tailwind breakpoints or an
  `isMobile` of your own.
- **A form-factor decision**: add a field to `LayoutPolicy` and set it in `resolveLayoutPolicy`,
  with its thresholds in `responsive.config.ts`. Components read the field.
- **A layout class or turn-timer placement**: extend `LayoutClass` and `TURN_TIMER_PLACEMENT`
  (a `Record<LayoutClass, ...>`, so the compiler lists what is missing).
- **A suit-coloured HUD text**: use `getHudSuitColor`.

## Tests

| Suite | Contract |
| --- | --- |
| `hooks/layout/layout-policy.test.ts` | the policy per device profile |
| `hooks/layout/viewport-store.test.ts` | one shared snapshot, listener lifetime |
| `hooks/layout/hud-insets-store.test.ts` | inset maths and the store |
| `components/hud/leaderboard/leaderboard-dock.test.ts`, `leaderboard-layout.test.ts` | standings docking and sizing |
| `components/bidding/bid-rules.test.ts` | stepper, submit guard, selectable bid |
| `components/hud/hud-suit-color.test.ts` | every suit of every card theme reaches AA contrast |
| `components/three/stage-viewport.test.ts` | the stage framing around the side docks |
| `components/hud/turn-timer-countdown.test.ts` | the turn timer's countdown maths |
