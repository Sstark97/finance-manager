"use client";

import React, { useEffect, useRef, useState } from "react";
import { palette } from "@/lib/theme";
import { SettingsIcon } from "@/app/MobileTabBar";

export interface SettingsMenuProps {
  userEmail: string;
  onExportJson: () => void;
  onExportCsv: () => void;
  onSignOut: () => void;
}

export function SettingsMenu({ userEmail, onExportJson, onExportCsv, onSignOut }: SettingsMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const toggleMenu = (): void => setIsOpen((previous) => !previous);
  const selectExportJson = (): void => { onExportJson(); setIsOpen(false); };
  const selectExportCsv = (): void => { onExportCsv(); setIsOpen(false); };
  const selectSignOut = (): void => { onSignOut(); setIsOpen(false); };

  const menuItemStyle: React.CSSProperties = {
    justifyContent:"flex-start", border:"none", width:"100%", textAlign:"left", background:"none",
  };

  return (
    <div ref={containerRef} style={{ position:"relative", display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:12.5, color:palette.sub }}>{userEmail}</span>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Ajustes"
        className="seg"
        onClick={toggleMenu}
        style={{ border:`1px solid ${palette.line}`, display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}
      >
        {SettingsIcon(palette.sub)}
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label="Ajustes"
          style={{
            position:"absolute", top:"calc(100% + 6px)", right:0, minWidth:180, zIndex:10,
            background:palette.panel2, border:`1px solid ${palette.line}`, borderRadius:10,
            boxShadow:"0 8px 24px rgba(0,0,0,.35)", padding:6, display:"flex", flexDirection:"column", gap:2,
          }}
        >
          <button role="menuitem" type="button" className="seg" onClick={selectExportJson} style={menuItemStyle}>Exportar JSON</button>
          <button role="menuitem" type="button" className="seg" onClick={selectExportCsv} style={menuItemStyle}>Exportar CSV</button>
          <button role="menuitem" type="button" className="seg" onClick={selectSignOut} style={{ ...menuItemStyle, color:palette.bad }}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
