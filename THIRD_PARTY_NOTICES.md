# Third-party notices

Copyright (C) 2025-2026 Felix Huisinga and the Wizard Party contributors

Wizard Party is licensed under the GNU Affero General Public License v3.0 or later (see
[LICENSE](LICENSE)). The assets below are not covered by that licence; each keeps the licence of
its authors. npm dependencies are not vendored and are not listed here: their licences ship with
each package in `node_modules`.

"Wizard" is a trademark of AMIGO Spiel + Freizeit GmbH and U.S. Games Systems, Inc. Wizard Party
is an unofficial fan project and is not affiliated with or endorsed by either company. The game
rules and special cards are implemented from the published rules; no artwork or text from the
printed games is included.

## Fonts

| Asset | Location | Author | Licence |
| --- | --- | --- | --- |
| Inter (variable) | `@fontsource-variable/inter`, imported in `src/app/globals.css` | The Inter Project Authors (https://github.com/rsms/inter) | [SIL Open Font License 1.1](https://openfontlicense.org) |
| Geist, Geist Mono | `next/font/google` in `src/app/layout.tsx`, self-hosted at build time | The Geist Project Authors (https://github.com/vercel/geist-font) | SIL Open Font License 1.1 |
| Geist Regular (generated images) | default font of `next/og` (the `ImageResponse` image routes under `src/app` and the invite card in `src/infrastructure/email`) | The Geist Project Authors | SIL Open Font License 1.1 |
| RPG Awesome icon font | `public/fonts/rpgawesome-webfont.*`, CSS in `src/styles/rpg-awesome.css` | Daniela Howe, Ivan Montiel (https://github.com/nagoshiashumari/Rpg-Awesome) | Font: SIL Open Font License 1.1. CSS: MIT. The font files are an IcoMoon re-export of the upstream glyphs. |

## Textures

| Asset | Location | Author | Licence |
| --- | --- | --- | --- |
| Prototype grid texture `light-texture_12.png` | `public/textures/prototype/`, used as the table felt (`src/presentation/config/assets.config.ts`) | Kenney (https://kenney.nl), redistributed in pmndrs/drei-assets | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

All other table, card, environment and particle visuals are drawn procedurally in code.

## 3D models

| Asset | Location | Author | Licence |
| --- | --- | --- | --- |
| KayKit Character Pack: Adventurers 1.0 (Mage, Knight, Barbarian, Rogue, Hooded Rogue and their props), stripped, merged and compressed, and rendered into portrait sprites | `public/characters/`, built by `scripts/characters/build-character-assets.mjs` from the commit pinned in `scripts/characters/kaykit-source.json`; the sprites in `public/characters/portraits/` are rendered from it by `scripts/characters/render-portrait-sprites.mjs` | Kay Lousberg (https://www.kaylousberg.com), https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Fonts fetched at runtime

| Asset | Location | Author | Licence |
| --- | --- | --- | --- |
| Fonts for all 3D text (troika), resolved per script, Latin included | Proxied from `unicode-font-resolver@v1.0.1` through `src/app/vendor/unicode-fonts` (`src/presentation/config/assets.config.ts`); not stored in this repository | Font files: Noto Sans, Noto Serif, Noto Sans Mono and the per-script Noto families (Google). Index data: Jason Johnston (https://github.com/lojjic/unicode-font-resolver) | Noto fonts: SIL Open Font License 1.1. Index data: MIT |

## Project assets

`public/favicon.svg` and `public/favicon.png` were made for Wizard Party and are covered by the
project licence.

The sound effects in `public/sounds/` are synthesized by `scripts/generate-sounds.mjs` and are
covered by the project licence.
