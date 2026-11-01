# Characters: models and loading

How a character look becomes something on screen. Read this before you touch
`public/characters/`, `scripts/characters/` or `src/presentation/components/character/`. What a
look is, which parts exist and how they unlock is in
[../accounts/accounts.md](../accounts/accounts.md#characters).

## Assets

The bodies, headwear, capes and props are the KayKit Character Pack: Adventurers 1.0 (CC0, see
`THIRD_PARTY_NOTICES.md`); the familiars are ours. `npm run characters:build` turns the five
upstream models and the familiars into two committed files:

| File | Holds | Size (gzip) |
| --- | --- | --- |
| `public/characters/characters.glb` | One rig (41 bones) with every catalog part on it, four textures | about 610 KB (390 KB) |
| `public/characters/character-animations.glb` | The same rig without meshes, plus the clips in `CHARACTER_CLIPS` | about 240 KB (115 KB) |

The build (`scripts/characters/build-character-assets.mjs`):

- **Inputs** are pinned in `scripts/characters/kaykit-source.json`: the upstream commit and a
  SHA-256 per file. Downloads are cached in `node_modules/.cache/kaykit` and refused when the
  checksum differs. Nothing is fetched at build or deploy time.
- **Parts** are the manifest's `parts`: KayKit node names per catalog id. Each kept node is renamed
  to its part id (`outfit:knight/2` when a part has several meshes) and tagged with the glTF extra
  `part`; every other mesh is dropped.
- **One rig.** All upstream models share the same skeleton. Parts from the other models are bound to
  the mage's bones by name: skinned meshes (heads, outfits) get their joints replaced; static
  meshes keep their parent bone (`head` for headwear, `chest` for capes, `handslot.l` and
  `handslot.r` for props).
- **Animations** come from the mage only. Channels whose every keyframe equals the bone's rest
  pose are dropped (over 1,100 of them); three.js restores a bone that no clip drives to its
  original pose, so switching clips never leaves a limb behind.
- Both files are meshopt-compressed (`EXT_meshopt_compression`). The build is deterministic: running
  it twice gives the same bytes.

`scripts/characters/kaykit-source.test.ts` keeps the manifest, the catalog and the committed file in
step: every drawable catalog part has a model, every file is pinned, and the built file contains
every part.

## Loading and showing a look

- `character-assets.ts` loads each file once per page (three's `GLTFLoader` with the meshopt
  decoder, imported on first use) and shares it between figures and portraits.
- `CharacterFigure` (`src/presentation/components/character/`) suspends on those loads, clones the
  rig per figure (`SkeletonUtils.clone`) with its own materials (`ownFigureMaterials`), shows the
  look's parts and palette (`applyAppearance`, parts keyed on `userData.part`) and crossfades
  between clips (`CHARACTER_CLIP_FADE_SECONDS`). `preloadCharacterAssets()` starts the downloads
  early.
- three.js strips `:` `/` and `.` from node names when it loads them (`head:mage` becomes `headmage`,
  `upperarm.l` becomes `upperarml`), so code finds parts by `userData.part`, never by name.
- The model is about 2.7 units tall, standing on y = 0.

## Familiars

The owl, cat, raven and toad are built in code (`scripts/characters/familiars.mjs`) from three.js
primitives: faceted, with per-vertex colours, so they sit next to the KayKit style without a
texture. The asset build adds each one to `characters.glb` as a part like any other (node and
`userData.part` = its catalog id, material `familiar`), on the `root` bone beside the left foot
(`FAMILIAR_PLACEMENT`). The chibi head is too wide for a shoulder perch. Palettes never recolour
them: their material has no texture.

To add a familiar, add the catalog part, a builder in `familiars.mjs` keyed by that id, then
rebuild.

## Palettes

Each KayKit texture is an 8x4 grid of gradient cells, and parts pick a colour by sampling a cell.
`CLOTHING_CELLS` (`src/presentation/config/character-palettes.config.ts`) lists the clothing cells
of each texture as primary (robes, tunics, the hood) or accent (capes, trims); skin, hair, leather
and metal are never listed. `PALETTE_COLORS` gives each catalog palette a primary and an accent
colour; `palette:classic` keeps the original colours.

The recolour happens in the shader (`character-palette.ts`): `onBeforeCompile` replaces three's
`map_fragment` so a texel in a listed cell takes the palette colour, scaled by its brightness
relative to the cell's average. The averages are measured once per texture by drawing it down to
8x4 pixels. All figures share one shader program (`customProgramCacheKey`); each figure owns its
materials, so its palette does not repaint others. Props share their outfit's texture, so a
spellbook cover follows the accent colour.

To find the cells of a new texture, read which cells each part's `TEXCOORD_0` falls into (row =
floor(v * 4), column = floor(u * 8), v from the top) and look at the texture.

## Portraits

`CharacterPortrait` shows a look's head and shoulders as an image. `renderCharacterPortrait`
(`character-portrait-renderer.ts`) renders it on one hidden WebGL canvas shared by the page, with
one posed figure (the idle clip at `CHARACTER_PORTRAIT.POSE_SECONDS`), framed on the head bone,
on a transparent background. Renders run one at a time and are cached per look
(`portraitKey`, `CHARACTER_PORTRAIT.CACHE_LIMIT`). Until a render is ready, or without WebGL, the
component shows an empty circle of the same size. Server-rendered images (emails, Open Graph
cards) cannot use it; they draw portrait sprites.

## Portrait sprites

Images rendered on the server with `next/og` show committed PNG portraits from
`public/characters/portraits/`:

| Image | Where |
| --- | --- |
| The two players on invite and friend request emails | `src/infrastructure/email/player-pair-card.tsx` |
| A public profile's link preview (Open Graph and Twitter) | `src/app/u/[username]/opengraph-image.tsx`, `twitter-image.tsx` |

- **Key.** A sprite shows a head, its headwear and a palette, the slots a bust shows most:
  `<head>_<headwear>_<palette>.png`, e.g. `mage_mage-hat_classic.png`. The other slots are fixed:
  the outfit of the head's set, no cape, props or familiar. A hood only comes without headwear, so
  there are 4 x 4 + 1 head and headwear pairs in 9 palettes: 153 sprites plus `silhouette.png` for
  a player without a look, 192 px, palette PNGs, about 1.5 MB together.
- **Mapping.** `portraitSpriteFile(appearance)` and `portraitSpritePath(appearance)`
  (`shared/domain/character/portrait-sprites.ts`) pick the file. Like `repairAppearance`, an unknown
  part falls back to the default one and a hood drops its headwear; `null` is the silhouette.
  `portraitSprites()` lists every sprite with the look it is rendered from.
- **Reading.** `portraitSpriteDataUrl` (`src/infrastructure/character/portrait-sprite-image.ts`)
  reads a sprite from disk as a data URL for `<img>` in `next/og`, cached per process. Nothing
  fetches over the network. Every route that renders one lists `./public/characters/portraits/**`
  in `outputFileTracingIncludes` (`next.config.ts`), or the serverless bundle lacks the files.
- **Rendering.** `npm run characters:sprites` (`scripts/characters/render-portrait-sprites.mjs`)
  opens `/dev/characters/sprites` in headless Chromium (WebGL through SwiftShader). The page exposes
  `renderCharacterPortrait` and the sprite list; the script renders each look, scales it to the
  sprite size, quantizes it with `sharp` and replaces the directory. Start the app first
  (`npm run dev`, or pass `--url`).
- `shared/domain/character/portrait-sprites.test.ts` checks that the directory holds exactly the
  listed sprites and that every valid look maps to one of them.

Regenerate and commit the sprites after a change to the heads, headwear, palettes, outfits,
`CLOTHING_CELLS` or the portrait framing (`CHARACTER_PORTRAIT`). A new head, headwear or palette
makes the test fail until they are rendered.

## In the UI

- `PlayerAvatar` (`components/account/`) takes `appearance`: left out for the local player's own
  look (`useLocalAppearance`), `null` for a silhouette. It draws `CharacterFace` (the portrait, or
  the silhouette) inside the level frame. Avatar-only screens import `CharacterFace` by path, so
  they never load the 3D figure code.
- `useLocalAppearance` (`hooks/account/`) loads the signed-in player's look once per page. Until
  it has loaded, and while nothing was saved, it shows the look derived from the `avatar` setting
  (`chooseLocalAppearance`). A save in the editor updates it at once
  (`rememberSavedAppearance`). Guests get `null`.
- At a table (lobby seats, the in-game standings) `seatAppearance` decides: the local look, a
  bot's look by difficulty (`botAppearance`), the look the room verified (`IPlayer.appearance`,
  see [At the table](#at-the-table)), the look of the account the social API reported
  (`roomAccounts`), else a silhouette. `useSeatAppearance` wires it for the standings.
- The first portrait on a page loads the character model and opens one WebGL context.
- The Character tab (`CharacterSection`) shows the draft in a turnable 3D view
  (`CharacterPreview`, loaded with `next/dynamic` so three.js stays out of the other tabs) and
  cheers once after a save. Part rewards on the Rewards tab show the starter look wearing the part.

## Podium

`CharacterPodium` (`components/podium/`) stands the top three on a 1-2-3 podium: the champion on
the tallest step, in the middle, cheering (`CHEER_MS`, then idle for `CHEER_REST_MS`, again);
second and third idle. Names and scores sit under the steps as text, so screen readers and the 2D
fallback read the same list.

- **Who stands where.** Callers pass ranked players (`PodiumContender`); `podiumStands` puts each
  on the step of their rank. The rank comes from the ranking's owner and is never derived again:
  `getStandings` at game end (`GameEndPodium`, under the title), the tournament standings in
  `FinalPodium`. Tied players share a step and the next step stays empty (1, 1, 3); more than
  `PODIUM.MAX_PER_STEP` on one step are counted ("+2 more").
- **Looks.** Game end dresses each seat by `seatAppearance`. The tournament podium uses the look a
  completed tournament's standings carry (`StandingView.appearance`, see
  [tournaments](../accounts/tournaments.md)), and the viewer's own look from the page. Without one a
  player is a silhouette: the default look in one dark colour in 3D, `CharacterFace`'s silhouette
  in 2D.
- **Loading.** `CharacterPodium` is light; `PodiumStage` (three.js, the render tier) and
  `PodiumScene` (react-three-fiber, the figures) load with `next/dynamic` when a podium shows.
- **3D or 2D.** `podiumRenderMode` shows figures on the tiers in `PODIUM.FIGURE_TIERS` (the tier
  the game table would start with: forced, learned, else detected) and portraits on the low tier,
  without WebGL, or when the figures fail. The game table is a different page, so the podium's
  small canvas is the only 3D context there; R3F releases it on unmount.
- **Motion.** With `prefers-reduced-motion` nobody cheers; figures stay idle.
- **Layout.** The stage is always three steps wide (orthographic camera fitted to the width), so a
  step lines up with the third of the width its names sit under. Sizes, colours, camera and timings
  are in `src/presentation/config/podium.config.ts`.

## At the table

Every player sees every signed-in player's look, guests included, because the room carries it:

1. Once the account is known, `usePlayerName` asks for a character ticket
   (`src/lib/account/character-ticket.ts`, `POST /api/account/character/ticket`). Its `ready`
   stays false until that fetch settles, so the first `JOIN_GAME` already carries the ticket. A
   failed fetch (no secret, offline, 3 s timeout) joins without one.
2. The ticket (`shared/realtime/character-ticket.ts`) is HMAC-SHA256 with
   `CHARACTER_TICKET_SECRET` over `{ name, appearance, exp }`: the account's display username,
   the look `GET /api/account/character` returns, and an expiry 12 hours out. Every (re)join sends
   it as `appearanceTicket`; a ticket within 10 minutes of expiry is still sent while the next is
   fetched, and a save fetches a new one.
3. The worker (`party/session/character-tickets.ts`) verifies it while the join is held, like a
   tournament ticket, and passes the look to the join only when the ticket names the seat's name.
   The look is stored on the player (`IPlayer.appearance`, persisted with the room) and kept
   through rejoins without a ticket. A bad, expired or foreign ticket, or a worker without the
   secret, leaves the seat as it was.

Looks are public, so a ticket is no secret; the name binding stops a seat from wearing another
player's look. Bots get their look on the client, by difficulty.

### Figures at the seats

Every opponent's character stands behind their seat plate on the 3D table, facing the centre
(`SeatFigure` in `components/table/`, mounted by `PlayerBrandmark`). The local seat has none: it
is nearest the camera and would stand in front of the player's own hand.

- **Look**: `useSeatAppearance`, as for every other seat. A seat without a known look shows a
  dark silhouette figure (`CharacterFigure silhouette`).
- **Size and place**: `SEAT_FIGURE` in `config/character.config.ts` (about 0.75 units tall,
  standing a little outside the plate). Figures are not camera fit points; the seat plates are.
- **Reactions** (`seat-reactions.ts`, `useSeatReaction`): a figure cheers the trick its player
  won, hops or flinches on a round by the sign of the score the server recorded, raises a spell
  when its player sends an emote, and sleeps while its human is disconnected. A reaction plays its
  clip once (`CharacterFigure`'s `oneShot`) and the figure settles back by itself on the mixer's
  clock, so ending it needs no timer or re-render. Reactions only read what the client was told;
  nothing judges the game.
- **Cost**: at rest a figure holds its clip's first frame, and `character-skeleton.ts` stops its
  bone uploads once the pose is in place (three.js would re-upload a skinned mesh's bone texture
  every frame), so a resting table uploads nothing. All parts of a figure share one skeleton. The
  subtree is ambient (`AMBIENT_USER_DATA`), so a reaction never forces full-rate frames. Figures
  mount visible, so the table's shader warm-up compiles them; every figure shares the palette
  program. On the low render tier and with `prefers-reduced-motion` figures never react.
  Unmounting disposes a figure's materials and bone textures.
- **Failure**: each figure has its own `Suspense` and error boundary. A failed asset load leaves
  that seat without a figure instead of rebuilding the canvas.
- **Setting**: "Characters at the table" (`tableCharacters` in the game settings, synced with the
  account) in the in-game settings panel turns all figures off.

## Checking assets

`/dev/characters` (local dev and Vercel previews only) shows every part, palette and clip on the
real assets, without accounts or unlocks, reports invalid combinations, and renders the look's
portrait in every palette. The first visit in `next dev` takes a few seconds while the route
compiles. `/dev/characters/sprites`, served the same way, is the page the sprite script drives.

## Changing assets

- **A KayKit part**: add the catalog part first (accounts doc), map it in the manifest's `parts`,
  then run `npm run characters:build` and commit the rebuilt files. A new head, headwear or palette
  also needs `npm run characters:sprites` ([Portrait sprites](#portrait-sprites)).
- **A clip**: add it to the manifest's `clips` and to `CHARACTER_CLIPS`, then rebuild.
- **Another upstream file**: add it to `files` with its SHA-256 (`sha256sum`) from the pinned commit.
