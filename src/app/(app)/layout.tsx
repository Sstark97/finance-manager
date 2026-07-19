import type React from "react";
import { currentUserProvider } from "@/infrastructure/auth/CurrentUserProvider";
import { palette } from "@/lib/theme";
import { AppStyles } from "@/shared/ui/AppStyles";
import { MobileTabBar } from "@/shared/ui/MobileTabBar";
import { SettingsMenu } from "@/shared/ui/SettingsMenu";
import { DesktopTabNav } from "@/shared/ui/DesktopTabNav";
import { NAV_ITEMS } from "@/shared/ui/navItems";

export default async function AppLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const currentUser = await currentUserProvider.requireUser();

  return (
    <div className="shell-with-mobile-tabbar" style={{ background:palette.bg, minHeight:"100vh", color:palette.ink, fontFamily:"'DM Sans',system-ui,sans-serif", padding:"clamp(16px,4vw,40px)" }}>
      <AppStyles />

      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:16, marginBottom:20 }}>
        <div className="eyebrow" style={{ marginBottom:8 }}>Finanzas · {new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})}</div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <DesktopTabNav items={NAV_ITEMS} />
          <SettingsMenu userEmail={currentUser.email} />
        </div>
      </header>

      <main aria-labelledby="finance-app-heading">
        {children}
      </main>

      <footer style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${palette.line}`, fontSize:11.5, color:palette.faint, lineHeight:1.6 }}>
        Cartera editable · el precio lo trae Yahoo por ticker vía el backend (POST /api/prices). Composición de índices orientativa.
        No es asesoramiento financiero regulado. Los cambios se guardan automáticamente.
      </footer>

      <MobileTabBar items={NAV_ITEMS} />
    </div>
  );
}
