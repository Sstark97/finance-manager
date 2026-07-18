"use client";

import type React from "react";
import { palette } from "@/lib/theme";

export type MobileTabBarItem<TabId extends string> = {
  id: TabId;
  label: string;
  icon: (color: string) => React.ReactNode;
};

export interface MobileTabBarProps<TabId extends string> {
  items: Array<MobileTabBarItem<TabId>>;
  activeTabId: TabId;
  onSelect: (tabId: TabId) => void;
}

export function MobileTabBar<TabId extends string>({ items, activeTabId, onSelect }: MobileTabBarProps<TabId>): React.JSX.Element {
  return (
    <nav className="mobile-tabbar" role="tablist" aria-label="Navegación principal">
      {items.map(item => {
        const isActive = item.id === activeTabId;
        const color = isActive ? palette.acc : palette.faint;
        return (
          <button
            key={item.id}
            id={`mobile-tab-${item.id}`}
            role="tab"
            aria-controls="finance-tabpanel"
            className={`mobile-tabbar-btn ${isActive ? "on" : ""}`}
            onClick={() => onSelect(item.id)}
            aria-selected={isActive}
          >
            {item.icon(color)}
            <span style={{ color }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function iconStrokeProps(color: string): React.SVGProps<SVGSVGElement> {
  return { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
}

export function DashboardIcon(color: string): React.ReactNode {
  return (
    <svg {...iconStrokeProps(color)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function WealthIcon(color: string): React.ReactNode {
  return (
    <svg {...iconStrokeProps(color)}>
      <path d="M3 17l5-5 4 4 9-9" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

export function BudgetIcon(color: string): React.ReactNode {
  return (
    <svg {...iconStrokeProps(color)}>
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  );
}

export function GoalsIcon(color: string): React.ReactNode {
  return (
    <svg {...iconStrokeProps(color)}>
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="12" cy="12" r="0.75" fill={color} stroke="none" />
    </svg>
  );
}

export function DebtsIcon(color: string): React.ReactNode {
  return (
    <svg {...iconStrokeProps(color)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10.5h18" />
      <path d="M7 15h4" />
    </svg>
  );
}
