import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { SITE_HOST } from "@/config/deployment.config";

import { renderHomePreview } from "../../_og/home-preview";
import { OG_COLORS, OG_FONTS, OG_SIZE, OgBackdrop, OgHost, OgLockup } from "../../_og/og-kit";
import { ogRealm } from "../../_og/og-realm";

interface SharedPlayer {
  name: string;
  score: number;
  perfect: number;
}

interface ShareData {
  players: SharedPlayer[];
  rounds: number;
  code?: string;
}

const STANDINGS_SHOWN = 4;
const NAME_MAX = 18;
const CODE_MAX = 8;
const PLACE_COLORS = ["#e9c46a", "#cfd6dd", "#d39a62", "#a8977a"];

function isPlayer(value: unknown): value is SharedPlayer {
  const player = value as Partial<SharedPlayer> | null;
  return !!player && typeof player.name === "string" && Number.isFinite(player.score) && Number.isFinite(player.perfect);
}

/** The `d` parameter the game-end share link carries (base64 JSON); anything malformed is ignored. */
function decodeShareData(encoded: string | null): ShareData | null {
  if (!encoded) return null;
  try {
    const raw = JSON.parse(atob(encoded)) as Partial<ShareData>;
    const players = Array.isArray(raw.players) ? raw.players.filter(isPlayer) : [];
    if (players.length === 0 || !Number.isFinite(raw.rounds)) return null;
    return {
      players: players.map((player) => ({ ...player, name: player.name.slice(0, NAME_MAX) })),
      rounds: raw.rounds as number,
      code: typeof raw.code === "string" ? raw.code.slice(0, CODE_MAX) : undefined,
    };
  } catch {
    return null;
  }
}

function StandingRow({ place, name, score, perfect }: { place: number; name: string; score: number; perfect: number }) {
  const winner = place === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "12px 24px",
        borderRadius: 14,
        background: winner ? "rgba(233,196,106,0.16)" : "rgba(11,8,5,0.62)",
        border: `1.5px solid ${winner ? "rgba(233,196,106,0.6)" : "rgba(233,196,106,0.18)"}`,
      }}
    >
      <div style={{ display: "flex", width: 36, fontSize: 30, color: PLACE_COLORS[place] }}>{place + 1}</div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <span style={{ fontSize: 30, color: OG_COLORS.TEXT }}>{name}</span>
        <span style={{ fontSize: 18, color: OG_COLORS.FAINT }}>{`${perfect} perfect ${perfect === 1 ? "bid" : "bids"}`}</span>
      </div>
      <span style={{ fontSize: 36, color: winner ? OG_COLORS.BRASS : OG_COLORS.MUTED }}>{score}</span>
      <span style={{ fontSize: 18, color: OG_COLORS.FAINT, marginLeft: -12 }}>pts</span>
    </div>
  );
}

/**
 * A finished game's preview: who won, the standings over the real table, and the room code. A
 * link without readable results gets the site's own preview rather than invented players.
 */
export async function GET(request: NextRequest) {
  const realm = ogRealm(request.nextUrl.searchParams.get("realm"));
  const data = decodeShareData(request.nextUrl.searchParams.get("d"));
  if (!data) return renderHomePreview(realm);
  const standings = [...data.players]
    .sort((a, b) => b.score - a.score)
    .slice(0, STANDINGS_SHOWN)
    .map((player, place) => ({ ...player, place, id: `place-${place}` }));
  const winner = standings[0];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: OG_COLORS.INK, fontFamily: "Gelasio" }}>
        <OgBackdrop realm={realm} kind="table" shade="linear-gradient(to right, rgb(11,8,5) 0%, rgba(11,8,5,0.9) 42%, rgba(11,8,5,0.55) 100%)" />
        <div style={{ position: "relative", display: "flex", width: "100%", padding: "56px 64px", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 440 }}>
            <OgLockup />
            <div style={{ marginTop: 64, fontSize: 26, color: OG_COLORS.BRASS }}>{`${data.rounds} rounds played`}</div>
            <div style={{ marginTop: 10, fontSize: 76, lineHeight: 1.02, color: OG_COLORS.TEXT, letterSpacing: "-0.015em" }}>{winner.name}</div>
            <div style={{ marginTop: 6, fontSize: 52, lineHeight: 1.1, color: OG_COLORS.BRASS }}>takes the game</div>
            {data.code ? (
              <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: OG_COLORS.FAINT }}>
                Room
                <span style={{ fontSize: 26, letterSpacing: "0.2em", color: OG_COLORS.MUTED }}>{data.code.toUpperCase()}</span>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, flexGrow: 1 }}>
            {standings.map((player) => (
              <StandingRow key={player.id} place={player.place} name={player.name} score={player.score} perfect={player.perfect} />
            ))}
          </div>
        </div>
        <OgHost host={SITE_HOST} />
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS }
  );
}
