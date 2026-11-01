import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { SITE_HOST } from "@/config/deployment.config";

import { OG_COLORS, OG_FONTS, OG_SIZE, OgBackdrop, OgHost, OgLockup } from "../../_og/og-kit";
import { ogRealm } from "../../_og/og-realm";

/** Characters shown for a missing code, and the most a code can show. */
const PLACEHOLDER = "????";
const MAX_CODE_LENGTH = 8;
/** Keeps the lines readable over the brighter realms' tables */
const TEXT_SHADOW = "0 2px 12px rgba(0,0,0,0.9)";

/** One character of the room code on a playing card, as dealt onto the felt. */
function CodeCard({ char, index, count }: { char: string; index: number; count: number }) {
  const tilt = (index - (count - 1) / 2) * 2.2;
  return (
    <div
      style={{
        width: 104,
        height: 146,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        background: "linear-gradient(160deg, #fbf3e0 0%, #efdfba 100%)",
        border: "3px solid #e9c46a",
        boxShadow: "0 14px 30px rgba(0,0,0,0.6)",
        transform: `rotate(${tilt}deg)`,
        fontSize: 78,
        color: "#2a1606",
      }}
    >
      {char}
    </div>
  );
}

/** The invite link's preview: "You're invited", the room code dealt as cards over the inviter's realm's table. */
export async function GET(request: NextRequest) {
  const roomCode = (request.nextUrl.searchParams.get("room") || PLACEHOLDER).slice(0, MAX_CODE_LENGTH).toUpperCase();
  // Codes may repeat a character, so each card is keyed by its slot.
  const realm = ogRealm(request.nextUrl.searchParams.get("realm"));
  const cards = [...roomCode].map((char, slot) => ({ char, slot, id: `slot-${slot}` }));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: OG_COLORS.INK, fontFamily: "Gelasio" }}>
        <OgBackdrop realm={realm} kind="table" shade="linear-gradient(to bottom, rgba(11,8,5,0.68) 0%, rgba(11,8,5,0.4) 45%, rgba(11,8,5,0.68) 100%)" />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", paddingTop: 52 }}>
          <OgLockup />
          <div style={{ marginTop: 34, fontSize: 64, lineHeight: 1, color: OG_COLORS.TEXT, letterSpacing: "-0.015em", textShadow: TEXT_SHADOW }}>You&apos;re invited to a table</div>
          <div style={{ marginTop: 44, display: "flex", gap: 14 }}>
            {cards.map((card) => <CodeCard key={card.id} char={card.char} index={card.slot} count={cards.length} />)}
          </div>
          <div style={{ marginTop: 34, fontSize: 28, color: OG_COLORS.BRASS, textShadow: TEXT_SHADOW }}>Tap to take your seat. Free, no download.</div>
        </div>
        <OgHost host={SITE_HOST} />
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS }
  );
}
