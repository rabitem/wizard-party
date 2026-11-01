import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REALM_OPTIONS } from "@/presentation/components/room-browser/realm-switcher.config";

import { BrandMarkSvg } from "./brand-mark-svg";
import { ogRealm } from "./og-realm";

/**
 * Shared parts of the link previews (Open Graph and Twitter images, the join and results
 * previews): a capture of the realm's real game room as the ground (the one the link names, Classic
 * otherwise), the Wizard Party mark, the realms and Gelasio, an OFL serif drawn to Georgia's metrics
 * (the site's serif). Rendered by next/og on the Node.js runtime; the files live in assets/og and are
 * traced into the build by next.config.ts. The captures come from the start page with the page UI
 * hidden, two per realm.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const ASSET_DIR = join(process.cwd(), "assets/og");

const SERIF_FONT = readFileSync(join(ASSET_DIR, "Gelasio-Regular.ttf"));

/** Pass to ImageResponse: every preview sets its type in Gelasio. */
export const OG_FONTS = [{ name: "Gelasio", data: SERIF_FONT, weight: 400 as const, style: "normal" as const }];

export const OG_COLORS = {
  INK: "#0b0805",
  TEXT: "#fbf3e0",
  BRASS: "#e9c46a",
  MUTED: "#d6bd8c",
  FAINT: "rgba(214, 189, 140, 0.62)",
  HAIRLINE: "rgba(233, 196, 106, 0.35)",
} as const;

/**
 * Which capture: "side" is the room's lit back corner past the table (the walk's last turn),
 * "table" the table from the player's seat.
 */
export type OgRoomCapture = "side" | "table";

const captures = new Map<string, string>();

/** One realm's capture as a data URL, read from disk on first use; only known realm ids reach the file name. */
function roomCapture(realm: string, kind: OgRoomCapture): string {
  const file = `realm-hall-${ogRealm(realm)}-${kind}.jpg`;
  let capture = captures.get(file);
  if (!capture) {
    capture = `data:image/jpeg;base64,${readFileSync(join(ASSET_DIR, file)).toString("base64")}`;
    captures.set(file, capture);
  }
  return capture;
}

/**
 * The capture full-bleed, under a shade that keeps text readable (`shade` is a CSS background).
 * `shiftX` moves the room right, for a layout whose text covers the left of the frame.
 */
export function OgBackdrop({ realm, kind, shade, shiftX = 0 }: { realm: string; kind: OgRoomCapture; shade: string; shiftX?: number }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: OG_SIZE.height, display: "flex" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img only */}
      <img src={roomCapture(realm, kind)} width={OG_SIZE.width} height={OG_SIZE.height} alt="" style={{ position: "absolute", top: 0, left: shiftX, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: OG_SIZE.height, background: shade }} />
    </div>
  );
}

/** Mark and name, side by side: the small lockup for previews whose headline is something else. */
export function OgLockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <BrandMarkSvg size={52} />
      <span style={{ fontSize: 30, color: OG_COLORS.TEXT, letterSpacing: "-0.01em" }}>Wizard Party</span>
    </div>
  );
}

/** One lens per realm, painted with its felt and wood, as on the start page. */
export function RealmLensRow({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", gap: Math.round(size * 0.3) }}>
      {REALM_OPTIONS.map(({ pack, table }) => (
        <div
          key={pack.id}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            background: `radial-gradient(circle at 50% 45%, ${table.felt.center} 0%, ${table.felt.base} 48%, ${table.felt.edge} 62%, ${table.wood.base} 64%, ${table.wood.molding} 100%)`,
            boxShadow: "0 3px 10px rgba(0,0,0,0.55)",
          }}
        />
      ))}
    </div>
  );
}

export const REALM_COUNT = REALM_OPTIONS.length;

/** The page's own address, small, bottom right. */
export function OgHost({ host }: { host: string }) {
  return (
    <div style={{ position: "absolute", right: 56, bottom: 40, display: "flex", fontSize: 22, color: OG_COLORS.FAINT }}>
      {host}
    </div>
  );
}
