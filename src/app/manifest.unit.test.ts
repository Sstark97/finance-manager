import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  it("should declare a Spanish name and short_name coherent with the app", () => {
    const result = manifest();

    expect(result.name).toBe("Finanzas — Gestor financiero personal");
    expect(result.short_name).toBe("Finanzas");
  });

  it("should be configured for standalone installation starting at the app root", () => {
    const result = manifest();

    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
  });

  it("should declare 192 and 512 PNG icons required for installability", () => {
    const result = manifest();
    const icons = result.icons ?? [];

    const maskableIcon192 = icons.find(icon => icon.sizes === "192x192" && icon.purpose === "maskable");
    const maskableIcon512 = icons.find(icon => icon.sizes === "512x512" && icon.purpose === "maskable");

    expect(maskableIcon192).toMatchObject({ src: "/pwa-icons/192", type: "image/png" });
    expect(maskableIcon512).toMatchObject({ src: "/pwa-icons/512", type: "image/png" });
  });

  it("should declare 192 and 512 icons with 'any' purpose so the unpadded glyph stays legible", () => {
    const result = manifest();
    const icons = result.icons ?? [];

    const anyIcon192 = icons.find(icon => icon.sizes === "192x192" && icon.purpose === "any");
    const anyIcon512 = icons.find(icon => icon.sizes === "512x512" && icon.purpose === "any");

    expect(anyIcon192).toMatchObject({ src: "/pwa-icons/192?purpose=any", type: "image/png" });
    expect(anyIcon512).toMatchObject({ src: "/pwa-icons/512?purpose=any", type: "image/png" });
  });
});
