import { ImageResponse } from "next/og";

import { WIZARD_PARTY_MARK_CLASSIC as CLASSIC } from "@/presentation/config/wizard-party-mark.config";

import { BrandMarkSvg } from "./_og/brand-mark-svg";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

/** Favicon: the Wizard Party mark on a dark tile. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CLASSIC.BACKGROUND,
          borderRadius: 7,
        }}
      >
        <BrandMarkSvg size={30} />
      </div>
    ),
    { ...size }
  );
}
