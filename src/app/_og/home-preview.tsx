import { ImageResponse } from "next/og";

import { SITE_HOST } from "@/config/deployment.config";

import { BrandMarkSvg } from "./brand-mark-svg";
import { OG_COLORS, OG_FONTS, OG_SIZE, OgBackdrop, OgHost, REALM_COUNT, RealmLensRow } from "./og-kit";

export const HOME_PREVIEW_ALT = "Wizard Party: bid your tricks, then hit them exactly. A free online Wizard card game at a 3D table.";

/**
 * The site's link preview: the real Classic game room with the table lit on the right; on the
 * left the mark, the name in Gelasio, the promise, and a lens for every realm.
 */
export function renderHomePreview(): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: OG_COLORS.INK, fontFamily: "Gelasio" }}>
        <OgBackdrop
          kind="side"
          shade="linear-gradient(to right, rgb(11,8,5) 0%, rgba(11,8,5,0.94) 40%, rgba(11,8,5,0.3) 58%, rgba(11,8,5,0) 76%)"
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 72, width: 680, height: "100%" }}>
          <BrandMarkSvg size={88} />
          <div style={{ marginTop: 22, fontSize: 96, lineHeight: 1, color: OG_COLORS.TEXT, letterSpacing: "-0.02em" }}>Wizard Party</div>
          <div style={{ marginTop: 22, width: 120, height: 2, background: OG_COLORS.BRASS }} />
          <div style={{ marginTop: 22, fontSize: 34, lineHeight: 1.3, color: OG_COLORS.BRASS }}>Bid your tricks, then hit them exactly.</div>
          <div style={{ marginTop: 8, fontSize: 26, lineHeight: 1.3, color: OG_COLORS.MUTED }}>Free in your browser, with friends or bots.</div>
          <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 18 }}>
            <RealmLensRow size={30} />
            <span style={{ fontSize: 22, color: OG_COLORS.FAINT }}>{REALM_COUNT} realms</span>
          </div>
        </div>
        <OgHost host={SITE_HOST} />
      </div>
    ),
    { ...OG_SIZE, fonts: OG_FONTS }
  );
}
