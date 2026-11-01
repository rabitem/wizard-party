# Render scene: frame scheduling, quality tiers and draw calls

How the 3D table decides when to render, at what quality, and how it keeps the number of draw
calls low. Read this before you add an animation, a light, a shadow caster or a mesh-heavy
decoration to the scene. The HUD over the canvas is in [hud-layout.md](hud-layout.md), the card
meshes and camera in [cards-camera.md](cards-camera.md).

## How it works

```
Game3DCanvas (src/app/game/[id]/Game3DCanvas.tsx)
├── RenderQualityProvider        tier + profile (outside the Canvas: dpr, MSAA, shadow type)
│   └── GameCanvasHost           graphics lifecycle (useGraphicsLifecycle), CSS vignette
│       └── <Canvas frameloop="demand" shadows={{ type: PCF, autoUpdate: false }}>
│           ├── WebGLContextHandler   real context loss only, restore in place
│           └── FrameScheduler        when to render the next frame, when to redraw shadows
│               ├── AdaptiveQuality   frame-time governor, publishes tier + dpr to telemetry
│               └── Game3DScene       ShaderWarmup, PhysicsActivityProbe, render pulses
```

| Concern | Path |
| --- | --- |
| Tiers, governor, scheduling, colour pipeline, lifecycle constants | `src/presentation/config/render-quality.config.ts` |
| Light budget and key-light shadow camera | `src/presentation/config/scene-lighting.config.ts` |
| Frame scheduler | `src/presentation/components/three/frame-scheduling/` |
| Quality tiers | `src/presentation/components/three/render-quality/` |
| Graphics lifecycle | `src/presentation/components/three/graphics-lifecycle/` and `src/presentation/components/WebGLContextHandler.tsx` |
| Static batching | `src/presentation/components/three/batching/` |
| Shader warm-up | `src/presentation/components/three/shader-warmup/` |
| Opponent hands | `src/presentation/components/OpponentHand.tsx` and `components/opponent-hand/` |
| Decoration bodies | `src/presentation/components/table/PhysicsDecorations.tsx` and `decoration-layout.ts` |

## Frame scheduling

The Canvas runs `frameloop="demand"`. `FrameScheduler` owns a `RenderScheduler` (framework free,
unit tested) and decides after every rendered frame, in an R3F after-effect when this frame's
motion is visible in the world matrices, whether the next frame follows on the next animation
frame (full rate) or after the ambient interval.

A frame is **active** (full rate) when any of these holds:

- **Input.** Any pointer, touch, wheel or key event on the page starts a short pulse
  (`FRAME_SCHEDULING.INPUT_ACTIVE_MS`), so interaction latency is one frame.
- **State changes.** `useRenderPulse(gameState, ...)` and `useRenderPulse(trickResult, ...)` in
  `Game3DScene` start a pulse (`STATE_CHANGE_ACTIVE_MS`) on every server update: deals, plays,
  collections.
- **Mounts and resizes.** `MOUNT_ACTIVE_MS` after the canvas mounts or changes size.
- **Probes.** `PhysicsActivityProbe` keeps full rate while any dynamic rigid body is awake.
- **Holds.** `useRenderActivity(active)` (`frame-scheduling/render-scheduler-context.ts`, not
  re-exported by `frame-scheduling/index.ts`) for animations the motion check cannot see, such as
  shader-only ones. No component calls it.
- **Scene motion.** `SceneMotionMonitor` compares every visible object's world matrix (and
  instance and particle buffer versions) and the camera with the previous frame. Drift slower than
  `MOTION_THRESHOLD_PER_SECOND`, such as idle breathing, does not count.

Otherwise the table renders at the tier's ambient rate (`ambientFps` in `RUNTIME_QUALITY`),
lowered to `REDUCED_MOTION_AMBIENT_FPS` with `prefers-reduced-motion` and never below
`MIN_AMBIENT_FPS` (`ambientIntervalMs`). The rate is never zero, because frame callbacks only run
on rendered frames and some animations wait for a timestamp before they start moving.

**Ambient subtrees.** Decorative motion is marked with `userData={AMBIENT_USER_DATA}`
(`frame-scheduling/ambient.ts`, re-exported by `frame-scheduling/index.ts`). The motion check
skips a marked group or mesh and everything below it, so it animates at the ambient rate and never
keeps the table at full rate by itself. These subtrees are marked:

| Subtree | Where |
| --- | --- |
| The whole themed room or casino | `Game3DScene.tsx`, around `ThemedEnvironment` |
| The felt surface (pool floaties, pulsing runes) | `table/FeltSurface.tsx` |
| The opponent hands' breathing | `OpponentHand.tsx` |
| Turn-indicator rings and glow | `table/PlayerSeat.tsx` |
| The centre sparkles | `three/SparkleParticles.tsx` |
| The trump indicator's spin, brand pulse and embers | `table/PhysicsTrumpIndicator.tsx` |

Anything else that moves (cards, chips, the table shake, the camera) is detected automatically.
**Any new endless decorative loop must be marked.** An unmarked one (a `useFrame` that moves an
object or rewrites a buffer forever) keeps the whole table at full rate for as long as it is
mounted.

**Shadows.** `gl.shadowMap.autoUpdate` is off. The scheduler sets `needsUpdate` at the start of
active frames, on the frame after motion (so casters are shadowed at their final pose), after a
shadow-map reallocation (`SceneLighting`), after shader warm-up and after a context restore. Code
that moves a caster outside an active frame calls `useRenderScheduler().requestShadowUpdate()`.

## Quality tiers

`RenderQualityProvider` picks the starting tier:

1. A forced tier: `localStorage` key `wizard-party-render-quality` set to `low`, `medium`, `high`
   or `ultra` (anything else, including `auto`, means adaptive). A forced tier turns the governor
   off.
2. The tier the governor settled on last time on this device
   (`wizard-party-render-quality-learned`).
3. `selectInitialTier(signals)` (`render-quality/select-initial-tier.ts`) from a throwaway WebGL2
   probe (`graphics-probe.ts`: the unmasked renderer string and `failIfMajorPerformanceCaveat`),
   cores, memory, touch and device pixel ratio. Renderer strings can be masked (Brave, Firefox
   resist-fingerprinting), so they only refine the choice.

The storage keys are `RENDER_QUALITY_STORAGE_KEYS` in `render-quality.config.ts`. The sandbox
turns the governor off (`adaptive={!isSandbox}` in `Game3DCanvas`), because its virtual clock
has fixed frame times.

A profile has two halves (`render-quality.config.ts`, merged by `resolveRenderProfile`):

- **Runtime** (follow the current tier, change live, never relink shaders): `dprMax`,
  `shadowMapSize`, `composerMultisampling`, `ambientFps`.
- **Structural** (fixed for the WebGL context): `antialias` (native MSAA, a context attribute,
  skipped at `MSAA_MAX_DPR` and above), `shadows`, `fillLights`, `roomAccentLights` and `bloom`.
  Changing shadows, the light set or bloom recompiles every lit material: three.js keys programs on
  light counts and shadows, and bloom moves the scene into the composer's render target, which
  uses the untone-mapped program variant. Structural settings follow the tier the session started
  with; the next visit starts at the learned tier.

`QualityGovernor` (`quality-governor.ts`, tunables `QUALITY_GOVERNOR`) takes the intervals between
consecutive full-rate frames only, since idle ambient frames say nothing about headroom. It
evaluates windows of `WINDOW_FRAMES` frames at the configured percentile, steps down after
`DOWN_WINDOWS` slow windows, steps up after `UP_WINDOWS` windows near the measured display
refresh, and does not return to a tier it left for `UP_COOLDOWN_MS`. It ignores frames for
`SETTLE_MS` after the table mounts or the tier changes: texture uploads and shader warm-up would
otherwise read as a slow device, and the step down is remembered. No tier caps `dprMax` below 1.5,
so 150 % laptop displays never upscale the card art.

The active tier and canvas DPR are published through
`src/lib/client-telemetry/render-quality-snapshot.ts` by `AdaptiveQuality` and reported with every
`render.performance` window (`qualityTier`, `renderDpr`; `render-performance.collector.ts`).

## Colour pipeline

The scene is linear HDR with one tone-mapping step and sRGB output. The renderer tone-maps with
Khronos PBR Neutral (`COLOR_PIPELINE.RENDERER_TONE_MAPPING`), which leaves base colours below about
0.8 unchanged and only rolls off highlights. Without the composer the renderer does the tone
mapping, so `toneMapped={false}` works on emissive UI. Room exposure is
`renderer.toneMappingExposure`, set by the room's atmosphere
(`themed-environments/primitives/realism`).

Post-processing (`PostProcessing.tsx`) only exists for rooms with bloom on tiers that allow it:
the composer forces `NoToneMapping` on the renderer while mounted and runs the same Neutral
operator, with the same exposure, as its last effect. The vignette is a CSS radial gradient over
the canvas (`VIGNETTE_OVERLAY`), not a full-screen pass, so the default room has no composer, no
extra render target and no resolve.

## Lights

The budget is in `scene-lighting.config.ts`: ambient and hemisphere, the key directional (the only
shadow caster, its orthographic camera fitted to the table through `shadowCameraSize`), the
overhead spot (no shadow) and the trump light. The cool fill and warm rim directionals exist only
on tiers with `fillLights`; lower tiers fold the fill into the hemisphere
(`fillFallbackHemisphereBoost`). The casino's practical lights and banner glow exist only on tiers
with `roomAccentLights`. The current-turn seat glow is an additive textured disc, not a point
light, and the trump light stays mounted and only dims, so the light count, and with it every lit
program, is constant across turns. Lights never mount or unmount during play.

## Draw calls

- **Opponent hands.** Two instanced draws per hand (backs with the shared per-theme back material,
  and edges) share one instance matrix buffer (`OpponentHand.tsx`).
- **Static decor.** `<StaticBatch>` merges its children's meshes per material look at mount
  (transforms baked, base colour folded into vertex colour), hides the originals and restores them
  on unmount. It is used for the casino room (`CasinoEnvironment.tsx`), the table legs
  (`TableLegs.tsx`) and the wood rim (`WoodTableRim.tsx`). Use it only for static children; meshes
  with shader, physical or customised materials stay as they are.
- **Felt stitching.** One `InstancedRingPart` (`STITCH_COUNT` dashes in `FeltSurface.tsx`).
- **Chips and coasters.** `InstancedRigidBodies` in `PhysicsDecorations.tsx`: the chip body, edge
  ring and inlay are three instanced draws sharing the body's instance buffer, and only the body
  casts a shadow. Each body has only its explicit cylinder collider (`colliders={false}`). A test
  in `decoration-layout.test.ts` keeps every decoration above the table collider, so all
  decoration bodies fall asleep.
- **Table legs** (`TableLegs.tsx`) do not cast shadow-map shadows, since they sit under the table
  top.

## Warm-up

`ShaderWarmup` runs `warmUpScene` (`shader-warmup/shader-warmup.ts`) `SHADER_WARMUP.SETTLE_MS`
after the table mounts, after a room or structural tier change (its `warmupKey`) and after a
context restore: `renderer.initTexture` for every material texture, then
`renderer.compileAsync(scene, camera)` (`KHR_parallel_shader_compile` where available), and a
shadow update when it finishes.

## Graphics lifecycle

`graphicsLifecycleReducer` (`graphics-lifecycle/graphics-lifecycle.ts`, pure) drives
`useGraphicsLifecycle`:

| Status | Meaning |
| --- | --- |
| `ready` | the canvas is mounted and rendering |
| `lost` | the GPU context is lost; the scene stays mounted with `frameloop="never"` and three.js re-creates GPU state lazily when the browser restores the context |
| `rebuilding` | no restore arrived within `RESTORE_TIMEOUT_MS`, or the canvas crashed; a fresh canvas mounts after an exponential back-off |
| `failed` | `MAX_REBUILD_ATTEMPTS` rebuilds without a rendered frame; the player retries by hand |
| `unavailable` | the probe cannot create a WebGL2 context at all; an explanation screen replaces the retry loop |

Only the error boundary around the Canvas (`WebGLErrorBoundary`) and real `webglcontextlost` events
count; there are no window-level error heuristics. The constants are `GRAPHICS_LIFECYCLE`.

## Adding things

- **An endless decorative animation**: put `userData={AMBIENT_USER_DATA}` on its group or mesh.
  Animation that lives only in a shader holds `useRenderActivity(true)` instead (import it from
  `frame-scheduling/render-scheduler-context`, as the index does not re-export it).
- **A shadow caster that moves outside an active frame**: call
  `useRenderScheduler().requestShadowUpdate()`.
- **A light**: add it to `scene-lighting.config.ts` and keep the set fixed per tier. A light that
  mounts or unmounts relinks every lit material.
- **A quality knob**: add it to `RuntimeQualitySettings` or `StructuralQualitySettings` and to
  every tier in `RUNTIME_QUALITY` or `STRUCTURAL_QUALITY`. Runtime knobs must not change shader
  programs.
- **A static decorative mesh group**: wrap it in `<StaticBatch>`. Repeated parts that are not
  static become an instanced mesh (`InstancedRingPart`, an `InstancedRigidBodies` body).
- **A room with its own materials**: check the warm-up covers them; materials that mount hidden
  after the warm-up compile on first draw.

## Tests

Paths are under `src/presentation/components/`.

| Suite | Contract |
| --- | --- |
| `three/frame-scheduling/render-scheduler.test.ts` | pulses, holds, probes, ambient rate, shadow requests |
| `three/frame-scheduling/scene-motion-monitor.test.ts` | motion detection, the motion threshold, ambient subtrees |
| `three/render-quality/quality-governor.test.ts`, `quality-profile.test.ts`, `select-initial-tier.test.ts` | stepping, profiles, the starting tier |
| `three/graphics-lifecycle/graphics-lifecycle.test.ts` | the lifecycle transitions |
| `three/shader-warmup/shader-warmup.test.ts` | what the warm-up uploads and compiles |
| `three/batching/static-batch.test.ts` | merging and restoring static meshes |
| `opponent-hand/opponent-card-meshes.test.ts`, `opponent-hand-layout.test.ts` | opponent hand instancing and layout |
| `table/decoration-layout.test.ts`, `table/ring-instances.test.ts` | decoration placement, instanced rings |
| `three/game-canvas-gl.test.ts` | the canvas context options |
