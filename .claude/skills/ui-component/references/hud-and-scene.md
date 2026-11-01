# HUD layout and the 3D/DOM split

The full design is in `docs/client/hud-layout.md` and `docs/client/render-scene.md`. These are
the rules to follow when you add or change something.

## Responsive decisions

- Every form-factor decision comes from `useLayoutPolicy()` (`@/presentation/hooks/layout`):
  `layoutClass`, `compactHud`, `biddingSurface`, `density`, `tapTargetPx`, `promptBelowTopBar`,
  `turnTimer`, `cameraPreset`.
- Only `resolveLayoutPolicy` (`hooks/layout/layout-policy.ts`) compares viewport numbers, and only
  against `RESPONSIVE_CONFIG` (`config/responsive.config.ts`).
- Game HUD components never use Tailwind breakpoints or `window.innerWidth`.
- A new decision becomes a new `LayoutPolicy` field (`types/hud-layout.types.ts`) with one row per
  device in `layout-policy.test.ts`. Don't compute it inside a component.
- Sizes come from the CSS variables that `getHudCssVariables` sets on the game root:
  - `--hud-tap-target`, used by `.hud-tap-target`;
  - `--hud-control-size`, used by `.hud-control-size`;
  - `--hud-gutter` and `--hud-gap`.

## Adding HUD content

1. Pick a region (`HudRegion`): `status`, `prompt`, `actions`, `dock-left`, `dock-right`,
   `social`, `bottom` or `controls`.
2. Add an order to `HUD_SLOT_ORDER` in `responsive.config.ts`.
3. Render it from `src/app/game/[id]/GameHud.tsx` inside `<HudSlot region order>`. Pass
   `interactive={false}` for purely informative content, so it never swallows pointer input meant
   for the table.

A HUD panel never sets `fixed` or `absolute` positioning on itself. Regions can't overlap, which
is why slotted content can't collide. Sheets, modals and toasts are the exception: they overlay
everything (`BottomSheet` is `fixed inset-0 z-50`). Persistent panels over the canvas use solid
translucent backgrounds, never `backdrop-filter`.

## Reserved insets

`HudLayout` measures the free stage cell and publishes it to `hudInsetsStore`. The values are CSS
px of HUD chrome from each viewport edge, safe-area padding included.

- In React, read them with `useHudInsets()`.
- Outside React, for example in `useFrame`, use `hudInsetsStore.get()` or `subscribe()`.
- `three/stage-viewport.ts` (`useStageViewport`) uses the side insets to frame the table in the
  free width. A docked panel therefore moves the framing by itself. Never hand-tune the camera for
  a panel.

## 3D or DOM

| DOM (`components/hud`, `bidding`, `overlays`, `ui`) | 3D (`components/three`, `table`, `Card3D`, `PlayerHand`) |
| --- | --- |
| Text people read, controls, forms, anything that needs wrapping, focus, a tap target or a screen reader | The table, seats, cards, chips, room and effects |
| Everything a player acts on, except playing a card | Dragging and playing cards |

- The canvas mounts through `Game3DCanvas`, imported dynamically and only on the client. Nothing
  under `components/three` may run on the server.
- In-scene text uses `SceneText` (drei `Text` behind its own Suspense). Labels that must stay
  readable at any distance use `ScreenSizedBillboard`, with sizes in
  `config/scene-label.config.ts`.
- drei `<Html>` is a last resort. Mount it only once `useThree(selectHtmlOverlayTargetReady)` is
  true (`three/html-overlay-target.ts`; `CasinoBanner.tsx` shows how).
- The canvas runs `frameloop="demand"`. Any endless decorative `useFrame` loop must be marked
  ambient with `userData={AMBIENT_USER_DATA}` (from `three/frame-scheduling`).
  Otherwise it keeps the table rendering at full rate.
  - Animation that lives only in a shader holds `useRenderActivity(true)`, imported from
    `three/frame-scheduling/render-scheduler-context`.
  - A shadow caster moved outside an active frame calls
    `useRenderScheduler().requestShadowUpdate()`.
- Per-frame changes mutate refs inside `useFrame`. Never call `setState` from a frame loop.
- Tunables for animation, physics, cameras and lighting live in `src/presentation/config/`
  (`animation.config.ts`, `physics.config.ts`, `layout.config.ts`, `scene-lighting.config.ts`).
