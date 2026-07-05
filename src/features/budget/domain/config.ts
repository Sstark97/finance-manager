import type { Category, EventCategory, CategoryId } from "@/features/budget/domain/types";

export const CATEGORIES: Category[] = [
  { id: "gastosFijos",     name: "Gastos fijos",              type: "gasto"  },
  { id: "inversion",       name: "Inversión",                 type: "ahorro" },
  { id: "fondoEmergencia", name: "Fondo emergencia / casa",   type: "ahorro" },
  { id: "ocio",            name: "Ocio",                      type: "gasto"  },
  { id: "caprichos",       name: "Caprichos / tech",          type: "gasto"  },
];

export const CATEGORY_LABEL: Partial<Record<EventCategory, string>> = Object.fromEntries(
  CATEGORIES.map((category): [CategoryId, string] => [category.id, category.name]),
);
