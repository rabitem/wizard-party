import { HOME_PREVIEW_ALT, renderHomePreview } from "./_og/home-preview";
import { OG_SIZE } from "./_og/og-kit";

export const alt = HOME_PREVIEW_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderHomePreview();
}
