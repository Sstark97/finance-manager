"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/shared/ui/navItems";

export interface DesktopTabNavProps {
  items: NavItem[];
}

export function DesktopTabNav({ items }: DesktopTabNavProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="tabnav desktop-tabnav" aria-label="Secciones">
      {items.map(item => {
        const isActive = item.href === pathname;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`tabbtn ${isActive ? "on" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
