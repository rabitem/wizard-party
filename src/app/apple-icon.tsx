import { ImageResponse } from "next/og";

import { WIZARD_PARTY_MARK_CLASSIC as CLASSIC } from "@/presentation/config/wizard-party-mark.config";

import { BrandMarkSvg } from "./_og/brand-mark-svg";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

/** Home-screen icon: the Wizard Party mark on a dark tile with a candlelit glow behind it. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at 50% 42%, ${CLASSIC.GLOW} 0%, transparent 62%), ${CLASSIC.BACKGROUND}`,
          borderRadius: 40,
        }}
      >
        <BrandMarkSvg size={136} />
      </div>
    ),
    { ...size }
  );
}
