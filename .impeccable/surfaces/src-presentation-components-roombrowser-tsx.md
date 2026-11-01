---
version: 1
slug: "src-presentation-components-roombrowser-tsx"
primary_target: "src/presentation/components/RoomBrowser.tsx"
related_targets: ["src/app/page.tsx"]
---

# Start page (/)

Mode: Persuade. Audience: friends arriving by invite link, returning regulars, new visitors. Job: get to a table in seconds; newcomers see what Wizard is and that it is played at a real 3D table. Constraints: every current section stays (play, realm choice, live count, tournaments, learn to play, recent rooms, Hall of Champions, chronicles/stats, how to win, special editions with sources, footer); all eleven realms re-dress it; WebGL with a painted fallback; reduced motion respected. Added by the user: a public player search in the top-right dock, a playful loader with rotating lines for loading and realm switches, the subheader "Predict. Play. Prevail.".

## Direction contract

THESIS: The start page is a walk through the active realm's own game room to your seat. Scrolling moves a live 3D camera through the room the game itself draws (casino, haunted manor, pool, dojo…) and ends at the player's seat; it refuses the centred hero over a stack of equal cards.

OWN-WORLD: The realm's real in-game room and table (ThemedEnvironment, SceneLighting, TableSurface) with a warm fill light. Reading parts sit on one opaque realm panel per stop (page-base, brass hairline, rounded 24px). Georgia serif throughout, sentence-case headings at heading scale, no eyebrow labels, no card grids: sequences in running type and label-and-value ledgers. The primary action is the muted aged-brass button shared with the lobby's Start game (cream text, thin brass edge). The mark: the wizard's hat on a tilted playing card in brass line.

STORY: At the edge of the room you read "Wizard Party / Predict. Play. Prevail.", give a name and press Quick play, or scroll. Each stop turns the camera to a different part of the room (the back wall, the side walls, along the felt) beside one panel: notices, champions, chronicles, the rulebook. The walk ends in your seat at the lit table with Quick play on the felt.

FIRST VIEWPORT: Full-bleed room from its edge, looking down so the back wall's props stay above the frame; the mark, wordmark and subheader at the top; the table lit in the middle; the play form below it with a "Scroll to walk to the table" cue; realm lenses down the left edge; top right the dock with the player search, friends, preferences and account.

FORM: Walk to the Table, candidate 6 of 7, seed f02f8caf; revised by the user to the real in-game rooms.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
