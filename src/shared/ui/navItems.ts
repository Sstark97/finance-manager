import type React from "react";
import { DashboardIcon, WealthIcon, BudgetIcon, DebtsIcon, GoalsIcon } from "@/shared/ui/MobileTabBar";

export interface NavItem {
  href: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: DashboardIcon },
  { href: "/wealth", label: "Patrimonio", icon: WealthIcon },
  { href: "/budget", label: "Presupuesto", icon: BudgetIcon },
  { href: "/debts", label: "Deudas", icon: DebtsIcon },
  { href: "/goals", label: "Metas", icon: GoalsIcon },
];
