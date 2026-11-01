# Characters: models and loading

How a character look becomes something on screen. Read this before you touch
`public/characters/`, `scripts/characters/` or `src/presentation/components/character/`. What a
look is, which parts exist and how they unlock is in
[../accounts/accounts.md](../accounts/accounts.md#characters).

## Assets

The bodies, headwear, capes and props are the KayKit Character Pack: Adventurers 1.0 (CC0, see
`THIRD_PARTY_NOTICES.md`). `npm run characters:build` turns the five upstream models into two
committed files:

| File | Holds | Size (gzip) |
| --- | --- | --- |
| `public/characters/characters.glb` | One rig (41 bones) with every catalog part on it | about 530 KB (360 KB) |
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

- `CharacterFigure` (`src/presentation/components/character/`) loads both files through drei's
  `useGLTF` with the meshopt decoder, clones the rig per figure (`SkeletonUtils.clone`), shows the
  look's parts (`applyAppearance`, keyed on `userData.part`) and crossfades between clips
  (`CHARACTER_CLIP_FADE_SECONDS`). It suspends while loading; `preloadCharacterAssets()` starts the
  downloads early.
- three.js strips `:` `/` and `.` from node names when it loads them (`head:mage` becomes `headmage`,
  `upperarm.l` becomes `upperarml`), so code finds parts by `userData.part`, never by name.
- The model is about 2.7 units tall, standing on y = 0.
- Palettes and familiars are not drawn yet.

## Checking assets

`/dev/characters` (local dev and Vercel previews only) shows every part and clip on the real
assets, without accounts or unlocks, and reports invalid combinations. The first visit in
`next dev` takes a few seconds while the route compiles.

## Changing assets

- **A KayKit part**: add the catalog part first (accounts doc), map it in the manifest's `parts`,
  then run `npm run characters:build` and commit the rebuilt files.
- **A clip**: add it to the manifest's `clips` and to `CHARACTER_CLIPS`, then rebuild.
- **Another upstream file**: add it to `files` with its SHA-256 (`sha256sum`) from the pinned commit.
