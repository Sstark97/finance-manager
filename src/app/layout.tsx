import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { palette } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finanzas — Gestor financiero personal",
  description: "Gestiona tu patrimonio, presupuesto y metas financieras en un solo lugar.",
  applicationName: "Finanzas",
  appleWebApp: {
    capable: true,
    title: "Finanzas",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: palette.bg,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
