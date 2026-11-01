# Platform: storage, settings, custom sound audio, Web Audio, multi-touch drag

Browser differences the app must survive without crashing or failing silently. Read this before
you touch browser storage, audio playback or pointer handling on the hand cards. The seat tokens
kept in this storage are described in [connection.md](connection.md); the cards the pointer code
drags are in [cards-camera.md](cards-camera.md).

## Web Storage

`src/lib/storage/safe-storage.ts` exports `safeLocalStorage` and `safeSessionStorage`
(re-exported by `src/lib/storage/index.ts`), the only way `src/` touches Web Storage. ESLint
(`no-restricted-globals` and `no-restricted-properties` in `eslint.config.mjs`) rejects direct
`localStorage` and `sessionStorage` access in `src/` outside `src/lib/storage/` and tests.

- **Never throws.** The `window.localStorage` getter throws `SecurityError` with site data blocked
  (Safari "Block all cookies", Firefox and Chrome site data blocked, sandboxed frames), and
  `setItem` throws `QuotaExceededError` when the origin budget is full.
- **Memory overlay.** A value that could not be persisted stays in a per-page memory overlay, so
  reads stay consistent with writes for the visit. The player id generated while storage is
  blocked (`getOrCreatePlayerId` in `hooks/connection/utils.ts`) does not change between renders.
- **Write results.** Writes return `{ ok: true } | { ok: false, reason: 'quota' | 'unavailable' }`
  and notify `onWriteFailure` listeners. `hasUnsavedValues(reason)` and `onUnsavedChange` track
  values kept only in memory until a later write of the same key persists.
  `useStorageQuotaExceeded` (`src/presentation/hooks/`) reads them through `useSyncExternalStore`,
  so the Custom Sound Manager's "storage is full" notice covers failures from before it mounted
  and disappears once a save fits again.
- **Helpers.** `readJson` and `writeJson` wrap parsing; `isPersistent()` tells whether writes
  survive a reload.

Module-scope and render-time reads go through it, so blocked storage does not send a route to the
global error page. `useTutorialSeen` (`components/TutorialModal.tsx`) reads through
`useSyncExternalStore` with a server snapshot, so the server and hydration renders agree.

## Custom sound audio

Uploaded audio lives in IndexedDB. The settings JSON in `localStorage` holds metadata and
references only, so one upload cannot exhaust the Web Storage budget.

| Part | Path | Role |
| --- | --- | --- |
| `AsyncRecordStore`, `IndexedDbRecordStore`, `MemoryRecordStore` | `src/lib/storage/indexed-db-record-store.ts` | Dependency-free promise wrapper around one IndexedDB object store; the memory store is for tests |
| `CustomSoundAudioLibrary` | `src/lib/sound/custom-sound-audio-library.ts` | Device audio by sound id, mirrored in a synchronous cache so settings reads and playback never wait on IndexedDB. Reports `unavailable` where IndexedDB is blocked; callers then keep audio inline in settings |
| Custom sound audio coordinator | `src/presentation/components/settings/custom-sound-audio-coordinator.ts` | Keeps audio out of the settings blob |
| Library caps | `src/lib/sound/custom-sound-library.config.ts` | Database and store names, per-sound and total byte caps |
| `RecentTableSounds` | `src/lib/sound/recent-table-sounds.ts` | Sounds other players shared at recent tables, in their own database (`RECENT_TABLE_SOUNDS_CONFIG`), so Preferences can import them outside a room |

The coordinator's invariants:

- The settings blob stores metadata and references. New uploads go to the library before the
  save; audio stays inline only until the library holds it, or for good where IndexedDB is unusable.
- Inline audio found in stored settings moves to the library once after hydration, and the
  settings are rewritten without it.
- A sound whose audio is still loading, or was written by another tab, is carried over by every
  save, so a save never drops a sound the player cannot see.
- Audio that no settings document references is pruned.
- `customTrickWinAudio` is derived and never stored.

The caps are `CUSTOM_SOUND_LIBRARY_CONFIG.MAX_SOUND_BYTES` (the shared upload limit
`CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES`) per sound and `MAX_TOTAL_BYTES` for all custom sounds on the
device (`exceedsCustomSoundLibraryCap`).

At a table, `useRememberTableSounds` stores the shared sounds of the other players. The list keeps
the newest `MAX_SOUNDS` for `MAX_AGE_MS` and is pruned on every write; where IndexedDB is blocked
it stays empty. Importing one copies it into the custom sounds like any upload.

## Settings surfaces

All settings are the one `game-settings` document (`settings-persistence.ts`), edited through
`useGameSettingsState`. Two surfaces show different parts of it, both in `SettingsDrawer` (a panel from
the right on desktop, a bottom sheet that drags down on phones):

- **In-game panel** (`SettingsPanel.tsx`): quick controls only. Sound on and off, volume, chaos
  mode and a sound pack (`SOUND_PACKS` in `settings/sound-packs.ts`, which sets the Wizard, Jester
  and trick-win sound together), card and table looks, the leaderboard, shortcuts and leaving.
- **Preferences** (`PreferencesPanel.tsx`): single sound picks, sounds from recent tables, uploads,
  notifications, seasonal pack and app theme. The account page shows it as the Preferences tab;
  guests open it in the drawer from the home screen (`PreferencesButton`, also opened by
  `?preferences=open`; Escape closes it).
  The in-game panel links to it in a new tab (`CONSTANTS.ROUTES`) so the game keeps its connection.

## Web Audio

`src/lib/sound/`:

| Module | Responsibility |
| --- | --- |
| `audio-context.service.ts` | Context lifecycle. `tryGetContext()` returns null where Web Audio is missing (warned once). `tryGetPlayableContext()` and `canPlayNow()` drop sounds while audio is locked (before the first gesture, during an iOS interruption), so they cannot burst out together on unlock. Handles WebKit's `interrupted` state and reports `statechange`. |
| `audio-unlock.ts` | Resumes on activation-triggering gestures only (`AUDIO_ENGINE_CONFIG.UNLOCK_EVENTS`; `pointerdown` and `touchstart` do not count on touch devices). Stays armed until the context runs, re-arms on `suspended` and `interrupted`, and resumes on `visibilitychange`. |
| `audio-file-player.ts` | Sound files and custom uploads decoded once (`decodeAudioData`) into an LRU `AudioBuffer` cache (`MAX_DECODED_BYTES`) and played through a `GainNode`: volume works on iOS, and chaos-mode gain above 1 needs no `MediaElementSource`. Falls back to `HTMLAudioElement` where decoding fails. A first play whose decode takes longer than `MAX_FIRST_PLAY_DELAY_MS` is dropped. |
| `noise-buffer-cache.ts` | Noise buffers per type and duration, generated once, with `NOISE_VARIANTS` rotated. |
| `sound-synthesizer.service.ts` | Tones, note sequences, noise and the chaos-mode `playEarrape` on the playable context; a silent no-op without Web Audio. |
| `audio-log.ts` | `warnAudioOnce`: expected audio conditions are `console.warn`ed once per key, never `console.error`ed, so WebKit e2e runs stay clean. |

Tunables are in `audio-engine.config.ts` (`AUDIO_ENGINE_CONFIG`). `soundManager` (the
`SoundManager` class in `src/lib/sounds.ts`) is the facade the app calls.

The effect sounds are original, generated files: every `.mp3` in `public/sounds/` is synthesised
by `scripts/generate-sounds.mjs` (`npm run sounds:generate`, which needs FFmpeg 7 or newer).
See [public/sounds/README.md](../../public/sounds/README.md). A sound is wired in through
`src/lib/sound-configs.ts`.

## Hand-card drag: one pointer per gesture

`src/presentation/hooks/useCardDragGesture.ts` with
`src/presentation/hooks/card-gesture-pointer.ts`:

- `Card3D` passes the native `PointerEvent`. The gesture records its `pointerId` and ignores
  moves, ups and cancels of other pointers (a resting palm, a second finger, a pinch).
- The pointer is captured on the canvas. `lostpointercapture` (other than the implicit release
  after `pointerup`, which happens after the gesture detached) cancels the drag, like
  `pointercancel`. A cancel never plays the card.
- `cardGestureLock` (a `CardGestureLock`) allows one card gesture at a time across the hand. A
  press by another pointer is refused. A press by the holder's own pointer means its release was
  lost, so the stale gesture is abandoned (cancelled) and the new press starts.
- Callers that pass no pointer id (mouse-only code) match every pointer.

## Adding things

- **Persisted browser state**: read and write it through `safeLocalStorage` or
  `safeSessionStorage`, put the key in `CONSTANTS.STORAGE_KEYS`
  (`src/presentation/config/constants.ts`) and render correctly when the read returns null.
- **Large per-device data** (audio, images): use an `AsyncRecordStore`, not Web Storage.
- **A sound**: add a design for `scripts/generate-sounds.mjs`, generate it and reference it in
  `src/lib/sound-configs.ts`; tunables of playback go to `audio-engine.config.ts`.
- **A new pointer-driven gesture on the canvas**: claim `cardGestureLock` and filter events with
  `isGesturePointer`.

## Tests

| Suite | Contract |
| --- | --- |
| `src/lib/storage/safe-storage.test.ts` | blocked and full storage, the memory overlay, write results |
| `src/lib/sound/custom-sound-audio-library.test.ts`, `src/presentation/components/settings/custom-sound-audio-coordinator.test.ts` | the audio library and the settings invariants |
| `src/lib/sound/recent-table-sounds.test.ts` | order, cap, age limit and blocked storage of sounds from recent tables |
| `src/presentation/components/settings/sound-packs.test.ts` | each sound pack is distinct and matched exactly |
| `src/lib/sound/audio-unlock.test.ts`, `audio-file-player.test.ts`, `noise-buffer-cache.test.ts`, `audio-context.service.test.ts` | unlock, decode cache and playback, noise buffers, context state |
| `src/presentation/hooks/card-gesture-pointer.test.ts` | one pointer per gesture, the lock, pointer capture |
| `src/presentation/hooks/useCardDragGesture.test.ts` | the drag threshold and the release outcome |
