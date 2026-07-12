import type React from "react";
import { palette } from "@/lib/theme";

const MASKABLE_SAFE_ZONE_RATIO = 0.11;
const CORNER_RADIUS_RATIO = 0.22;
const GLYPH_SIZE_RATIO = 0.56;

export class BrandIconRenderer {
  render(dimension: number): React.ReactElement {
    return this.renderIcon(dimension, 0);
  }

  renderMaskable(dimension: number): React.ReactElement {
    const safeZonePadding = Math.round(dimension * MASKABLE_SAFE_ZONE_RATIO);
    return this.renderIcon(dimension, safeZonePadding);
  }

  private renderIcon(dimension: number, safeZonePadding: number): React.ReactElement {
    const glyphSize = Math.round((dimension - safeZonePadding * 2) * GLYPH_SIZE_RATIO);
    return (
      <div
        style={{
          width: dimension,
          height: dimension,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: palette.bg,
          borderRadius: dimension * CORNER_RADIUS_RATIO,
        }}
      >
        <span style={{ fontSize: glyphSize, fontWeight: 700, color: palette.acc, lineHeight: 1 }}>€</span>
      </div>
    );
  }
}

export const brandIconRenderer = new BrandIconRenderer();
