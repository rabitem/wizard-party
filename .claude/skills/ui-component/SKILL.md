---
name: ui-component
description: "Use when building or changing Wizard Party UI in src/presentation or src/app: a new component, screen, panel, modal, sheet, toast or HUD element, the hook or helper behind one, phone or tablet layout, HUD regions and insets (HudSlot, useLayoutPolicy, useHudInsets), themes, seasonal skins and colours, accessibility, deciding between the 3D scene and the DOM, or choosing which UI tests to write."
---

# UI components

The UI is a view of server state. It decides what to show and how, and never what is legal.
Read `AGENTS.md` for layering. This skill covers how that layering looks in `src/presentation`.

- HUD, responsive layout, 3D scene or the canvas: also read [hud-and-scene.md](references/hud-and-scene.md).
- Colours, themes, skins, ornaments: also read [themes.md](references/themes.md).
- Writing tests: run the `test-audit` gate as well as [Tests](#tests).

## Where code goes

| What | Where |
| --- | --- |
| Component | `src/presentation/components/<feature>/PascalCase.tsx`, exported from the folder's `index.ts`. From other features import the barrel. Inside the feature use relative imports. |
| Pure helper for one feature | Next to the component, for example `bidding/bid-rules.ts`, `hud/leaderboard/leaderboard-dock.ts`, `PlayerHand.layout.ts`. No React. |
| Hook used by one feature | In the feature folder, for example `hud/leaderboard/useLeaderboardEntries.ts`. |
| Hook used by several features | `src/presentation/hooks/<area>/` (`layout/`, `connection/`, `social/`, `account/`, `physics/`) |
| Sizes, durations, thresholds | `src/presentation/config/<area>.config.ts`. App-wide values and storage keys go in `config/constants.ts`. |
| UI-only types | `src/presentation/types/<name>.types.ts`. Domain types come from `@shared/domain` and are never redeclared. |
| Generic primitives | `components/ui/` (`BottomSheet` and its parts). Reuse them before you build another sheet or modal. |
| Route | `src/app/**/page.tsx` stays thin: params, metadata, composition. View logic goes in a tested helper beside it, as in `src/app/game/[id]/game-client-view.ts`. |

A new feature folder gets an `index.ts` on day one. When you move or delete a component, also
update the barrel, `git grep` the old name across `src/`, `e2e/` and `docs/`, and fix every hit.

## Container and presentational

- A container reads the narrowest context hook that has what it needs, calls actions and passes
  plain props down. The narrow hooks come from `@/presentation/providers`: `useGameSnapshot`,
  `useConnectionView`, `useTableFeed`, `useTrickPresentation`. Use `useGame()` only on screens
  that really need everything. Each narrow hook re-renders only for its own slice.
- A presentational component takes props and returns JSX. No context, no fetch, no storage and no
  socket.
- Rules, scores and legality come from the server state or `@shared/domain` (for example
  `scoreRound`). UI helpers take rule outcomes as input (`forbiddenBid`,
  `maxBid` in `bid-rules.ts`) and never derive them again.
- Two surfaces that show the same thing share their parts so they can't drift. Example:
  `BiddingPanel` and `BiddingSheet` both render `BidContextHeader`, `BidSelector` and
  `PlaceBidButton`.

## Hooks

- One job per hook, named `use<Domain><Action>`. Lint warns above 100 lines per function and fails
  a file above 300 lines (`eslint.config.mjs`). Split long before that.
- Keep the maths in a pure module and the hook as wiring: `drag-to-play-math.ts` with
  `useDragToPlay.ts`, `layout-policy.ts` with `useLayoutPolicy.ts`.
- Browser or global state (viewport, `<html>` classes, module stores) goes through
  `useSyncExternalStore` with a server snapshot, as in `useLayoutProfile` and `useActiveTheme`.
  Don't use `useEffect` plus `useState`, which renders a wrong first frame.
- Web Storage only through `safeLocalStorage` and `safeSessionStorage` from `@/lib/storage`. Lint
  enforces this, because storage throws in private and blocked browsers.
- Memoise the values and callbacks you pass to children and context. Lint rejects context values
  built inline (`react/jsx-no-constructed-context-values`).

## Accessibility

- Actions use `<button>` or `<a>`, never a clickable `<div>`. An icon-only button needs an
  `aria-label`. Treat the `jsx-a11y` lint warnings as errors in new code.
- A dialog needs `role="dialog"`, an accessible name, a labelled close button and Escape to close.
  On phones prefer `BottomSheet`.
- Announce changes the player didn't cause with `aria-live="polite"`, as `BidSelector` and
  `AchievementToasts` do.
- Touch targets: use `.hud-tap-target`, which gives 44px on a coarse pointer
  (`RESPONSIVE_CONFIG.TAP_TARGET_MIN_PX`).
- Motion: put CSS animation inside `@media (prefers-reduced-motion: no-preference)`. For
  `motion/react`, use `useReducedMotion()` (see `friends/PresenceAvatar.tsx`).
- Keep the global `:focus-visible` outline in `src/app/globals.css`. Content that is visible but
  inactive (carousel slides) gets `inert`.
- Text contrast must reach WCAG AA (4.5:1) on every theme. See [themes.md](references/themes.md).

## Tests

vitest runs in the `node` environment, without jsdom or Testing Library. Don't add them to test a
component.

- **Write**: table-driven tests of the pure helpers and policies behind the UI.
  `hooks/layout/layout-policy.test.ts` (one row per device), `bidding/bid-rules.test.ts`,
  `hud/leaderboard/leaderboard-dock.test.ts`, `utils/color-contrast.test.ts`,
  `src/app/game/[id]/game-client-view.test.ts`.
- **Hooks**: move the logic into a store or a pure function and test that, as in
  `hud-insets-store.test.ts` and `viewport-store.test.ts`.
- **Element tree**: only when the contract lives in the tree itself. Call the component as a
  function and assert its structure, as `table/TableSurface.test.tsx` does for its single Suspense
  boundary.
- **Don't write**: markup snapshots, class-name checks, "renders without crashing", tests that a
  prop is passed through, copied lists of registry keys.
- Pixels, layout, animation and pointer input belong to sandbox scenarios and Playwright
  (`e2e/viewports.spec.ts`, `e2e/visual.spec.ts`), and run on CI. See the `pull-request` skill
  for what they cost.

## Before the PR

Check phone portrait, phone landscape, tablet and desktop in device emulation, on the default
theme and at least one seasonal theme (`/dev/theme-gallery`). Attach the screenshots. Then
follow the `pull-request` skill.
