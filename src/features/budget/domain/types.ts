export type CategoryId = "gastosFijos" | "inversion" | "fondoEmergencia" | "ocio" | "caprichos";
export type CategoryType = "gasto" | "ahorro";

export interface Category {
  id: CategoryId;
  name: string;
  type: CategoryType;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export type EventCategory = CategoryId | "ingreso";

export interface BudgetEvent {
  id: string;
  name: string;
  amount: number;
  category: EventCategory;
}

export interface Month {
  id: string;
  date: Date;
  label: string;
  overrides: Partial<Record<CategoryId, number>>;
  events: BudgetEvent[];
  actual: Partial<Record<CategoryId, number | null>>;
  netIncomeOverride: number | null;
}

export interface Budget {
  ingresoNeto: number;
  gastosFijos: number;
  inversion: number;
  fondoEmergencia: number;
  ocio: number;
  caprichos: number;
}

export interface BudgetDraft extends Budget {
  fixedExpenseItems: FixedExpenseItem[];
}
