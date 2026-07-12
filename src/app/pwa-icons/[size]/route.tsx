import { ImageResponse } from "next/og";
import { brandIconRenderer } from "@/app/branding/BrandIconRenderer";

const VALID_ICON_SIZES = [192, 512] as const;
type ValidIconSize = (typeof VALID_ICON_SIZES)[number];

function isValidIconSize(size: number): size is ValidIconSize {
  return (VALID_ICON_SIZES as readonly number[]).includes(size);
}

export function generateStaticParams(): Array<{ size: string }> {
  return VALID_ICON_SIZES.map(size => ({ size: String(size) }));
}

export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size } = await params;
  const parsedSize = Number(size);
  if (!isValidIconSize(parsedSize)) {
    return new Response("Invalid icon size", { status: 400 });
  }
  const purpose = new URL(request.url).searchParams.get("purpose");
  const icon = purpose === "any" ? brandIconRenderer.render(parsedSize) : brandIconRenderer.renderMaskable(parsedSize);
  return new ImageResponse(icon, { width: parsedSize, height: parsedSize });
}
