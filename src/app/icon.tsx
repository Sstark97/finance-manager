import { ImageResponse } from "next/og";
import { brandIconRenderer } from "@/app/branding/BrandIconRenderer";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon(): ImageResponse {
  return new ImageResponse(brandIconRenderer.render(size.width), { ...size });
}
