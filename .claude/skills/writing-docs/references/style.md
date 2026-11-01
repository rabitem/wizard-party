# Style

Write for an engineer who is about to change the code and has ten minutes. They want to know
what exists, where it is, what must stay true and what to touch.

## Sentences

- Plain, active voice, present tense, short sentences. "The server refuses over-budget commands
  with `RATE_LIMITED`", not "Over-budget commands will be refused".
- Say what the code does, not what it aims to do. No "should", "tries to", "is designed to"
  unless the doc is describing a rule for contributors.
- British spelling, as in the existing docs (behaviour, colour, licence). Identifiers keep their
  own spelling.
- Wrap prose at about 100 characters, like the pages under `docs/`. Never wrap table rows.
- No marketing or filler: seamless, robust, powerful, blazing, comprehensive, cutting-edge,
  leverage, utilize, simply, just, easy, "Note that", "It's worth noting". No emojis, no
  exclamation marks.
- No history: "after the overhaul", "no longer", "is gone", "new", "now". Describe the present.
  What a change replaced belongs in the PR that made it.
- No hedges about the future. A known gap is one line under a "Not covered" or "Left to"
  heading, naming the owner if there is one.

## Structure

- Title is the area's name. The first paragraph says what the page covers, when to read it, and
  links the neighbouring pages. See the opening of `docs/client/connection.md`.
- Headings are nouns or short statements ("Pause is not a phase"), never questions.
- Lead with the shape: a code-block tree of modules or a table of module and path, then the
  details. `docs/server/room.md` "One room core, three hosts" is the model.
- Bullets with a bold lead-in (`- **Faces.** ...`) for a list of parallel facts. Bold nowhere
  else.
- End with "Adding things": one bullet per kind of change, naming the files in the order you
  touch them. The compiler-checked tables to update are the useful part.

## Reference data

Tables, not prose, for anything a reader looks up: env vars, commands, close codes, limits,
layout classes, protocol versions, file owners.

| Column | Rule |
| --- | --- |
| Name | Exact identifier in backticks: `TOURNAMENT_SECRET`, `npm run check:worker` |
| Where | Path to the file that defines or reads it |
| Default / unset | What happens when it is missing, from the code, not from memory |
| Purpose | One clause |

## Paths, code and links

- Paths are repo-relative and exact: `party/room/game-room.ts`, not "the room file".
- Link pages and files a reader will open, relative to the doc
  (`[protocol.md](protocol.md)`, `[game-room.ts](../../party/room/game-room.ts)`).
  Trees and dense tables may use backtick paths instead.
- Name exports exactly (`legalPlays(hand, lead)`, `PersistedState`). Show a signature only when
  the doc is about it.
- Commands go in fenced `bash` blocks, one per line, and must be `package.json` scripts or files
  under `scripts/`. Mark which ones need a running worker or a database.
- Code samples are short and real: copy from the source and trim, never invent an API.
- Diagrams are plain-text trees in code blocks, which diff and grep well.

## Before and after

| Before | After |
| --- | --- |
| "Start the whole stack" | "`npm run dev:all` starts Next.js on port 3000 and the worker (`wrangler dev`) on port 1999." |
| "Complete Wizard rules" | "The 60-card deck, trump selection and the forbidden last bid (`computeForbiddenBid` in `shared/domain/expansions/round-rules.ts`)." |
| "Game state is stored temporarily in edge storage" | "Each room persists in its Durable Object's storage (`party/utils/state.ts`)." |
| "Each player may share up to four sounds" | "Limits are in `CUSTOM_SOUND_LIMITS` (`shared/domain/constants/custom-sound-limits.ts`)." |
