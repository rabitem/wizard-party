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
cards) cannot use it.

## Checking assets

`/dev/characters` (local dev and Vercel previews only) shows every part, palette and clip on the
real assets, without accounts or unlocks, reports invalid combinations, and renders the look's
portrait in every palette. The first visit in `next dev` takes a few seconds while the route
compiles.

## Changing assets

- **A KayKit part**: add the catalog part first (accounts doc), map it in the manifest's `parts`,
  then run `npm run characters:build` and commit the rebuilt files.
- **A clip**: add it to the manifest's `clips` and to `CHARACTER_CLIPS`, then rebuild.
- **Another upstream file**: add it to `files` with its SHA-256 (`sha256sum`) from the pinned commit.
