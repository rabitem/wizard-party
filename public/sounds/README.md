# Sound effects

Every `.mp3` in this folder is synthesized by [`scripts/generate-sounds.mjs`](../../scripts/generate-sounds.mjs)
from the designs in `scripts/lib/sound-designs-*.mjs`. No recordings or third-party samples are
used, so the files are covered by the project licence (AGPL-3.0-or-later) like the rest of the code.

Regenerate them with `npm run sounds:generate` (all sounds) or
`npm run sounds:generate -- bonk coin` (only those). FFmpeg 7.0 or newer with libmp3lame must be on
`PATH`. The output is deterministic for a given FFmpeg version.

To add a sound, add a design, generate it, and reference `/sounds/<name>.mp3` from
`src/lib/sound-configs.ts`.
