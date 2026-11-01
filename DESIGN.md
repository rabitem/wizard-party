---
name: Wizard Party
description: An online Wizard card table, dressed by eleven realms, spoken in a candlelit serif.
colors:
  page-base: "#080706"
  surface: "rgba(26, 21, 16, 0.92)"
  surface-border: "rgba(180, 83, 9, 0.3)"
  glow: "rgba(212, 168, 83, 0.35)"
  text-muted: "#8b7355"
  cream: "#fffbeb"
  candle-100: "#fef3c7"
  parchment-200: "#fde68a"
  lamp-300: "#fcd34d"
  amber-500: "#f59e0b"
  brass-600: "#d97706"
  outline-700: "#b45309"
  ember-900: "#78350f"
  ink-950: "#451a03"
  aged-brass-top: "#905007"
  aged-brass-bottom: "#75340c"
  focus-ring: "#d4a853"
  error-text: "#fca5a5"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "4.5rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.015em"
  tagline:
    fontFamily: "Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  body-small:
    fontFamily: "Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  label:
    fontFamily: "Georgia, serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "normal"
  room-code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0.3em"
rounded:
  hairline-card: "5px"
  inner: "8px"
  control: "12px"
  card: "16px"
  panel: "24px"
  pill: "9999px"
spacing:
  gap-tight: "10px"
  stack: "20px"
  panel-pad-sm: "20px"
  panel-pad: "28px"
  station-gutter-sm: "16px"
  station-gutter: "32px"
  station-gutter-lg: "64px"
  station-block: "80px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.aged-brass-top}"
    textColor: "{colors.cream}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.candle-100}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "rgba(120, 53, 15, 0.25)"
    textColor: "{colors.candle-100}"
  button-icon-round:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.lamp-300}"
    rounded: "{rounded.pill}"
    size: "44px"
  input-field:
    backgroundColor: "rgba(10, 8, 6, 0.6)"
    textColor: "{colors.cream}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  reading-panel:
    backgroundColor: "{colors.page-base}"
    textColor: "{colors.candle-100}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  lobby-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  dock:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "4px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.amber-500}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  realm-lens:
    rounded: "{rounded.pill}"
    size: "44px"
---

# Design System: Wizard Party

## Overview

**Creative North Star: "The Lamplit Card Room"**

Wizard Party is a card room you walk into, not a dashboard you read. The backdrop of the start page is the active realm's own 3D game room and table (the same ThemedEnvironment, SceneLighting and TableSurface the game draws, under a warm fill light), and the camera moves through it as the page scrolls until it rests at the player's seat. Everything readable sits on top of that room in a single voice: Georgia serif, sentence case, warm amber lettering on near-black.

The system is one class set over eleven realms. The UI never names a realm colour; it paints with the amber scale, `--page-base`, `--surface`, `--surface-border` and `--glow`, and each realm (Classic, Halloween, Autumn, Winter, Spring, Summer, Manga, Neon, Pixel, Celestial, Solarpunk) remaps those tokens. Classic is the reference rendering and the values in the frontmatter are Classic's.

Density is low and deliberate: one reading panel per stop, sequences told in running type, figures shown as label-and-value ledgers. Depth comes from the real room behind the page and from soft, deep black shadows under the panels, never from stacked tinted cards.

**Key Characteristics:**
- The realm's real game room is the backdrop; the page is a walk through it.
- Georgia serif for every word of UI, at regular weight; hierarchy by size, colour and space.
- One remappable amber scale restyles every realm with no per-realm component code.
- Opaque reading panels with a brass hairline; translucent blurred surfaces only for floating chrome.
- Muted aged-brass primary action with cream lettering, shared by the start page and the lobby.
- 44px minimum hit area on every control.

## Colors

A warm, low-key palette: near-black grounds, candle and parchment lettering, and a deep aged brass for the one action that matters. All of it rotates with the realm.

### Primary
- **Aged Brass** (aged-brass-top to aged-brass-bottom): the primary action's matte vertical gradient, a 62% mix of brass-600 into near-black at the top and a 78% mix of amber-800 into near-black at the bottom. Used for Quick play, Start game, Add bot, Try again and the join-by-code arrow. It is deliberately dark; the cream lettering, not the fill, carries the contrast.
- **Brass Hairline** (brass-600 at 35%): the one-pixel edge of reading panels and the search results sheet; the mark's line gradient runs parchment-200 to brass-600.

### Secondary
- **Outline Amber** (outline-700 at 50%): the border of secondary buttons such as Create room; brightens to amber-500 at 60% on hover over an ember-900 25% fill.
- **Lamp** (lamp-300): numerals, icon tint on round icon buttons, the mark's star.

### Neutral
- **Page Base** (page-base): the solid ground under everything and the fill of reading panels. Each realm sets its own (for example Halloween #06030a, Solarpunk #04120b).
- **Surface** (surface): translucent panel fill for floating chrome and the lobby control panel; **Surface Border** (surface-border) edges it.
- **Cream** (cream): headings, the wordmark, button lettering, field text.
- **Candle** (candle-100) and **Parchment** (parchment-200): body copy (often at 80-90% opacity) and secondary lines such as the tagline and ledger values.
- **Muted Caption** (text-muted): captions; non-Classic realms derive it as parchment-200 at 62%.
- **Glow** (glow): halos behind the mark and the active realm lens only.
- **Error Text** (error-text at 90%): field problems, written as a full sentence under the field.

### Named Rules
**The Remap Rule.** UI colour comes only from the amber scale and the page tokens (`--page-base`, `--surface`, `--surface-border`, `--glow`, `--text-muted`, `--accent-*`). A raw realm hex in a component breaks ten of the eleven realms.

**The Cream On Brass Rule.** The primary button is dark brass with cream text. Do not brighten it into a saturated gold fill; the lit table is the brightest thing on screen.

## Typography

**Display Font:** Georgia (with serif)
**Body Font:** Georgia (with serif)
**Label/Mono Font:** the platform monospace, for room codes only

**Character:** One serif voice, the house hand of a candlelit card room; it reads as a printed rulebook rather than an app. Generated link previews (`src/app/_og/`) set the same voice in Gelasio, an OFL serif drawn to Georgia's metrics, because the image renderer needs an embedded font; Gelasio appears nowhere in the live UI.

### Hierarchy
- **Display** (400, 3rem on phones to 4.5rem, line-height 1, -0.015em): the "Wizard Party" wordmark only, with a deep black text shadow over the room.
- **Tagline** (400, 1.125rem to 1.5rem, +0.04em): "Predict. Play. Prevail." under the wordmark, in parchment.
- **Headline** (400, 2.25rem to 3rem, leading tight): the closing station heading at the table ("Your seat is waiting").
- **Title** (400, 1.5rem to 1.875rem): section headings inside reading panels (How to win, Chronicles of the realm, Hall of Champions).
- **Body** (400, 1rem, line-height 1.625) and **Body small** (0.875rem): running text, ledger labels, button lettering.
- **Label** (400, 0.75rem, sentence case): field labels ("What should we call you?"), ledger descriptions, the loader's rotating line in italic.
- **Room code** (platform mono, 1.125rem, +0.3em, uppercase): room codes in fields and the lobby's code pill. Data, not a heading.

### Named Rules
**The One Voice Rule.** Every user-facing word is Georgia serif at regular weight. The global stylesheet still defaults to Inter, so a new component opts in to the serif explicitly (the shared `SERIF` style); forgetting it is a visible defect.

**The Sentence Case Rule.** Headings are sentence case at heading scale and stand alone: no small uppercase labels above them, no tracked caps as section markers.

## Layout

The start page is a vertical walk of viewport-tall stations (min-height 100svh). Each station maps one-to-one to a camera stop in `REALM_HALL.STOPS`; its reading column (max 36rem) sits left, right or centre so the room's lit feature fills the other half. Station padding is 80px top and bottom with 16px, 32px and 64px side gutters at phone, small and large widths. The first station holds the wordmark at the top, the lit table in the middle and the play form below, with realm lenses as a row on phones and a rail down the left edge from 64rem. The page ends in a footer that fades into page-base.

The lobby has two arrangements. Stacked (phones, portrait tablets): top bar, table, rules and invites, and an action bar pinned to the bottom. **Split** (the `split` variant: at least 64rem wide, or landscape phones at least 40rem wide and at most 32rem tall): the table and a 23rem control panel side by side, the table sized from the viewport height (`--lobby-table`, at most 60rem). `landscape-phone` refines split for short screens and wins over it.

Inside panels, content stacks on a 20px rhythm; paired buttons sit 10px apart. Ledgers run in two columns from the small breakpoint with 32px between columns.

### Named Rules
**The No Card Grid Rule.** Sequences are written as numbered running type (How to win), figures as label-and-value ledgers with hairline dividers (Chronicles). Do not lay content out as a grid of equal tinted cards.

## Elevation & Depth

Depth is the room. The 3D scene behind the page provides the perspective; UI layers above it are flat fills lifted by one wide, soft black shadow, with no glossy highlights apart from the faint inner brass edge on the primary button. Translucency with a 12px backdrop blur is reserved for chrome that floats over the room (dock, loader, lobby control panel); reading panels are opaque so the room never shows through text.

### Shadow Vocabulary
- **Panel lift** (`box-shadow: 0 18px 50px rgba(0,0,0,0.5)`): reading panels, the lobby panel (0.45) and the search sheet (0.6).
- **Float** (`box-shadow: 0 8px 28px rgba(0,0,0,0.45)` to `0 10px 40px rgba(0,0,0,0.55)`): the dock and the loader.
- **Brass button** (`box-shadow: inset 0 0 0 1px amber-400 at 55%, inset 0 1px 0 amber-200 at 30%, 0 4px 14px rgba(0,0,0,0.35)`): the primary action only.
- **Realm glow** (`0 0 18px var(--glow)` or the realm's ring colour): behind the mark and around the active realm lens.

### Named Rules
**The Opaque Reading Rule.** Text that is read, not glanced at, sits on solid page-base. Blur and translucency are for chrome.

## Shapes

Soft, generous corners that scale with the object: 24px for reading and lobby panels, 16px for cards and floating sheets (play card, loader, search results), 12px for buttons and fields, 8px for buttons nested inside fields, full pills for the dock, chips, icon buttons and realm lenses. Borders are single hairlines in amber at 25-50% opacity. Realm lenses are round discs painted as a miniature of the realm's felt and wood. The mark is the wizard's hat on a playing card tilted 14 degrees, drawn in one brass line weight (stroke 2 on a 64 grid).

## Components

### Buttons
Matte and quiet; one brass action per moment.
- **Shape:** gently rounded (12px).
- **Primary:** aged-brass gradient, cream Georgia lettering, 48px tall in forms (44px in compact rows), optional 16px leading icon. Hover raises brightness to 105-110%; press scales to 98%; disabled drops to 50% opacity.
- **Secondary:** transparent with an outline-700 50% hairline and candle-100 text, 44px tall; hover fills ember-900 at 25% and lifts the border to amber-500 at 60%.
- **Icon:** round 44px buttons on the surface fill with a surface-border edge and lamp-300 icons, used in the lobby top bar and the dock.
- **Focus:** a 2px focus-ring outline offset 2px on every focusable control; a field whose container draws its own ring (`.focus-shown-by-parent`) suppresses the inner one.

### Chips
- **Style:** transparent pills with a 1px amber-800 50% border, 12px serif text, optional 12px icon (Public or Private, rule chips in the lobby).

### Cards / Containers
- **Reading panel (start page):** page-base fill, brass-600 35% hairline, 24px corners, 20px padding on phones and 28px from the small breakpoint, panel-lift shadow.
- **Lobby control panel:** surface fill with surface-border, 24px corners, backdrop blur, panel-lift shadow at 0.45; it spans the second column in split and holds the top bar, roster, rules and actions.
- **Play card:** the incumbent surface-gradient card at 16px corners with an amber-700 30% border and a 2px brass rule across its top edge.

### Inputs / Fields
- **Style:** dark field (the realm surface mixed 60% with black, at 60%), 12px corners, amber-700 30% border, 12px by 16px padding, cream serif text, placeholder in brass at 40%.
- **Focus:** border brightens to amber-500 at 50-70% with a faint 2px ring.
- **Error:** border turns red-500 at 50%; a sentence in error-text appears underneath and is announced.

### Navigation
- **Dock:** a fixed top-right pill on the surface fill at 88% with a backdrop blur, holding the player search, friends, preferences and account as borderless 44px segments. On phones it slides away while scrolling down, and search collapses to an icon that opens a full-width field.

### Realm Lenses (signature)
Eleven round 44px lenses, each a radial painting of its realm's felt, edge and wood. The active lens gets a 2px ring and an 18px glow in the realm's ring colour; hover scales to 110% when motion is allowed. Choosing one shows the loader, then re-dresses the room, the page and later the game. The active realm's name and tagline sit below in 12px serif.

### Hall Loader (signature)
A 16px-cornered surface pill: three small brass cards (5px corners) that riffle over each other in a CSS animation, "Setting up the {realm} room", and a rotating italic line from `HALL_LOADER.LINES`. It shows only after 180ms, and with reduced motion the cards rest fanned.

## Do's and Don'ts

### Do:
- **Do** paint with the amber scale and the page tokens so all eleven realms restyle the component for free.
- **Do** set every word in Georgia serif at regular weight, headings in sentence case at heading scale.
- **Do** put reading content on an opaque page-base panel with a brass-600 35% hairline and 24px corners.
- **Do** use the shared aged-brass primary style (`GOLD_BUTTON_STYLE`) for the single main action, with cream text.
- **Do** use amber-700 50% outline buttons for secondary actions.
- **Do** give every control a hit area of at least 44px.
- **Do** respect reduced motion: no camera ease, bounce or shuffle when it is set.

### Don't:
- **Don't** hard-code a realm colour in a component; it breaks every other realm.
- **Don't** add small uppercase labels or tracked caps above headings.
- **Don't** lay out sequences or statistics as a grid of equal cards; use running type and ledgers.
- **Don't** brighten the primary button into a saturated gold fill or add a second primary on the same view.
- **Don't** put reading text on translucent or blurred surfaces over the 3D room.
- **Don't** use Gelasio in the live UI; it exists only for the generated link previews.
