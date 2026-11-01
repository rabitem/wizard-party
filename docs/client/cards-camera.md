# Cards and camera

How card meshes, card faces, the local hand, the scene camera, in-scene labels and particles are
built. Read this before you change how a card is drawn, how the hand lays itself out or how the
camera frames the table. Everything here lives in the presentation layer under
`src/presentation/`. The render loop and quality tiers are in [render-scene.md](render-scene.md),
the HUD the camera makes room for is in [hud-layout.md](hud-layout.md).

## How it works

```
utils/card-geometry.ts                      one shared card geometry, 2 draw groups
utils/card-textures/card-face-texture.ts    paints a face (logical 512x768, any tier resolution)
utils/card-textures/card-face-texture-cache.ts + ref-counted-lru-cache.ts
                                            shared faces: ref-counted, idle faces in an LRU
utils/card-textures/card-texture-quality.ts memory tier, anisotropy
utils/card-textures/card-materials.ts       FRONT (per mesh) + BACK (shared) materials
utils/card-render-state.ts                  'table' vs 'hand' render state, hand render order
hooks/useCardMaterials.ts                   React lifecycle: build in render, retain/release in commit
config/card-render.config.ts                tiers, cache capacity, anisotropy, surface, edge swatch
```

### Card rendering resources

- **Geometry.** `getCardGeometry()` is a `BoxGeometry` re-indexed into two groups: `BACK` (back
  face plus the four edges) and `FRONT` (`CARD_MATERIAL_SLOT`). The edges map onto a swatch painted
  in the corner of the back texture (`CARD_EDGE_SWATCH`), so a card costs two draws per pass
  instead of six. Pass it as the `geometry` prop and never dispose it.
- **Faces.** A face is keyed by content, not card id: `getCardFaceKey(card, themeVersion, tier)`
  joins type, suit, value, theme version and memory tier. Hand, dragged, played, collecting and
  deck meshes of the same card, and identical cards such as the four Wizards, share one
  `CanvasTexture`, so a stage change is a cache hit instead of a 2D repaint and a texture upload.
  Faces nobody uses stay idle in an LRU of `idleFaceCapacity` (per tier in `CARD_TEXTURE_TIERS`);
  idle faces of an old theme version are dropped on the next lookup.
- **Memory tier.** `getCardTextureTier()` (`card-texture-quality.ts`) picks `compact` on iOS and
  iPadOS and on devices reporting `deviceMemory <= CARD_MEMORY_TIER.LOW_MEMORY_GB`, and `standard`
  elsewhere. A tier changes the canvas resolution (`CARD_TEXTURE_TIERS`); painters always draw in
  the logical `CARD_FACE_LOGICAL_SIZE` space.
- **Materials.** The front material belongs to the mesh, because it carries the hand tint. The
  back and edge material is shared per back texture and render mode. Faces are near-matte
  (`CARD_SURFACE.FACE_ROUGHNESS`), and textures use anisotropic filtering up to
  `CARD_TEXTURE_QUALITY.MAX_ANISOTROPY` or the renderer's limit.
- **Render modes.** `table` cards are ordinary lit, depth-tested objects. `hand` cards draw after
  everything else without a depth test, in hand order (`getHandCardRenderOrder`), so the table and
  its effects never hide them. They are fully opaque; the transparent pass is only used for the
  draw order.
- **React lifecycle.** `buildCardMaterials` (render, takes no reference) then `retainCardMaterials`
  (layout effect) then `disposeCardMaterials` (cleanup: releases the face, disposes the front).
  `useCardMaterials` wires this and rebuilds only when `getCardMaterialsKey` changes: card
  content, face-down state or the card theme. Every `GAME_STATE` parses into fresh card objects, so
  memoising on the object would rebuild every mounted card on every action.

### Card faces

- Suit symbols are vector outlines (`utils/card-textures/suit-glyphs/`), never font glyphs, since
  emoji-presentation symbols draw differently per browser. Every `canvasSymbol` of every card theme
  must have an outline (`suit-glyphs.test.ts` enforces it). `fillSymbolText` and `strokeSymbolText`
  replace `fillText` and `strokeText` wherever a symbol may be drawn, and fall back to text for
  anything unregistered. Glyph builders draw in a unit em box with a `GlyphPen`, which never
  touches the context transform, so gradients and shadows set up for text keep working.
- The trump emblem in the middle of the table is the same outline extruded in 3D
  (`table/trump-emblem.ts`, through `traceSuitGlyph`), so it always shows the symbol of the
  player's deck, in the suit's accent colour.
- The four suits of a deck must read as different colours: their accents, and for the art styles
  that paint the card body per suit (classic, hyperreal, pixel) their primaries, stay at least
  0.12 apart in OKLab (`card-theme-presets.test.ts`).
- The classic number card prints the value large in the centre emblem with the suit glyph below
  it. The font sizes of the centre value and the corner index come from the player's
  `CARD_NUMBER_SIZE_PRESETS` choice (`components/settings/visual-presets.ts`), and two-digit values
  are scaled into the emblem and the corner badge (`numbered-card-drawing.ts`).

### Local hand

- `HandCardVisualState` (`components/Card3D.motion.ts`) is `idle` outside a local play decision
  (bidding, other turns, a resolving trick: full brightness), `legal` (lifted by
  `DRAG_CONFIG.LEGAL_CARD_LIFT`) or `illegal` (front colour multiplied by
  `DRAG_CONFIG.ILLEGAL_CARD.TINT`, lowered by `DRAG_CONFIG.ILLEGAL_CARD.DROP`, all in
  `config/drag-drop.config.ts`). `deriveHandCardVisualState` decides it. Hand cards are never
  transparent.
- `components/PlayerHand.fit.ts` solves the layout in the hand plane
  (`HAND_CONFIG.DISTANCE_FROM_CAMERA` in front of the camera): preferred size and spacing, then
  spacing down to the minimum strip (`HAND_CONFIG.LAYOUT.MIN_STRIP_PX`, coarse and fine), then
  smaller cards (down to `MIN_SCALE_RATIO`), then up to `MAX_ROWS` overlapping rows whose total
  height stays within `MAX_HEIGHT_FRACTION` (all three in `HAND_CONFIG.LAYOUT`). All cards are
  always on screen; `PlayerHand.layout.test.ts` projects the largest hands on phone, tablet and
  desktop viewports.

### Camera

`frameCamera` (`components/three/camera-framing.ts`), called by `SceneCamera`:

1. Pull the preset back along its view ray until every fit point is in view
   (`getTableFitPoints(playerCount)` in `table-fit-points.ts`: the padded corners of every seat's
   brandmark plate, placed by the same `seat-geometry.ts` rule as `useBrandmarkPositions`). The fit
   is perspective-aware: a point on the near half of the table is closer to the lens and needs more
   room, so the seat count changes the framing.
2. If that would rise above the room envelope, keep the fit and lower the elevation. The top edge
   of the view must still point down (`CAMERA_CONFIG.ENVELOPE.TOP_RAY_MARGIN_DEG`), so beams above
   the camera are never visible.
3. Otherwise stay at the envelope height, come closer and widen the view with `zoom < 1`.
   `CameraRelativeHand` scales the hand by `1 / zoom`, so it keeps its size on screen.
4. A camera beyond the room's horizontal radius comes closer and widens the view as well, so the
   OrbitControls clamp never has to pull a freshly framed camera in.
5. On portrait screens, slide camera and target so the table centre sits in the band between the
   HUD and the hand (`CAMERA_CONFIG.FRAMING.PORTRAIT_RESERVE`), never through a wall.

`useStageViewport` (`components/three/stage-viewport.ts`) narrows the width the table is framed in
by the HUD's side docks; see [hud-layout.md](hud-layout.md#reserved-screen-insets).

Room envelopes live in `config/themed-environment.config.ts` (`CAMERA_ENVELOPE.OVERHEAD_Y`: the
underside of the lowest geometry spanning the table, per room; the open-sky rooms `neon` and
`summer` use `DEFAULT_OVERHEAD_Y`). The table is typed over `ThemedFxId`, so a themed room without
an entry or an open-sky mark does not compile. Orbiting is clamped into the same envelope along the
view ray (`getEnvelopeClampScale`, called from `SceneCamera`).

Because the envelope belongs to the room, a narrow screen frames each table theme differently (up
to ~6 units apart). Switching the theme glides the camera to the new framing
(`useRoomCameraTransition`, `camera-transition.ts`, `CAMERA_CONFIG.FRAMING_TRANSITION`) instead
of cutting; a resize or a seat change still re-frames at once.

### In-scene labels

Information (seat name and bid progress, played-card owner) is drawn with `ScreenSizedBillboard`
(`components/three/ScreenSizedBillboard.tsx`): camera-facing, constant on-screen cap height, depth
tested. Sizes are `SCENE_LABEL` in `config/scene-label.config.ts`. Decoration (brandmark plate,
turn glow, the opponents' character figures) stays in world units. The billboard subscribes its
frame callback after its parent's, so a label on a flying card fits the card's pose of the frame
being drawn.

### Particles

Point particles use `SoftPointsMaterial` (`components/three/particles/`): the shared soft-disc or
spark FX texture on a `PointsMaterial`, with size scaled by `PARTICLE_SPRITE.SIZE_SCALE`
(`config/particle-sprite.config.ts`). Sizes written per frame go through `softPointSize`.

## Contracts

- One card geometry, never disposed by a component. Meshes of the same card share one face
  texture; only the front material is per mesh.
- Material creation happens in render without taking a reference; references are taken in a layout
  effect and released in its cleanup.
- Hand cards are opaque and never hidden by table geometry.
- Every theme suit symbol has a vector outline.
- A camera never ends up above a room's `OVERHEAD_Y` less its clearance, or beyond the horizontal
  radius (`getCameraEnvelope`).

## Adding things

- **A card theme with a new suit symbol**: add its outline to the glyph builders in
  `suit-glyphs/` (`glyph-shapes-basic.ts` or `glyph-shapes-emblems.ts`); `suit-glyphs.test.ts`
  fails until every `canvasSymbol` has one. The outline also becomes the deck's trump emblem on
  the table; `card-theme-presets.test.ts` fails if two of its suits are too close in colour.
- **A themed room with beams or rafters over the table**: add its id and overhead underside to
  `OVERHEAD_Y` in `themed-environment.config.ts`, or list it as open sky.
- **A card render resource tunable**: add it to `card-render.config.ts`, not to the painter.
- **A label in the scene**: size it in `SCENE_LABEL` and draw it with `ScreenSizedBillboard`.
- **A particle system**: use `SoftPointsMaterial` and `softPointSize`, and mark endless loops as
  ambient ([render-scene.md](render-scene.md#frame-scheduling)).

## Tests

Paths are under `src/presentation/`.

| Suite | Contract |
| --- | --- |
| `utils/card-geometry.test.ts`, `utils/card-render-state.test.ts` | the two-group geometry, render modes and hand order |
| `utils/card-textures/ref-counted-lru-cache.test.ts`, `card-texture-quality.test.ts`, `suit-glyphs/suit-glyphs.test.ts` | face cache eviction, memory tier, glyph coverage of every theme |
| `hooks/useCardMaterials.test.ts` | material identity and the retain and release lifecycle |
| `components/Card3D.motion.test.ts`, `components/PlayerHand.layout.test.ts` | hand card states and the hand layout on real viewports |
| `components/three/camera-framing.test.ts`, `stage-viewport.test.ts` | table framing, the room envelope, zoom compensation |
| `components/three/camera-transition.test.ts` | the glide between room framings stays under the camera-jump limit |
| `components/three/particles/SoftPointsMaterial.test.tsx` | soft point sprites |
