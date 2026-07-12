import type { MetadataRoute } from "next";
import { palette } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas — Gestor financiero personal",
    short_name: "Finanzas",
    description: "Gestiona tu patrimonio, presupuesto y metas financieras en un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: palette.bg,
    theme_color: palette.bg,
    icons: [
      { src: "/pwa-icons/192?purpose=any", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/512?purpose=any", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
