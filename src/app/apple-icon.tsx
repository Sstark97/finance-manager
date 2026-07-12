import { ImageResponse } from "next/og";
import { brandIconRenderer } from "@/app/branding/BrandIconRenderer";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(brandIconRenderer.renderMaskable(size.width), { ...size });
}
