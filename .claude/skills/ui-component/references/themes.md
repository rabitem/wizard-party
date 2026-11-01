# Themes, skins and colour

There are three independent choices. Know which one you are changing:

| Choice | Source of truth | Affects |
| --- | --- | --- |
| UI theme | `THEME_PREFERENCE_IDS` (`settings/settings-persistence.ts`) and `THEME_PRESETS` (`settings/visual-presets.ts`) | DOM colours, page ambience, HUD and lobby skins |
| Table theme | `TABLE_THEME_PALETTES` (`config/table-theme.config.ts`) | Felt, rim and the themed 3D room (`config/*-environment.config.ts`) |
| Card theme | `CARD_THEMES` (`settings/card-theme-presets.ts`) | Card faces and backs, suit accents |

## How a component picks up the UI theme

- `ThemeProvider` puts `.theme-<id>` on `<html>`. `src/app/theme-palettes.css` defines the
  variables for each theme. Use them; never hard-code hex values:
  - `var(--surface)` and `var(--surface-border)` for panels, cards, modals and sheets
    (`bg-[var(--surface)]`);
  - `var(--glow)` for accent shadows and highlights;
  - `var(--page-bg)` only on a page root that must hide what is beneath it;
  - text uses the amber scale (`text-amber-200`, ...), which each theme remaps.
- Page roots stay transparent, so the `SeasonalAmbience` layer that the root layout mounts shows
  through. The full rules are in the header of `components/seasonal/index.ts`.
- Ornaments: `<SeasonalCorner>` inside a `relative` card, `<SeasonalDivider>` between sections.
- Copy or art that is specific to one theme: `useActiveTheme()`.

## Skins, not `if (theme === ...)`

Objects that are specific to a theme go through a registry, so every host renders the same slots
and a theme without a skin falls back to the default:

- In-game HUD: `hud/skins/hud-skin-registry.ts`. Hosts render `<HudIcon id fallback>`,
  `<HudButtonDecor>`, `<HudPanelDecor>` and `<HudRoundBadgeDecor>`, and read classes with
  `useHudClassName(slot)`. `hud/skins/summer/` is the reference implementation. The file header
  lists the steps.
- Lobby: `lobby/skins/lobby-skin-registry.ts` with `useLobbySkin()`.
- Skin SVGs have no `id` attributes, because several copies render at once. Animation stays
  inside `@media (prefers-reduced-motion: no-preference)`.

To add a whole UI theme, start from `git grep -n "solarpunk" -- src` (a recent theme). It lists
every preset, palette, skin, ambience pack (`config/seasonal-ambience-packs.config.ts`) and test
table that a theme joins.

## Colour and contrast

- Text must reach WCAG AA, 4.5:1, on the lightest HUD panel of every theme
  (`config/hud-contrast.config.ts`).
- Suit colours in the HUD go through `getHudSuitColor(accent)`. Card faces keep the raw accent.
- Any other computed text colour uses `ensureContrastOnDark` or `contrastRatio` from
  `utils/color-contrast.ts`. Cover the new colour with a test row there, or in the owner's test,
  for every theme.
- Check the change on every theme at `/dev/theme-gallery`. The route is served in development and
  on preview deployments, never in production. Visual baselines (`e2e/visual.spec.ts`) cover
  every table theme and UI theme on CI.
